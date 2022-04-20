const { ethers } = require("hardhat");
const locKey = require("../config/fuji-deploy.json");

describe("Staking test", () => {
    let deployer;
    before(async () => {
        [deployer] = await ethers.getSigners();
    })

    it("get sohm", async() => {
        try {
            // const authority = await ethers.getContractAt("OlympusAuthority", "0xCD46934f45d04ebE1Abe4B6817874b664c8FA0e7");
            // console.log(await authority.vault(), "vault0");

            // const apex = await ethers.getContractAt("ApexERC20", locKey.OHM_ADDRESS);
            // const apexMint = ethers.utils.parseUnits("10000", 'gwei');
            // // await apex.connect(deployer).mint(deployer.address, apexMint);

            // console.log(await apex.callStatic.balanceOf(locKey.TREASURY_ADDRESS));

            // const dai = await ethers.getContractAt("DAI", locKey.DAI_ADDRESS)
            // const daiMint = ethers.utils.parseUnits("100000".toString(), 'ether');
            // await dai.connect(deployer).mint(deployer.address, daiMint);

            // console.log(await dai.callStatic.balanceOf(deployer.address));

            // const ApexLock = await ethers.getContractFactory("ApexLock");
            // const apexLock = await ApexLock.deploy(locKey.SOHM_ADDRESS, locKey.TREASURY_ADDRESS);
            // await apexLock.deployed();
            // const lockAddr = apexLock.address;

            // console.log(lockAddr, "lockAddr");

            // await apexLock.setPenalty(10000); // set penalty 10%
            // await apexLock.setReward(locKey.OHM_ADDRESS);

            // console.log("111");

            const apexLock = await ethers.getContractAt("ApexLock", locKey.APEX_LOCKER);
            // await apexLock.connect(deployer).addLockUnit(60 * 5, 115);
            // await apexLock.connect(deployer).addLockUnit(60 * 7, 150);
            // await apexLock.connect(deployer).addLockUnit(60 * 10, 200);

            console.log(await apexLock.callStatic.userLocks(deployer.address), "userLocks");
            // console.log(await apexLock.callStatic.Treasury(), "Treasury");
            // console.log(await apexLock.callStatic.RewardToken(), "RewardToken");

            const treasury = await ethers.getContractAt("OlympusTreasury", locKey.TREASURY_ADDRESS);
            console.log(await treasury.callStatic.RewardToken(), "RewardToken");

            // console.log("222");

            // const StakingHelper = await ethers.getContractFactory("StakingHelper");
            // const stakingHelper = await StakingHelper.deploy(
            //     locKey.STAKING_ADDRESS, 
            //     lockAddr, 
            //     locKey.OHM_ADDRESS
            // );
            // await stakingHelper.deployed();
            // const helperAddr = stakingHelper.address;

            // console.log(helperAddr, "helperAddr");
            
            // const staking = await ethers.getContractAt("OlympusStaking", locKey.STAKING_ADDRESS);
            // await staking.connect(deployer).setContract(2, apexLock.address);
            // await apexLock.connect(deployer).setHelper(stakingHelper.address);

            const staking = await ethers.getContractAt("OlympusStaking", locKey.STAKING_ADDRESS);
            console.log(await staking.callStatic.locker());
            console.log(await staking.callStatic.warmupPeriod(), "warmupPeriod");

            const stakingHelper = await ethers.getContractAt("StakingHelper", locKey.STAKING_HELPER_ADDRESS)
            console.log(await stakingHelper.callStatic.OHM(), "ohm");
            console.log(await stakingHelper.callStatic.staking(), "staking");
            console.log(await stakingHelper.callStatic.locker(), "locker");

            // console.log("333");

            const geo = await ethers.getContractAt("GeoERC20", locKey.SOHM_ADDRESS);
            console.log(await geo.callStatic.stakingContract(), "stakingContract");
            console.log(await geo.callStatic.balanceOf(locKey.APEX_LOCKER), "Locker balance");
        } catch(err) {
            console.log(err);
        }
    })
});
