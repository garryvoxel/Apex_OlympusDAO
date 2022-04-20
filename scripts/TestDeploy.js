const { ethers } = require("hardhat");
const fs = require('fs');
const keyConfig = require('../config/config.json');

async function main() {
    const daySec = 86400;
    const epochLength = "200" // need to update
    const firstEpochNumber = "1";

    const blockNumber = (await ethers.provider.getBlock()).number;

    const daiMint = ethers.utils.parseUnits("100000".toString(), 'ether');
    const apexMint = ethers.utils.parseUnits("10000", 'gwei');

    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account: " + deployer.address);

    const DAI = await ethers.getContractFactory("DAI")
    const dai = await DAI.deploy(1337)
    await dai.deployed()

    await dai.connect(deployer).mint(deployer.address, daiMint);

    const Authority = await ethers.getContractFactory("OlympusAuthority")
    const authority = await Authority.deploy(deployer.address, deployer.address, deployer.address, deployer.address)
    await authority.deployed()

    const Apex = await ethers.getContractFactory("ApexERC20");
    const apex = await Apex.deploy(authority.address, keyConfig.apex_wallet);
    await apex.deployed()

    // mint apex to test account
    await apex.connect(deployer).mint(deployer.address, apexMint);

    const Geo = await ethers.getContractFactory("GeoERC20");
    const geo = await Geo.deploy();
    await geo.deployed()

    const OlympusTreasury = await ethers.getContractFactory("OlympusTreasury");
    const olympusTreasury = await OlympusTreasury.deploy(
        apex.address, 
        dai.address, 
        dai.address, 
        "0"
    );
    await olympusTreasury.deployed()
    
    const Staking = await ethers.getContractFactory("OlympusStaking");
    const staking = await Staking.deploy(
        apex.address,
        geo.address,
        epochLength,
        firstEpochNumber,
        blockNumber
    );
    await staking.deployed();

    // Initialize Geo
    await geo.setIndex("7675210820");
    await geo.initialize(staking.address);

    const Distributor = await ethers.getContractFactory("Distributor");
    const distributor = await Distributor.deploy(
        olympusTreasury.address,
        apex.address,
        epochLength,
        blockNumber
    );
    await distributor.deployed();

    // await apex.connect(deployer).mint(distributor.address, apexMint);
    await staking.connect(deployer).setContract(0, distributor.address);

    // warmup contract
    const StakingWarmup = await ethers.getContractFactory("StakingWarmup");
    const stakingWarmup = await StakingWarmup.deploy(staking.address, geo.address);
    await stakingWarmup.deployed();

    // initialize warmup
    await staking.connect(deployer).setWarmup(0);
    await staking.connect(deployer).setContract(1, stakingWarmup.address);

    // this is required to distribute
    await authority.pushVault(olympusTreasury.address, true);

    const ApexLock = await ethers.getContractFactory("ApexLock");
    const apexLock = await ApexLock.deploy(geo.address);
    await apexLock.deployed();
    
    await apexLock.setPenalty(10000); // set penalty 10%
    await apexLock.setReward(geo.address);
    await apexLock.addLockUnit(daySec * 14, 115);
    await apexLock.addLockUnit(daySec * 30, 130);
    await apexLock.addLockUnit(daySec * 90, 150);
    await apexLock.addLockUnit(daySec * 180, 200);

    const StakingHelper = await ethers.getContractFactory("StakingHelper");
    const stakingHelper = await StakingHelper.deploy(
        staking.address, 
        apexLock.address, 
        apex.address
    );
    await stakingHelper.deployed();

    await staking.connect(deployer).setContract(2, apexLock.address);
    await apexLock.connect(deployer).setHelper(stakingHelper.address);

    const BondCalculator = await ethers.getContractFactory("BondCalculator")
    const bondCalculator = await BondCalculator.deploy(apex.address)
    await bondCalculator.deployed()

    const RedeemHelper = await ethers.getContractFactory("RedeemHelper")
    const redeemHelper = await RedeemHelper.deploy()
    await redeemHelper.deployed()

    const DaiBond = await ethers.getContractFactory("OlympusBondDepository")
    const daiBond = await DaiBond.deploy(
        apex.address,
        // pairDaiOHM,
        dai.address,
        olympusTreasury.address,
        staking.address,
        ethers.constants.AddressZero
        // bondCalculator.address
    );
    await daiBond.deployed();

    await olympusTreasury.connect(deployer).queue(0, daiBond.address);
    await olympusTreasury.connect(deployer).toggle(0, daiBond.address, daiBond.address);

    // very important for bonding depository
    const maxPayout = 30; // -> 1000 max if 100k apex minted
    const payFee = 10000; // 10000 -> 10%
    await daiBond.initializeBondTerms(
        13000, // control variable
        50, // vesting term -> 33110 on mainnet
        31272, // minimum price
        maxPayout, // maxpayout
        payFee, // fee
        ethers.utils.parseUnits("1000000".toString(), 'ether'), // maxdebt
        ethers.utils.parseUnits("0", 'ether') // initialdebt -> totaldebt
    );

    await daiBond.setAdjustment(
        false,
        300,
        10000,
        100
    );

    // set buy/sell fee
    await apex.connect(deployer).setPercent(0, 100);
    await apex.connect(deployer).setPercent(1, 100);

const config = `DAI_BOND_DEPOSITORY: "${daiBond.address}",
DAI_ADDRESS: "${dai.address}",
OHM_ADDRESS: "${apex.address}",
SOHM_ADDRESS: "${geo.address}",
STAKING_ADDRESS: "${staking.address}",
STAKING_HELPER_ADDRESS: "${stakingHelper.address}",
BONDINGCALC_ADDRESS: "${bondCalculator.address}",
TREASURY_ADDRESS: "${olympusTreasury.address}",
REDEEM_HELPER_ADDRESS: "${redeemHelper.address}",
APEX_LOCKER: "${apexLock.address}",
DISTRIBUTOR: "${distributor.address}",
`
    fs.writeFileSync('./config/local-deploy.txt', config)

const config1 = `{"DAI_BOND_DEPOSITORY": "${daiBond.address}",
"DAI_ADDRESS": "${dai.address}",
"OHM_ADDRESS": "${apex.address}",
"SOHM_ADDRESS": "${geo.address}",
"STAKING_ADDRESS": "${staking.address}",
"STAKING_HELPER_ADDRESS": "${stakingHelper.address}",
"BONDINGCALC_ADDRESS": "${bondCalculator.address}",
"TREASURY_ADDRESS": "${olympusTreasury.address}",
"REDEEM_HELPER_ADDRESS": "${redeemHelper.address}",
"APEX_LOCKER": "${apexLock.address}",
"DISTRIBUTOR": "${distributor.address}"
}`

    fs.writeFileSync('./config/local-deploy.json', config1)
}

main()
.then(() => process.exit())
.catch((error) => {
    console.error(error);
    process.exit(1);
});
