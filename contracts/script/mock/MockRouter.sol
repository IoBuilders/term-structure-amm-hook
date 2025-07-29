// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.18;

import { IMsgSender } from "../../src/interfaces/IMsgSender.sol";
import { IUnlockCallback } from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import { IPoolManager } from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import { SwapParams } from "@uniswap/v4-core/src/types/PoolOperation.sol";
import { BalanceDelta } from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import { PoolKey } from "@uniswap/v4-core/src/types/PoolKey.sol";
import { PoolId } from "@uniswap/v4-core/src/types/PoolId.sol";

import { console2 } from "forge-std/Test.sol";

contract MockRouter is IMsgSender, IUnlockCallback {
    IPoolManager poolManager;
    PoolKey poolKey;
    address sender;

    event SwapExecuted(address indexed sender, PoolId indexed id);

    constructor(IPoolManager _poolManager, PoolKey memory _poolKey) {
        poolManager = _poolManager;
        poolKey = _poolKey;
    }

    function executeSwap(SwapParams memory _params) external {
        sender = msg.sender;
        poolManager.unlock(abi.encode(_params));

        emit SwapExecuted(sender, poolKey.toId());
    }

    function unlockCallback(bytes calldata _data) external returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert("CallerIsNotPoolManager");
        SwapParams memory swapParams = abi.decode(_data, (SwapParams));
        console2.log("SWAP");
        BalanceDelta swapDelta = poolManager.swap(poolKey, swapParams, "");
        if (swapParams.zeroForOne) {
            poolManager.take(poolKey.currency1, sender, uint256(uint128(swapDelta.amount1())));
        } else {
            poolManager.take(poolKey.currency0, sender, uint256(uint128(swapDelta.amount0())));
        }
    }

    function msgSender() external view returns (address) {
        return sender;
    }
}
