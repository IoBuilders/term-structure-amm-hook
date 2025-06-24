// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.18;

import { IBondHookHub } from "../interfaces/IBondHookHub.sol";
import { PoolId } from "@uniswap/v4-core/src/types/PoolId.sol";
import { Pool } from "@uniswap/v4-core/src/libraries/Pool.sol";

/// @notice Library used to read information about a pool
library StateLibrary {
    function getBondHookConfigData(IBondHookHub.BondHookState storage _self)
        external
        view
        returns (IBondHookHub.PoolConfigData memory poolConfigData_)
    {
        IBondHookHub.ReservesData memory reserveData = _self.reservesData;
        IBondHookHub.PriceDynamicParams memory priceDynamics = _self.priceDynamicParams;
        poolConfigData_.vault0 = reserveData.vault0;
        poolConfigData_.vault1 = reserveData.vault1;
        poolConfigData_.marketDynamicGamma = priceDynamics.marketDynamicGamma;
        poolConfigData_.ytm = priceDynamics.ytm;
        poolConfigData_.baseSensitivity = priceDynamics.baseSensitivity;
        poolConfigData_.limitSensitivity = priceDynamics.limitSensitivity;
        poolConfigData_.sensitivityDecayRate = priceDynamics.sensitivityDecayRate;
        poolConfigData_.deltaPriceThreshold = priceDynamics.deltaPriceThreshold;
        poolConfigData_.ytmOracle = _self.ytmOracle;
        poolConfigData_.feeDecayRate = _self.feeDecayRate;
        poolConfigData_.baseFee = _self.baseFee;
        poolConfigData_.defaultFee = _self.defaultFee;
        poolConfigData_.singleSidedIncentive = _self.singleSidedIncentive;
    }

    function getSentivity(IBondHookHub.BondHookState storage _self) external view returns (uint256 senstivity_) {
        senstivity_ = _self.priceDynamicParams.marketDynamicSensitivity;
    }

    function getReserveAmounts(IBondHookHub.BondHookState storage _self)
        external
        view
        returns (uint256 reserveAmount0_, uint256 reserveAmount1_)
    {
        reserveAmount0_ = _self.reservesData.reserveAmount0;
        reserveAmount1_ = _self.reservesData.reserveAmount1;
    }

    function getPoolInternalState(Pool.State storage _selfState)
        external
        view
        returns (
            uint256 feeGrowthGlobal0X128_,
            uint256 feeGrowthGlobal1X128_,
            uint160 sqrtPriceX96_,
            uint24 lpFee_,
            uint128 liqudity_
        )
    {
        feeGrowthGlobal0X128_ = _selfState.feeGrowthGlobal0X128;
        feeGrowthGlobal1X128_ = _selfState.feeGrowthGlobal1X128;
        sqrtPriceX96_ = _selfState.slot0.sqrtPriceX96();
        lpFee_ = _selfState.slot0.lpFee();
        liqudity_ = _selfState.liquidity;
    }
}
