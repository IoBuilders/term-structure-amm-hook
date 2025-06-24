// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.18;

/// @notice Routers interacting with the pools need to implement this interface
interface IMsgSender {
    /// @notice Returns the address of the swapper
    function msgSender() external view returns (address);
}
