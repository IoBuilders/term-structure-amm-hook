// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.18;

import { BaseHook } from "@uniswap/v4-periphery/src/utils/BaseHook.sol";
import { Hooks } from "@uniswap/v4-core/src/libraries/Hooks.sol";
import { IPoolManager } from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import { PoolKey } from "@uniswap/v4-core/src/types/PoolKey.sol";
import { PoolId } from "@uniswap/v4-core/src/types/PoolId.sol";
import { SwapParams } from "@uniswap/v4-core/src/types/PoolOperation.sol";
import { BeforeSwapDelta } from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import { BondHookLogic } from "./libraries/BondHookLogic.sol";
import { IBondHookHub } from "./interfaces/IBondHookHub.sol";
import { BalanceDelta } from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import { Currency } from "@uniswap/v4-core/src/types/Currency.sol";
import { FixedPoint96 } from "@uniswap/v4-core/src/libraries/FixedPoint96.sol";
import { FixedPoint128 } from "@uniswap/v4-core/src/libraries/FixedPoint128.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { SafeCast } from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import { DECIMAL_PRECISION } from "./constants/Constants.sol";
import { IHooks } from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import { BondUSA } from "@hashgraph/ats/contracts/contracts/layer_3/bondUSA/BondUSA.sol";
import { IBond } from "@hashgraph/ats/contracts/contracts/layer_2/interfaces/bond/IBond.sol";
import { ERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import { BondHookLpToken } from "./BondHookLpToken.sol";
import { AccessControl } from "@hashgraph/ats/contracts/contracts/layer_1/accessControl/AccessControl.sol";
import { _DEFAULT_ADMIN_ROLE } from "@hashgraph/ats/contracts/contracts/layer_0/constants/roles.sol";
import { StateLibrary } from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import { ERC1594 } from "@hashgraph/ats/contracts/contracts/layer_1/ERC1400/ERC1594/ERC1594.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ControlList } from "@hashgraph/ats/contracts/contracts/layer_1/controlList/ControlList.sol";
import { IUnlockCallback } from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import { StateLibrary as BondStateLibrary } from "./libraries/StateLibrary.sol";
import { IMsgSender } from "./interfaces/IMsgSender.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice It acts as the place to provide liquidity to the pools and as the hook
/// @notice Once the issuance module launches the pool, the secondary market is open for trading
contract BondHookHub is IUnlockCallback, IBondHookHub, Ownable, BaseHook {
    using BondHookLogic for BondHookState;
    using Math for *;
    using SafeCast for *;
    using StateLibrary for IPoolManager;
    using BondStateLibrary for *;

    // Bond's attached pool internal state
    mapping(PoolId => BondHookState) private bondHookState;
    mapping(address => BondDetails) public bondDetails;
    mapping(PoolId => address) public poolToBond;
    address issuance;

    constructor(IPoolManager _poolManager, address _owner) BaseHook(_poolManager) {
        _transferOwnership(_owner);
    }

    /// @inheritdoc IBondHookHub
    function setIssuance(address _issuance) external onlyOwner {
        issuance = _issuance;
    }

    /// @inheritdoc IBondHookHub
    function setPoolState(
        PoolKey memory _poolKey,
        uint160 _sqrtPriceX96,
        PoolConfigData memory _poolConfigData,
        address _lpToken,
        address _bond
    )
        external
    {
        if (msg.sender != issuance) revert CallerNotIssuance();
        bondHookState[_poolKey.toId()].poolState.slot0 =
            bondHookState[_poolKey.toId()].poolState.slot0.setSqrtPriceX96(_sqrtPriceX96);
        _configureLaunchedPool(bondHookState[_poolKey.toId()], _poolConfigData);
        bondDetails[_bond].lpToken = _lpToken;
        poolToBond[_poolKey.toId()] = _bond;
        bondHookState[_poolKey.toId()].priceDynamicParams.openingPrice =
            _sqrtPriceX96.mulDiv(_sqrtPriceX96, FixedPoint96.Q96).mulDiv(DECIMAL_PRECISION, FixedPoint96.Q96);
    }

    /// @inheritdoc IBondHookHub
    function modifyLiquidity(ModifyLiqudityParams memory _params) external {
        _params.sender = msg.sender;
        poolManager.unlock(abi.encode(_params));
    }

    /// @inheritdoc IUnlockCallback
    function unlockCallback(bytes calldata _data) external returns (bytes memory) {
        if (msg.sender != address(poolManager)) revert CallerNotRouter();
        ModifyLiqudityParams memory params = abi.decode(_data, (ModifyLiqudityParams));

        if (!params.add) {
            _removeLiqudiity(params);
        } else {
            _addLiquidity(params);
        }
        bondHookState[params.poolKey.toId()].poolState.liquidity = (
            (
                poolManager.balanceOf(address(this), params.poolKey.currency0.toId())
                    * poolManager.balanceOf(address(this), params.poolKey.currency1.toId())
            ).sqrt()
        ).toUint128();
    }

    /// @inheritdoc IBondHookHub
    // TODO: Consider JIT LPs frontrunning
    function distributeYieldFarmingRewards(PoolKey calldata _poolKey) external {
        BondHookState storage state = bondHookState[_poolKey.toId()];
        ERC4626 vault0 = state.reservesData.vault0;
        ERC4626 vault1 = state.reservesData.vault1;
        uint256 income0 = vault0.convertToAssets(vault0.balanceOf(address(this))) - state.reservesData.reserveAmount0;
        uint256 income1 = vault1.convertToAssets(vault1.balanceOf(address(this))) - state.reservesData.reserveAmount1;
        uint256 liquidity = state.poolState.liquidity;

        if (income0 > 0) {
            vault0.withdraw(income0, address(this), address(this));
        }

        if (income1 > 0) {
            vault1.withdraw(income1, address(this), address(this));
        }
        state.poolState.feeGrowthGlobal0X128 += income0.mulDiv(FixedPoint128.Q128, liquidity);
        state.poolState.feeGrowthGlobal1X128 += income1.mulDiv(FixedPoint128.Q128, liquidity);
    }

    /// @inheritdoc IBondHookHub
    function emptyVaults(PoolKey calldata _poolKey) external {
        BondHookState storage state = bondHookState[_poolKey.toId()];
        ERC4626 vault0 = state.reservesData.vault0;
        ERC4626 vault1 = state.reservesData.vault1;

        uint256 reserveAmount0 = state.reservesData.reserveAmount0;
        uint256 reserveAmount1 = state.reservesData.reserveAmount1;

        address bond = poolToBond[_poolKey.toId()];

        IBond.BondDetailsData memory bondDetailsData = BondUSA(bond).getBondDetails();

        uint256 totalAssets0 = vault0.convertToAssets(vault0.balanceOf(address(this)));
        uint256 totalAssets1 = vault1.convertToAssets(vault1.balanceOf(address(this)));

        if (bondDetailsData.maturityDate > block.timestamp) {
            revert CannotEmptyVaultsBeforeMaturity(bondDetailsData.maturityDate);
        }

        if (reserveAmount0 > 0) {
            vault0.withdraw(totalAssets0, address(this), address(this));
            state.reservesData.reserveAmount0 = 0;
        }

        if (reserveAmount1 > 0) {
            vault1.withdraw(totalAssets1, address(this), address(this));
            state.reservesData.reserveAmount1 = 0;
        }

        uint256 liquidity = bondHookState[_poolKey.toId()].poolState.liquidity;
        state.poolState.feeGrowthGlobal0X128 += totalAssets0.mulDiv(FixedPoint128.Q128, liquidity);
        state.poolState.feeGrowthGlobal1X128 += totalAssets1.mulDiv(FixedPoint128.Q128, liquidity);
    }

    /// @inheritdoc IBondHookHub
    function updateBondYtm(bytes32 _poolId, uint256 _ytm) external {
        if (msg.sender != bondHookState[PoolId.wrap(_poolId)].ytmOracle) {
            revert CallerIsNotOracle();
        }
        bondHookState[PoolId.wrap(_poolId)].priceDynamicParams.ytm = _ytm;
    }

    /// @inheritdoc IBondHookHub
    function getBondHookConfigData(PoolId _poolId) external view returns (PoolConfigData memory poolConfigData_) {
        return bondHookState[_poolId].getBondHookConfigData();
    }

    /// @inheritdoc IBondHookHub
    function getPoolInternalState(PoolId _poolId)
        external
        view
        returns (
            uint256 feeGrowthGlobal0X128_,
            uint256 feeGrowthGlobal1X128_,
            uint160 sqrtPriceX96_,
            uint24 lpFee_,
            uint128 liquidity_
        )
    {
        return bondHookState[_poolId].poolState.getPoolInternalState();
    }

    /// @inheritdoc IBondHookHub
    function getSenstivity(PoolId _poolId) external view returns (uint256) {
        return bondHookState[_poolId].getSentivity();
    }

    /// @inheritdoc IBondHookHub
    function getReserveAmounts(PoolId _poolId) external view returns (uint256, uint256) {
        return bondHookState[_poolId].getReserveAmounts();
    }

    /// @inheritdoc BaseHook
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: false,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: true,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    function _configureLaunchedPool(BondHookState storage _state, PoolConfigData memory _poolConfig) internal {
        _state.reservesData.vault0 = _poolConfig.vault0;
        _state.reservesData.vault1 = _poolConfig.vault1;
        _state.priceDynamicParams.marketDynamicGamma = _poolConfig.marketDynamicGamma;
        _state.priceDynamicParams.ytm = _poolConfig.ytm;
        _state.priceDynamicParams.baseSensitivity = _poolConfig.baseSensitivity;
        _state.priceDynamicParams.limitSensitivity = _poolConfig.limitSensitivity;
        _state.priceDynamicParams.sensitivityDecayRate = _poolConfig.sensitivityDecayRate;
        _state.priceDynamicParams.deltaPriceThreshold = _poolConfig.deltaPriceThreshold;
        _state.ytmOracle = _poolConfig.ytmOracle;
        _state.feeDecayRate = _poolConfig.feeDecayRate;
        _state.baseFee = _poolConfig.baseFee;
        _state.defaultFee = _poolConfig.defaultFee;
        _state.singleSidedIncentive = _poolConfig.singleSidedIncentive;
    }

    /// @dev We store all the pool tokens in the pool manager
    function _beforeSwap(
        address _sender,
        PoolKey calldata _poolKey,
        SwapParams calldata _params,
        bytes calldata
    )
        internal
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        PoolId poolId = _poolKey.toId();

        _checkBondMaturityDate(poolToBond[poolId]);

        address bond = poolToBond[poolId];

        address swapper;

        try IMsgSender(_sender).msgSender() returns (address swapper_) {
            swapper = swapper_;
        } catch {
            revert RouterNotAllowed();
        }

        _checkCompliance(bond, swapper);

        (BeforeSwapDelta beforeSwapDelta, BalanceDelta balanceDelta) =
            bondHookState[poolId].beforeSwap(_params, _poolKey, bond, poolManager);

        // Exact in, the router owes the pool, the pool owes us
        if (_params.amountSpecified < 0) {
            if (_params.zeroForOne) {
                poolManager.sync(_poolKey.currency0);
                ERC20(Currency.unwrap(_poolKey.currency0)).transferFrom(
                    swapper, address(poolManager), (-balanceDelta.amount0()).toUint256()
                );
                poolManager.settleFor(_sender);
                poolManager.mint(address(this), (_poolKey.currency0).toId(), (-balanceDelta.amount0()).toUint256());
                poolManager.take(_poolKey.currency1, _sender, balanceDelta.amount1().toUint256());
                poolManager.burn(address(this), _poolKey.currency1.toId(), balanceDelta.amount1().toUint256());
            } else {
                poolManager.sync(_poolKey.currency1);
                ERC20(Currency.unwrap(_poolKey.currency1)).transferFrom(
                    swapper, address(poolManager), (-balanceDelta.amount1()).toUint256()
                );
                poolManager.settleFor(_sender);
                poolManager.mint(address(this), (_poolKey.currency1).toId(), (-balanceDelta.amount1()).toUint256());
                poolManager.take(_poolKey.currency0, _sender, balanceDelta.amount0().toUint256());
                poolManager.burn(address(this), _poolKey.currency0.toId(), balanceDelta.amount0().toUint256());
            }
        } else {
            // We owe the pool, the pool owes the router
            if (_params.zeroForOne) {
                poolManager.burn(address(this), _poolKey.currency1.toId(), balanceDelta.amount1().toUint256());
                poolManager.mint(address(this), _poolKey.currency0.toId(), (-balanceDelta.amount0()).toUint256());
                poolManager.sync(_poolKey.currency0);
                ERC20(Currency.unwrap(_poolKey.currency0)).transferFrom(
                    swapper, address(poolManager), (-balanceDelta.amount0()).toUint256()
                );
                poolManager.settle();
            } else {
                poolManager.burn(address(this), _poolKey.currency0.toId(), balanceDelta.amount0().toUint256());
                poolManager.mint(address(this), _poolKey.currency1.toId(), (-balanceDelta.amount1()).toUint256());
                poolManager.sync(_poolKey.currency1);
                ERC20(Currency.unwrap(_poolKey.currency1)).transferFrom(
                    swapper, address(poolManager), (-balanceDelta.amount1()).toUint256()
                );
                poolManager.settle();
            }
        }

        return (IHooks.beforeSwap.selector, beforeSwapDelta, uint24(0));
    }

    function _removeLiqudiity(ModifyLiqudityParams memory _params) internal {
        address bond = poolToBond[_params.poolKey.toId()];
        _checkCompliance(bond, _params.sender);

        BondHookLpToken lpToken = BondHookLpToken(bondDetails[bond].lpToken);
        (uint256 feeGrowthInside0X128, uint256 feeGrowthInside1X128,,,) =
            bondHookState[_params.poolKey.toId()].poolState.getPoolInternalState();

        bondHookState[_params.poolKey.toId()].removeLiqudity(
            _params.amount, poolManager, _params.sender, _params.poolKey, lpToken
        );

        (uint256 feesOwed0, uint256 feesOwed1) = lpToken.burn(
            _params.sender,
            _params.amount,
            feeGrowthInside0X128,
            feeGrowthInside1X128,
            bondHookState[_params.poolKey.toId()].poolState.liquidity
        );
        if (feesOwed0 > 0) {
            poolManager.burn(address(this), _params.poolKey.currency0.toId(), feesOwed0);
            poolManager.take(_params.poolKey.currency0, _params.sender, feesOwed0);
        }
        if (feesOwed1 > 0) {
            poolManager.burn(address(this), _params.poolKey.currency1.toId(), feesOwed1);
            poolManager.take(_params.poolKey.currency1, _params.sender, feesOwed1);
        }

        emit ModifiedLiquidity(_params.sender, _params.amount);
    }

    function _addLiquidity(ModifyLiqudityParams memory _params) internal {
        PoolId poolId = _params.poolKey.toId();

        address bond = poolToBond[poolId];
        _checkCompliance(bond, _params.sender);

        BondHookLpToken lpToken = BondHookLpToken(bondDetails[bond].lpToken);
        (uint256 feeGrowthInside0X128, uint256 feeGrowthInside1X128,,,) =
            bondHookState[poolId].poolState.getPoolInternalState();

        // After expiration only liqudity removals are supported
        _checkBondMaturityDate(poolToBond[poolId]);

        // LP specifies an amount to provide in the desired token and we match it against the pair
        uint256 unspecifiedTokenAmount = _getUnspecifiedAmount(_params);

        uint256 liqudityDelta = bondHookState[poolId].addLiquidity(
            _params.addParams.singleSided,
            _params.addParams.isToken0,
            ModifyLiqudityAmounts({
                specifiedTokenAmount: _params.amount,
                unspecifiedTokenAmount: unspecifiedTokenAmount
            }),
            poolManager,
            _params.sender,
            _params.poolKey
        );

        lpToken.mint(
            _params.sender,
            liqudityDelta,
            feeGrowthInside0X128,
            feeGrowthInside1X128,
            bondHookState[poolId].poolState.liquidity
        );

        emit ModifiedLiquidity(_params.sender, liqudityDelta);
    }

    function _getUnspecifiedAmount(ModifyLiqudityParams memory _params)
        internal
        view
        returns (uint256 unspecifiedTokenAmount_)
    {
        uint160 sqrtPriceX96 = bondHookState[_params.poolKey.toId()].poolState.slot0.sqrtPriceX96();
        unspecifiedTokenAmount_ = _params.addParams.isToken0
            ? _params.amount.mulDiv(sqrtPriceX96, FixedPoint96.Q96).mulDiv(sqrtPriceX96, FixedPoint96.Q96)
            : _params.amount.mulDiv(FixedPoint96.Q96, sqrtPriceX96).mulDiv(FixedPoint96.Q96, sqrtPriceX96);
    }

    function _checkBondMaturityDate(address _bond) internal view {
        IBond.BondDetailsData memory bondDetailsData = BondUSA(_bond).getBondDetails();
        if (bondDetailsData.maturityDate < block.timestamp) {
            revert BondMaturityDatePassed(bondDetailsData.maturityDate);
        }
    }

    /// @notice Only permissioned users can interact with the pool
    /// @notice Control list is managed using Circle's compliance engine
    function _checkCompliance(address _bond, address _sender) internal view {
        if (!ControlList(_bond).getControlListType() == ControlList(_bond).isInControlList(_sender)) {
            revert ComplianceCheckFailed();
        }
    }
}