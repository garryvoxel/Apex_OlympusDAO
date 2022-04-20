// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.7.5;

import "./interfaces/IERC20.sol";
import "./libraries/SafeMath.sol";
import "./libraries/SafeERC20.sol";

abstract contract Owned {
    address public owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    modifier onlyOwner() {
        require(owner == msg.sender, "Ownable: caller is not the owner");
        _;
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(
            newOwner != address(0),
            "Ownable: new owner is the zero address"
        );
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}

contract ApexPresale is Owned {
    using SafeMath for uint;
    using SafeERC20 for IERC20;

    // unix timestamp datas
    bool public openPresale;
    uint public closingTime; // time once the presale will close
    uint public claimStartTime; // time once the claim Apex started

    // buyers infos
    struct preBuy {
        uint mimAmount;
        uint aApexAmount;
        uint claimedPercent;
    }
    mapping(address => preBuy) public preBuys;
    mapping(address => bool) public whiteListed;

    // Apex address
    address public Apex;
    // address where funds are collected
    address public ApexWallet;
    // address of mim token
    address public immutable MIMToken;
    // address of ccc token
    address public immutable CCCToken;

    // buy rate
    uint public boughtaApex;
    uint public constant rate = 10;
    uint public constant secInDay = 86400;
    uint public constant maxaApexAmount = 3 * 1e14;

    uint public constant MimAmount1 = 500;
    uint public constant MimAmount2 = 1000;
    uint public constant MimAmount3 = 1500;
    uint public constant MinCCC1 = 16 * 1e6;
    uint public constant MinCCC2 = 50 * 1e6;
    uint public constant MinCCC3 = 75 * 1e6;

    enum BuyType { LV1, LV2, LV3 }

    event TokenPurchase(address indexed purchaser, uint MimAmount, uint aApexAmount);
    event ClaimApex(address indexed claimer, uint apexAmount);

    constructor(
        address _mim,
        address _ccc
    ) {
        require(_mim != address(0));
        require(_ccc != address(0));

        MIMToken = _mim;
        CCCToken = _ccc;
    }

    function setApex(address _apex) external onlyOwner {
        require(_apex != address(0));
        Apex = _apex;
    }

    function setWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0));
        ApexWallet = _wallet;
    }

    function startPresale() external onlyOwner {
        require(closingTime == 0, "Presale is open");
        
        closingTime = block.timestamp.add(secInDay.mul(2));
        openPresale = true;
    }

    function stopPresale() external onlyOwner {
        require(isPresale(), "Presale is not open");

        openPresale = false;
    }

    function startClaim() external onlyOwner {
        // check presale completed
        require(closingTime > 0 && block.timestamp > closingTime);

        claimStartTime = block.timestamp;
    }

    function setWhitelist(address[] memory addresses, bool value) public onlyOwner {
        for (uint i = 0; i < addresses.length; i++) {
            whiteListed[addresses[i]] = value;
        }
    }

    function isPresale() public view returns(bool) {
        return block.timestamp <= closingTime && openPresale;
    }

    function presaleTime() public view returns(uint _remain) {
        _remain = isPresale() ? closingTime - block.timestamp : 0;
    }

    function getCCCMin(BuyType _type) public pure returns(uint) {
        uint cccMin = _type == BuyType.LV1 ? MinCCC1 : (_type == BuyType.LV2 ? MinCCC2 : MinCCC3);
        return cccMin.mul(1e9);
    }

    function getMimAmount(BuyType _type) public pure returns(uint) {
        uint _minAmount = _type == BuyType.LV1 ? MimAmount1 : (_type == BuyType.LV2 ? MimAmount2 : MimAmount3);
        return _minAmount.mul(1e18);
    }

    // allows buyers to put their mim to get some aApex once the presale will closes
    function buy(BuyType _type) public {
        require(isPresale(), "Presale is not open");
        require(whiteListed[msg.sender], "You are not whitelisted");
        
        require(IERC20( CCCToken ).balanceOf(msg.sender) >= getCCCMin(_type), "You don't have enought CCC balance");

        preBuy memory selBuyer = preBuys[msg.sender];
        require(selBuyer.mimAmount == 0, "You bought aApex already");

        uint mimAmount = getMimAmount(_type);
        require(mimAmount > 0);

        // calculate aApex amount to be created
        uint aApexAmount = mimAmount.mul(rate).div(1e11);
        require(maxaApexAmount.sub(boughtaApex) >= aApexAmount, "there aren't enough fund to buy more aApex");

        // safe transferFrom of the payout amount
        IERC20( MIMToken ).safeTransferFrom(msg.sender, address(this), mimAmount);
        
        selBuyer.mimAmount = mimAmount;
        selBuyer.aApexAmount = aApexAmount;
        preBuys[msg.sender] = selBuyer;

        boughtaApex = boughtaApex.add(aApexAmount);

        emit TokenPurchase(
            msg.sender,
            mimAmount,
            aApexAmount
        );
    }

    function getDay() public view returns(uint) {
        return block.timestamp.sub(claimStartTime).div(secInDay);
    }

    function getPercent() public view returns (uint _percent) {
        if(claimStartTime > 0 && block.timestamp >= claimStartTime) {
            uint dayPassed = getDay();
            if(dayPassed > 8) {
                dayPassed = 8;
            }

            uint totalPercent = dayPassed.mul(10).add(20);

            preBuy memory info = preBuys[msg.sender];
            _percent = totalPercent.sub(info.claimedPercent);
        }
    }

    function claimApex() public {
        preBuy memory info = preBuys[msg.sender];
        require(info.aApexAmount > 0, "Insufficient aApex");

        uint percent = getPercent();
        require(percent > 0, "You can not claim more");
        
        uint newPercent = info.claimedPercent.add(percent);
        require(newPercent <= 100);

        preBuys[msg.sender].claimedPercent = newPercent;

        uint amount = info.aApexAmount.mul(percent).div(100);
        IERC20( Apex ).safeTransfer(msg.sender, amount);

        emit ClaimApex(msg.sender, amount);
    }

    // allows operator wallet to get the mim deposited in the contract
    function retrieveMim() public onlyOwner {
        require(!isPresale() && closingTime > 0, "Presale is not over yet");

        IERC20( MIMToken ).safeTransfer(ApexWallet, IERC20( MIMToken ).balanceOf(address(this)));
    }

    // allows operator wallet to get the unsold apex in the contract
    function retrieveApex() public onlyOwner {
        require(claimStartTime > 0 && getDay() > 8);

        IERC20( Apex ).safeTransfer(ApexWallet, IERC20( Apex ).balanceOf(address(this)));
    }

    function withdrawFunds() public onlyOwner {
        payable( ApexWallet ).transfer(address(this).balance);
    }

    receive() external payable {}
}