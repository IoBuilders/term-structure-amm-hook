// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface IBondYieldServiceManager {
    event NewTaskCreated(uint32 indexed taskIndex, Task task);

    event TaskResponded(uint32 indexed taskIndex, Task task, address operator);

    struct Task {
        bytes32 poolId;
        uint32 taskCreatedBlock;
    }

    function latestTaskNum() external view returns (uint32);

    function allTaskHashes(
        uint32 taskIndex
    ) external view returns (bytes32);

    function allTaskResponses(
        address operator,
        uint32 taskIndex
    ) external view returns (bytes memory);

    function createNewTask(
        bytes32 _polId
    ) external returns (Task memory);

    function respondToTask(
        Task calldata task,
        uint32 referenceTaskIndex,
        bytes calldata signature,
        uint256 _ytm
    ) external;

    function slashOperator(
        Task calldata task,
        uint32 referenceTaskIndex,
        address operator
    ) external;
}
