// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.18;

import { Create2 } from "@openzeppelin/contracts/utils/Create2.sol";

contract Create2Factory {
    function deploy(bytes32 salt, bytes memory bytecode) external returns (address addr) {
        return Create2.deploy(0, salt, bytecode);
    }
}
