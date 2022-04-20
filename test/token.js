const { ethers } = require("hardhat");
const {expect} = require('chai');
const locKey = require("../config/local-deploy.json");

describe("Apex/Geo check", () => {
    let deployer;
    before(async () => {
        [deployer] = await ethers.getSigners();
    })

    it("bond depository test", async() => {
        const apex = await ethers.getContractAt("ApexERC20", locKey.OHM_ADDRESS);
        const geo = await ethers.getContractAt("GeoERC20", locKey.SOHM_ADDRESS);
        const staking = await ethers.getContractAt("OlympusStaking", locKey.STAKING_ADDRESS);

        // const Geo = await ethers.getContractFactory("GeoERC20");
        // const geo = await Geo.deploy();
        // await geo.deployed();
        // await geo.initialize(locKey.STAKING_ADDRESS);

        // await geo.setIndex(7675210820)

        // console.log(await geo.callStatic.totalSupply(), "totalSupply");
        // console.log(await geo.callStatic.stakingContract(), "stakingContract");
        // console.log(await geo.callStatic.balanceOf(locKey.STAKING_ADDRESS), "balanceOf");
        // console.log(await geo.callStatic.circulatingSupply(), "circulatingSupply");
        // console.log(await geo.callStatic.INDEX(), "INDEX");
        // console.log(await geo.callStatic._gonsPerFragment(), "_gonsPerFragment"); // 0x0e69594bec44de15b4c2ebe687989a9b3bf716c1add27f08523c

        // check buy back price
        
    })
});
