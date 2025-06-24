// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.18;

import { IFactory } from "@hashgraph/ats/contracts/contracts/interfaces/factory/IFactory.sol";
import { FactoryRegulationData } from "@hashgraph/ats/contracts/contracts/layer_3/constants/regulation.sol";
import { IBondHookHub } from "./IBondHookHub.sol";

interface IBondHookIssuance {
    /// @notice Thrown when the bond is not deployed from the issuance module
    error BondNotDeployedFromHook(address bond);
    /// @notice Thrown when trying to launch the pool before concluding the subscription
    error BondSubscriptionPeriodNotEnded();
    /// @notice Thrown when trying to conclude subscription before starting date set on the bond
    error BondStartingDateInFuture(uint256 startingDate);
    /// @notice Thrown when the caller has not admin rights in the bond
    error CallerIsNotBondAdmin();

    /// @notice Bond issuer deploys the bond and the hook will register it
    /// @param _bondData Data about the issued bond
    /// @param _factoryRegulationData Applicable regulation information
    /// @return Bond address
    function deployBond(
        IFactory.BondData memory _bondData,
        FactoryRegulationData memory _factoryRegulationData
    )
        external
        returns (address);

    /// @notice Sets the address associated with a currency code
    /// @param _code The code of the currency
    /// @param _currency The address of the currency
    function setCurrencyCode(bytes3 _code, address _currency) external;

    /// @notice Once the primary market is closed, the issuer calls this function
    /// @param _bond Address of the bond whose issuance has concluded
    /// @param _allocatedPrice Allocated price during subscription period
    function concludeSubscription(address _bond, uint256 _allocatedPrice) external;

    /// @notice Opens the secondary market by launching the pool
    /// @param _bond Address of the bond
    /// @param _poolConfigData Information about the pool mechanics
    function launchPool(address _bond, IBondHookHub.PoolConfigData memory _poolConfigData) external;
}
