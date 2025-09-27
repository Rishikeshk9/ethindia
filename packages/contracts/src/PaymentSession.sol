// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PaymentSession {
    event SessionOpened(address indexed user, uint256 budgetUsd, uint64 openedAt);
    event SessionClosed(address indexed user, uint256 spentUsd, uint64 closedAt);

    mapping(address => uint256) public budgetUsdByUser;

    function open(uint256 budgetUsd) external {
        require(budgetUsd > 0, "budget=0");
        require(budgetUsdByUser[msg.sender] == 0, "active");
        budgetUsdByUser[msg.sender] = budgetUsd;
        emit SessionOpened(msg.sender, budgetUsd, uint64(block.timestamp));
    }

    function close() external {
        uint256 budget = budgetUsdByUser[msg.sender];
        require(budget > 0, "no session");
        budgetUsdByUser[msg.sender] = 0;
        emit SessionClosed(msg.sender, 0, uint64(block.timestamp));
    }
}

