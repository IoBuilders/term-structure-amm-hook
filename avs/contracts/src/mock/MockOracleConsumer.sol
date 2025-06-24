// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {IOracleConsumer} from "../../src/IOracleConsumer.sol";

contract MockOracleConsumer {
    uint256 public ytm;

    function updateBondYtm(bytes32, uint256 _ytm) external {
        ytm = _ytm;
    }
}
