// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.18;

import "forge-std/Script.sol";
import { Hooks } from "@uniswap/v4-core/src/libraries/Hooks.sol";
import { IPoolManager, PoolManager } from "@uniswap/v4-core/src/PoolManager.sol";
import { HookMiner } from "@uniswap/v4-periphery/src/utils/HookMiner.sol";
import { BondHookHub } from "../src/BondHookHub.sol";
import { stdJson } from "forge-std/StdJson.sol";

contract BondHookHubDeployer is Script {
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    function run() public {
        uint160 flags = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG);

        vm.startBroadcast();
        PoolManager poolManager = new PoolManager(msg.sender);
        bytes memory constructorArgs = abi.encode(poolManager, vm.addr(vm.envUint("PRIVATE_KEY_ADMIN")));
        (address hookAddress, bytes32 salt) =
            HookMiner.find(CREATE2_DEPLOYER, flags, type(BondHookHub).creationCode, constructorArgs);
        BondHookHub bondHookHub = new BondHookHub{ salt: salt }(
            IPoolManager(address(poolManager)), vm.addr(vm.envUint("PRIVATE_KEY_ADMIN"))
        );
        require(address(bondHookHub) == hookAddress, "BondHookHubDeployer: hook address mismatch");
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
