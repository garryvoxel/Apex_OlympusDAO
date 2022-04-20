const { ethers } = require("hardhat");
const fs = require('fs');
const keyConfig = require('../config/config.json');

async function main() {
    const daySec = 86400;
    const epochLength = "200" // need to update
    const firstEpochNumber = "1";

    const userAddr = "0x9f5D1Dcf5367E5D6d2eCD9670046358854D1FF01";

    const blockNumber = (await ethers.provider.getBlock()).number;

    const daiMint = ethers.utils.parseUnits("50000".toString(), 'ether');
    const apexMint = ethers.utils.parseUnits("5000", 'gwei');

    const [deployer] = await ethers.getSigners();
    const deployerAddr = deployer.address;
    console.log("Deploying contracts with the account: " + deployerAddr);

    const DAI = await ethers.getContractFactory("DAI")
    const dai = await DAI.deploy(43113)
    await dai.deployed()
    const daiAddr = dai.address;

    console.log(daiAddr, "daiAddr")

    await dai.connect(deployer).mint(deployerAddr, daiMint);
    await dai.connect(deployer).mint(userAddr, daiMint);

    // const daiAddr = "0x26c8ad67cc099CBbc0077be7Fe01766582c17272";

    const Authority = await ethers.getContractFactory("OlympusAuthority")
    const authority = await Authority.deploy(deployerAddr, deployerAddr, deployerAddr, deployerAddr)
    await authority.deployed()
    const authorityAddr = authority.address;

    console.log(authorityAddr, "authorityAddr")

    const Apex = await ethers.getContractFactory("ApexERC20");
    const apex = await Apex.deploy(authorityAddr, keyConfig.apex_wallet);
    await apex.deployed()
    const apexAddr = apex.address;

    console.log(apexAddr, "apexAddr")

    // mint apex to test account
    await apex.connect(deployer).mint(deployerAddr, apexMint);
    await apex.connect(deployer).mint(userAddr, apexMint);

    // set buy/sell fee
    await apex.connect(deployer).setPercent(0, 100);
    await apex.connect(deployer).setPercent(1, 100);

    const Geo = await ethers.getContractFactory("GeoERC20");
    const geo = await Geo.deploy();
    await geo.deployed()
    const geoAddr = geo.address;

    console.log(geoAddr, "geoAddr")

    const OlympusTreasury = await ethers.getContractFactory("OlympusTreasury");
    const olympusTreasury = await OlympusTreasury.deploy(apexAddr, daiAddr, daiAddr, "0")
    await olympusTreasury.deployed()
    const treasuryAddr = olympusTreasury.address;

    console.log(treasuryAddr, "treasuryAddr")

    await olympusTreasury.connect(deployer).setReward(apexAddr);

    const Staking = await ethers.getContractFactory("OlympusStaking");
    const staking = await Staking.deploy(
        apexAddr,
        geoAddr,
        epochLength,
        firstEpochNumber,
        blockNumber
    );
    await staking.deployed();
    const stakingAddr = staking.address;

    console.log(stakingAddr, "stakingAddr")

    // Initialize Geo
    await geo.setIndex("7675210820");
    await geo.initialize(stakingAddr);

    const Distributor = await ethers.getContractFactory("Distributor");
    const distributor = await Distributor.deploy(
        treasuryAddr,
        apexAddr,
        epochLength,
        blockNumber
    );
    await distributor.deployed();
    const distributorAddr = distributor.address;

    console.log(distributorAddr, "distributorAddr")

    // await apex.connect(deployer).mint(distributorAddr, apexMint);
    await staking.connect(deployer).setContract(0, distributorAddr);

    // warmup contract
    const StakingWarmup = await ethers.getContractFactory("StakingWarmup");
    const stakingWarmup = await StakingWarmup.deploy(stakingAddr, geoAddr);
    await stakingWarmup.deployed();
    const warmupAddr = stakingWarmup.address;

    console.log(warmupAddr, "warmupAddr");

    // initialize warmup
    await staking.connect(deployer).setWarmup(0);
    await staking.connect(deployer).setContract(1, warmupAddr);

    // this is required to distribute
    await authority.pushVault(treasuryAddr, true);

    const ApexLock = await ethers.getContractFactory("ApexLock");
    const apexLock = await ApexLock.deploy(geoAddr, treasuryAddr);
    await apexLock.deployed();
    const lockAddr = apexLock.address;

    console.log(lockAddr, "lockAddr");
    
    await apexLock.setPenalty(10000); // set penalty 10%
    await apexLock.addLockUnit(daySec * 14, 115); 100 * 1.15 = 100 sOHM + 15% reward Token
    await apexLock.addLockUnit(daySec * 30, 130);
    await apexLock.addLockUnit(daySec * 90, 150);
    await apexLock.addLockUnit(daySec * 180, 200);

    await apexLock.addLockUnit(300, 115);
    await apexLock.addLockUnit(420, 150);
    await apexLock.addLockUnit(600, 200);
    
    // set lock to treasury
    await olympusTreasury.setLocker(lockAddr);

    const StakingHelper = await ethers.getContractFactory("StakingHelper");
    const stakingHelper = await StakingHelper.deploy(
        stakingAddr, 
        lockAddr, 
        apexAddr
    );
    await stakingHelper.deployed();
    const helperAddr = stakingHelper.address;

    console.log(helperAddr, "helperAddr");

    await staking.connect(deployer).setContract(2, lockAddr);
    await apexLock.connect(deployer).setHelper(helperAddr);

    const BondCalculator = await ethers.getContractFactory("BondCalculator")
    const bondCalculator = await BondCalculator.deploy(apexAddr)
    await bondCalculator.deployed()
    const bondCalcAddr = bondCalculator.address;
    
    console.log(bondCalcAddr, "bondCalculator");

    const RedeemHelper = await ethers.getContractFactory("RedeemHelper")
    const redeemHelper = await RedeemHelper.deploy()
    await redeemHelper.deployed()
    const redeemAddr = redeemHelper.address

    console.log(redeemAddr, "redeemHelper");

    const DaiBond = await ethers.getContractFactory("OlympusBondDepository")
    const daiBond = await DaiBond.deploy(
        apexAddr,
        // pairDaiOHM,
        daiAddr,
        treasuryAddr,
        stakingAddr,
        ethers.constants.AddressZero
        // bondCalcAddr
    );
    await daiBond.deployed();
    const daiBondAddr = daiBond.address

    console.log(daiBondAddr, "daiBond");

    await olympusTreasury.connect(deployer).queue(0, daiBondAddr);
    await olympusTreasury.connect(deployer).toggle(0, daiBondAddr, daiBondAddr);

    console.log("111")

    // very important for bonding depository
    const maxPayout = 30; // -> 1000 max if 100k apex minted
    const payFee = 10000; // 10000 -> 10%
    await daiBond.initializeBondTerms(
        13000, // control variable
        50, // vesting term -> 33110 on mainnet
        28572, // minimum price
        maxPayout, // maxpayout
        payFee, // fee
        ethers.utils.parseUnits("1000000".toString(), 'ether'), // maxdebt
        ethers.utils.parseUnits("0", 'ether') // initialdebt -> totaldebt
    );

    console.log("222")

    await daiBond.setAdjustment(
        false,
        300,
        10000,
        100
    );

    console.log("333")

    const config = `DAI_BOND_DEPOSITORY: "${daiBondAddr}",
DAI_ADDRESS: "${daiAddr}",
OHM_ADDRESS: "${apexAddr}",
SOHM_ADDRESS: "${geoAddr}",
STAKING_ADDRESS: "${stakingAddr}",
STAKING_HELPER_ADDRESS: "${helperAddr}",
BONDINGCALC_ADDRESS: "${bondCalcAddr}",
TREASURY_ADDRESS: "${treasuryAddr}",
REDEEM_HELPER_ADDRESS: "${redeemAddr}",
APEX_LOCKER: "${lockAddr}",
DISTRIBUTOR: "${distributorAddr}",
`
    fs.writeFileSync('./config/fuji-deploy.txt', config)

const config1 = `{"DAI_BOND_DEPOSITORY": "${daiBondAddr}",
"DAI_ADDRESS": "${daiAddr}",
"OHM_ADDRESS": "${apexAddr}",
"SOHM_ADDRESS": "${geoAddr}",
"STAKING_ADDRESS": "${stakingAddr}",
"STAKING_HELPER_ADDRESS": "${helperAddr}",
"BONDINGCALC_ADDRESS": "${bondCalcAddr}",
"TREASURY_ADDRESS": "${treasuryAddr}",
"REDEEM_HELPER_ADDRESS": "${redeemAddr}",
"APEX_LOCKER": "${lockAddr}",
"DISTRIBUTOR": "${distributorAddr}"
}`

    fs.writeFileSync('./config/fuji-deploy.json', config1)
}

main()
.then(() => process.exit())
.catch((error) => {
    console.error(error);
    process.exit(1);
});
