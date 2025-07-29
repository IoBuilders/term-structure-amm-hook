// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.18;

import { BeforeSwapDelta, toBeforeSwapDelta } from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import { Pool } from "@uniswap/v4-core/src/libraries/Pool.sol";
import { BalanceDelta } from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import { IBondHookHub } from "../interfaces/IBondHookHub.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { SafeCast } from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import { SignedMath } from "@openzeppelin/contracts/utils/math/SignedMath.sol";
import { DECIMAL_PRECISION, BPS, SECONDS_PER_YEAR, DUST_THRESHOLD } from "../constants/Constants.sol";
import { SwapParams } from "@uniswap/v4-core/src/types/PoolOperation.sol";
import { PoolKey } from "@uniswap/v4-core/src/types/PoolKey.sol";
import { BondUSA } from "@hashgraph/ats/contracts/contracts/layer_3/bondUSA/BondUSA.sol";
import { IBond } from "@hashgraph/ats/contracts/contracts/layer_2/interfaces/bond/IBond.sol";
import { FixedPoint96 } from "@uniswap/v4-core/src/libraries/FixedPoint96.sol";
import { IPoolManager } from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import { ERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import { BondHookLpToken } from "../BondHookLpToken.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Currency } from "@uniswap/v4-core/src/types/Currency.sol";
import { TickMath } from "@uniswap/v4-core/src/libraries/TickMath.sol";

/// @notice Library used to handle swaps and liquidity provision with our own custom logic
library BondHookLogic {
    using Math for *;
    using SafeCast for *;
    using SignedMath for int256;

    struct PoolAmounts {
        uint256 amount0;
        uint256 amount1;
    }

    /// @notice first trader pays additional gas for updating the price but also gets the right to execute it close to
    /// its fair value
    function beforeSwap(
        IBondHookHub.BondHookState storage _self,
        SwapParams memory _params,
        PoolKey memory _poolKey,
        address _bond,
        IPoolManager _poolManager
    )
        internal
        returns (BeforeSwapDelta, BalanceDelta)
    {
        if (_self.priceDynamicParams.lastBlockKick != block.number) {
            // Set price bottom to the last price in the previous block
            _self.priceDynamicParams.priceBottom = _self.poolState.slot0.sqrtPriceX96().mulDiv(
                DECIMAL_PRECISION, FixedPoint96.Q96
            ).mulDiv(_self.poolState.slot0.sqrtPriceX96(), FixedPoint96.Q96);
            uint160 sqrtOpeningPriceX96 = _calculateOpeningPrice(_self, _bond);
            // Overwrite pool price
            _self.poolState.slot0 = _self.poolState.slot0.setSqrtPriceX96(sqrtOpeningPriceX96);
            _self.poolState.slot0 = _self.poolState.slot0.setTick(TickMath.getTickAtSqrtPrice(sqrtOpeningPriceX96));
            // Compute idle funds as a result of the rebalance
            uint256 poolAmount0 = _poolManager.balanceOf(address(this), _poolKey.currency0.toId());
            uint256 poolAmount1 = _poolManager.balanceOf(address(this), _poolKey.currency1.toId());
            int256 deltaX = poolAmount0.toInt256()
                - poolAmount1.mulDiv(FixedPoint96.Q96, sqrtOpeningPriceX96).mulDiv(FixedPoint96.Q96, sqrtOpeningPriceX96)
                    .toInt256();
            if (deltaX > DUST_THRESHOLD.toInt256()) {
                _self.reservesData.reserveAmount0 = _self.reservesData.reserveAmount0 + deltaX.toUint256();
                _poolManager.burn(address(this), _poolKey.currency0.toId(), deltaX.toUint256());
                _poolManager.take(_poolKey.currency0, address(this), deltaX.toUint256());
                ERC20(Currency.unwrap(_poolKey.currency0)).approve(
                    address(_self.reservesData.vault0), deltaX.toUint256()
                );
                _self.reservesData.vault0.deposit(deltaX.toUint256(), address(this));
            } else {
                int256 deltaY = poolAmount1.toInt256()
                    - poolAmount0.mulDiv(sqrtOpeningPriceX96, FixedPoint96.Q96).mulDiv(
                        sqrtOpeningPriceX96, FixedPoint96.Q96
                    ).toInt256();
                if (deltaY > DUST_THRESHOLD.toInt256()) {
                    _self.reservesData.reserveAmount1 = _self.reservesData.reserveAmount1 + deltaY.toUint256();
                    _poolManager.burn(address(this), _poolKey.currency1.toId(), deltaY.toUint256());
                    _poolManager.take(_poolKey.currency1, address(this), deltaY.toUint256());
                    ERC20(Currency.unwrap(_poolKey.currency1)).approve(
                        address(_self.reservesData.vault1), deltaY.toUint256()
                    );
                    _self.reservesData.vault1.deposit(deltaY.toUint256(), address(this));
                }
            }
            // Update liquidity after rebalance
            _self.poolState.liquidity = (
                _poolManager.balanceOf(address(this), _poolKey.currency0.toId())
                    * _poolManager.balanceOf(address(this), _poolKey.currency1.toId())
            ).sqrt().toUint128();
            _self.priceDynamicParams.lastBlockKick = block.number;
            // Keep track of the tx index to ensure fairness in the trades due to the intra-block ordering priveleges
            _self.blockTxIndex = 0;
        }
        // Late swappers get prices further from the fair value which are compensated through reduced fees
        uint24 lpFee = int256(int24(_self.defaultFee) - int24(_self.feeDecayRate * _self.blockTxIndex.toUint24())).max(
            _self.baseFee.toInt256()
        ).toUint256().toUint24();

        ++_self.blockTxIndex;
        _self.poolState.slot0 = _self.poolState.slot0.setLpFee(lpFee);
        // Process the swap
        (BalanceDelta delta,,,) = Pool.swap(
            _self.poolState,
            Pool.SwapParams({
                zeroForOne: _params.zeroForOne,
                amountSpecified: _params.amountSpecified,
                sqrtPriceLimitX96: _params.sqrtPriceLimitX96,
                lpFeeOverride: 0,
                tickSpacing: _poolKey.tickSpacing
            })
        );
        // Tell the pool not to do anything since we took care of the swap
        BeforeSwapDelta beforeSwapDelta = toBeforeSwapDelta(-_params.amountSpecified.toInt128(), 0);
        return (beforeSwapDelta, delta);
    }

    function removeLiqudity(
        IBondHookHub.BondHookState storage _self,
        uint256 _liqudityDelta,
        IPoolManager _poolManager,
        address _sender,
        PoolKey memory _poolKey,
        BondHookLpToken _lpToken
    )
        internal
    {
        uint256 remainingAmount0;
        uint256 remainingAmount1;

        IBondHookHub.ReservesData memory reservesData = _self.reservesData;

        uint256 amount0 =
            _liqudityDelta / _lpToken.totalSupply() * _poolManager.balanceOf(address(this), _poolKey.currency0.toId());
        uint256 amount1 =
            _liqudityDelta / _lpToken.totalSupply() * _poolManager.balanceOf(address(this), _poolKey.currency1.toId());

        // If there is excess reserves, refund users with those idle funds
        uint256 amountToWithdraw0 =
            _withdrawReserves(_self, reservesData.vault0, amount0, reservesData.reserveAmount0, _sender, false);
        uint256 amountToWithdraw1 =
            _withdrawReserves(_self, reservesData.vault1, amount1, reservesData.reserveAmount1, _sender, true);

        remainingAmount0 = amount0 - amountToWithdraw0;
        remainingAmount1 = amount1 - amountToWithdraw1;

        if (remainingAmount0 > 0) {
            _poolManager.transfer(_sender, _poolKey.currency0.toId(), remainingAmount0);
        }

        if (remainingAmount1 > 0) {
            _poolManager.transfer(_sender, _poolKey.currency1.toId(), remainingAmount1);
        }
    }

    function addLiquidity(
        IBondHookHub.BondHookState storage _self,
        bool _singleSided,
        bool _isToken0,
        IBondHookHub.ModifyLiqudityAmounts memory _amounts,
        IPoolManager _poolManager,
        address _sender,
        PoolKey memory _poolKey
    )
        internal
        returns (uint256 liqudityDelta_)
    {
        IBondHookHub.ReservesData memory reservesData = _self.reservesData;

        uint256 amountToWithdraw;

        if (_isToken0) {
            _poolManager.sync(_poolKey.currency1);
            if (_singleSided) {
                amountToWithdraw = _withdrawReserves(
                    _self,
                    reservesData.vault1,
                    _amounts.unspecifiedTokenAmount,
                    reservesData.reserveAmount1,
                    address(this),
                    true
                );
                if (amountToWithdraw > 0) {
                    _poolKey.currency1.transfer(address(_poolManager), amountToWithdraw);
                }
            }
            if (_amounts.unspecifiedTokenAmount - amountToWithdraw > 0) {
                ERC20(Currency.unwrap(_poolKey.currency1)).transferFrom(
                    _sender, address(_poolManager), _amounts.unspecifiedTokenAmount - amountToWithdraw
                );
            }
            _poolManager.settle();
            _poolManager.sync(_poolKey.currency0);
            ERC20(Currency.unwrap(_poolKey.currency0)).transferFrom(
                _sender, address(_poolManager), _amounts.specifiedTokenAmount
            );
            _poolManager.settle();
            _poolManager.mint(address(this), _poolKey.currency0.toId(), _amounts.specifiedTokenAmount);
            _poolManager.mint(address(this), _poolKey.currency1.toId(), _amounts.unspecifiedTokenAmount);
        } else {
            _poolManager.sync(_poolKey.currency0);
            if (_singleSided) {
                amountToWithdraw = _withdrawReserves(
                    _self,
                    reservesData.vault0,
                    _amounts.unspecifiedTokenAmount,
                    reservesData.reserveAmount0,
                    address(this),
                    false
                );
                if (amountToWithdraw > 0) {
                    _poolKey.currency0.transfer(address(_poolManager), amountToWithdraw);
                }
            }
            if (_amounts.unspecifiedTokenAmount - amountToWithdraw > 0) {
                ERC20(Currency.unwrap(_poolKey.currency0)).transferFrom(
                    _sender, address(_poolManager), _amounts.unspecifiedTokenAmount - amountToWithdraw
                );
            } // avoid reverting due to invalid partition
            _poolManager.settle();
            _poolManager.sync(_poolKey.currency1);
            ERC20(Currency.unwrap(_poolKey.currency1)).transferFrom(
                _sender, address(_poolManager), _amounts.specifiedTokenAmount
            );
            _poolManager.settle();
            _poolManager.mint(address(this), _poolKey.currency0.toId(), _amounts.unspecifiedTokenAmount);
            _poolManager.mint(address(this), _poolKey.currency1.toId(), _amounts.specifiedTokenAmount);
        }
        return _calculateLiquidityDelta(
            _self,
            PoolAmounts({
                amount0: _poolManager.balanceOf(address(this), _poolKey.currency0.toId()),
                amount1: _poolManager.balanceOf(address(this), _poolKey.currency1.toId())
            }),
            amountToWithdraw,
            _amounts.unspecifiedTokenAmount,
            _singleSided
        );
    }

    //TODO: Add limit for the case when total assets is less than reserveAmount
    function _withdrawReserves(
        IBondHookHub.BondHookState storage _self,
        ERC4626 _vault,
        uint256 _amount,
        uint256 _reserveAmount,
        address _receiver,
        bool isToken0
    )
        internal
        returns (uint256 amountToWithdraw_)
    {
        // Only withdraw up to reserve amount, the remaining is generated income to be distributed among LPs
        amountToWithdraw_ = _reserveAmount.min(_amount);
        if (amountToWithdraw_ > 0) {
            _vault.withdraw(amountToWithdraw_, _receiver, address(this));
        }
        isToken0
            ? _self.reservesData.reserveAmount1 -= amountToWithdraw_
            : _self.reservesData.reserveAmount0 -= amountToWithdraw_;
    }

    /// @notice DCF model formula: 1 / (1 + r)^θ
    /// @notice First order Maclaurin approximation: 1 - r * θ
    function _calculateOpeningPrice(
        IBondHookHub.BondHookState storage _self,
        address _bond
    )
        internal
        returns (uint160)
    {
        IBond.BondDetailsData memory bondDetailsData = BondUSA(_bond).getBondDetails();
        uint256 daysToMaturity =
            (bondDetailsData.maturityDate - block.timestamp).mulDiv(DECIMAL_PRECISION, SECONDS_PER_YEAR);
        uint256 fairValue = bondDetailsData.nominalValue.mulDiv(
            DECIMAL_PRECISION - _self.priceDynamicParams.ytm.mulDiv(daysToMaturity, DECIMAL_PRECISION),
            DECIMAL_PRECISION
        );
        int256 blockPriceDelta =
            _self.priceDynamicParams.priceBottom.toInt256() - _self.priceDynamicParams.openingPrice.toInt256();

        int256 openingPrice = fairValue.toInt256()
            + _self.priceDynamicParams.marketDynamicSensitivity.toInt256() * (blockPriceDelta)
                / DECIMAL_PRECISION.toInt256();
        if (
            openingPrice
                < int256(
                    TickMath.MIN_SQRT_PRICE * DECIMAL_PRECISION / FixedPoint96.Q96 * TickMath.MIN_SQRT_PRICE
                        / FixedPoint96.Q96
                )
        ) revert IBondHookHub.PriceTooLow();
        if (
            openingPrice
                > int256(
                    TickMath.MAX_SQRT_PRICE / FixedPoint96.Q96 * TickMath.MAX_SQRT_PRICE / FixedPoint96.Q96
                        * DECIMAL_PRECISION
                )
        ) revert IBondHookHub.PriceTooHigh();

        // Market impact above noise threshold, we need to update the sensitivity
        if (_self.priceDynamicParams.deltaPriceThreshold < blockPriceDelta.abs()) {
            _self.priceDynamicParams.marketDynamicSensitivity = (
                (
                    _self.priceDynamicParams.marketDynamicSensitivity.toInt256()
                        + _self.priceDynamicParams.marketDynamicGamma.toInt256() * blockPriceDelta
                            / DECIMAL_PRECISION.toInt256()
                ).max(_self.priceDynamicParams.baseSensitivity.toInt256())
            ).toUint256().min(_self.priceDynamicParams.limitSensitivity);
        } else {
            // When the block just has noise, we reduce the sensitity by a constant amount per block until it goes
            // back to normal levels
            _self.priceDynamicParams.marketDynamicSensitivity = (
                (
                    _self.priceDynamicParams.marketDynamicSensitivity.toInt256()
                        - (
                            _self.priceDynamicParams.sensitivityDecayRate
                                * (block.number - _self.priceDynamicParams.lastBlockKick)
                        ).toInt256()
                ).max(_self.priceDynamicParams.baseSensitivity.toInt256())
            ).toUint256().min(_self.priceDynamicParams.limitSensitivity);
        }
        _self.priceDynamicParams.openingPrice = openingPrice.toUint256();
        return openingPrice.toUint256().sqrt().mulDiv(FixedPoint96.Q96, DECIMAL_PRECISION.sqrt()).toUint160();
    }

    function _calculateLiquidityDelta(
        IBondHookHub.BondHookState storage _self,
        PoolAmounts memory _poolAmounts,
        uint256 _amountToWithdraw,
        uint256 _unspecifiedTokenAmount,
        bool _singleSided
    )
        internal
        view
        returns (uint256)
    {
        uint256 liqudityDelta_ = (_poolAmounts.amount0 * _poolAmounts.amount1).sqrt() - _self.poolState.liquidity;
        // If the LP is single sided we subtract the part we deposited from our reserves
        if (_singleSided) {
            uint256 pctFilledWithReserve =
                _amountToWithdraw > 0 ? _amountToWithdraw.mulDiv(DECIMAL_PRECISION, _unspecifiedTokenAmount) : 0;
            liqudityDelta_ = liqudityDelta_.mulDiv(DECIMAL_PRECISION - pctFilledWithReserve / 2, DECIMAL_PRECISION)
                .mulDiv(_self.singleSidedIncentive, BPS); // Added premium for depositing idle funds
        }
        return liqudityDelta_;
    }
}
