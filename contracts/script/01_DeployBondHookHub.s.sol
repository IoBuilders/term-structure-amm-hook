// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.18;

import "forge-std/Script.sol";
import { Hooks } from "@uniswap/v4-core/src/libraries/Hooks.sol";
import { IPoolManager, PoolManager } from "@uniswap/v4-core/src/PoolManager.sol";
import { HookMiner } from "@uniswap/v4-periphery/src/utils/HookMiner.sol";
import { BondHookHub } from "../src/BondHookHub.sol";
import { stdJson } from "forge-std/StdJson.sol";
import { Create2Factory } from "./utils/Create2Factory.sol";

contract BondHookHubDeployer is Script {
    function run() public {
        uint160 flags = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG);

        vm.startBroadcast();
        PoolManager poolManager = new PoolManager(msg.sender);
        bytes memory constructorArgs = abi.encode(poolManager, vm.addr(vm.envUint("PRIVATE_KEY_ADMIN")));
        Create2Factory factory = new Create2Factory();
        (address hookAddress, bytes32 salt) =
            HookMiner.find(address(factory), flags, type(BondHookHub).creationCode, constructorArgs);
        address bondHookHub = factory.deploy(salt, abi.encodePacked(type(BondHookHub).creationCode, constructorArgs));
        require(bondHookHub == hookAddress, "BondHookHubDeployer: hook address mismatch");
        vm.stopBroadcast();

        string memory deploymentJson = string.concat(
            '{"bondHookHub":{"address":"',
            vm.toString(hookAddress),
            '"},',
            '"poolManager":{"address":"',
            vm.toString(address(poolManager)),
            '"}}'
        );

        string memory fileName = "config/hook/deployments.json";

        vm.writeFile(fileName, deploymentJson);
    }
}
