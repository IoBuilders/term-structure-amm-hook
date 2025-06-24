// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.18;

import { Slot0 } from "@uniswap/v4-core/src/types/Slot0.sol";
import { Pool } from "@uniswap/v4-core/src/libraries/Pool.sol";
import { Position } from "@uniswap/v4-core/src/libraries/Position.sol";
import { SwapParams } from "@uniswap/v4-core/src/types/PoolOperation.sol";
import { BeforeSwapDelta } from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import { PoolKey } from "@uniswap/v4-core/src/types/PoolKey.sol";
import { ERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import { PoolId } from "@uniswap/v4-core/src/types/PoolId.sol";

interface IBondHookHub {
    /// @notice The state of a pool
    struct BondHookState {
        Pool.State poolState;
        uint24 defaultFee;
        uint24 baseFee;
        uint256 blockTxIndex;
        uint24 feeDecayRate;
        uint256 singleSidedIncentive;
        PriceDynamicParams priceDynamicParams;
        ReservesData reservesData;
        address ytmOracle;
    }

    /// @notice Paramaters that dicate the pricing mechanics
    struct PriceDynamicParams {
        uint256 lastBlockKick;
        uint256 marketDynamicSensitivity;
        uint256 marketDynamicGamma;
        uint256 priceBottom;
        uint256 ytm;
        uint256 baseSensitivity;
        uint256 limitSensitivity;
        uint256 sensitivityDecayRate;
        uint256 openingPrice;
        uint256 deltaPriceThreshold;
    }

    /// @notice Strategies generating income from idle funds
    struct ReservesData {
        uint256 reserveAmount0;
        uint256 reserveAmount1;
        ERC4626 vault0;
        ERC4626 vault1;
    }

    /// @notice Information relevant for the hook about the bond
    struct BondDetails {
        address lpToken;
    }

    /// @notice Paramaters to add or remove liquidity
    struct ModifyLiqudityParams {
        bool add;
        AddLiqudityParams addParams;
        PoolKey poolKey;
        uint256 amount;
        address sender;
    }

    /// @notice Liquditiy addition specific parameters
    struct AddLiqudityParams {
        bool isToken0;
        bool singleSided;
    }

    /// @notice LPs specified token to provide and matching amount of pair token
    struct ModifyLiqudityAmounts {
        uint256 specifiedTokenAmount;
        uint256 unspecifiedTokenAmount;
    }

    /// @notice Pool state and pricing mechanics related data
    struct PoolConfigData {
        ERC4626 vault0;
        ERC4626 vault1;
        uint256 baseSensitivity;
        uint256 limitSensitivity;
        uint256 sensitivityDecayRate;
        uint256 deltaPriceThreshold;
        uint256 marketDynamicGamma;
        uint256 ytm;
        uint24 defaultFee;
        uint24 baseFee;
        uint24 feeDecayRate;
        uint256 singleSidedIncentive;
        address ytmOracle;
    }

    /// @notice Emitted when LPs deposit or remove liquidity
    event ModifiedLiquidity(address indexed sender, uint256 indexed liqudityDelta);

    /// @notice Thrown when attempting swaps or adding liqudity after expiration
    error BondMaturityDatePassed(uint256 maturityDate);

    /// @notice Thrown when attempting to empty vaults before expiration
    error CannotEmptyVaultsBeforeMaturity(uint256 maturityDate);

    /// @notice Thrown if a non-authorized party tries to update the YTM
    error CallerIsNotOracle();

    /// @notice Thrown if the account does not meet compliance checks
    error ComplianceCheckFailed();

    /// @notice Thrown when the hook adjustes the price below lower limit
    error PriceTooLow();

    /// @notice Thrown when the hook adjustes the price above upper limit
    error PriceTooHigh();

    /// @notice Thrown when the caller does not implement the IMsgSender interface
    error RouterNotAllowed();

    /// @notice Thrown when caller is not issuance module
    error NotIssuance();

    /// @notice Sets the address of the issuance module
    /// @param _issuance Address of the module
    function setIssuance(address _issuance) external;

    /// @notice Configures the pool and initializes it
    /// @param _poolKey Address of the module
    /// @param _sqrtPriceX96 Initial price
    /// @param _poolConfigData Information about the pool mechanics
    /// @param _lpToken Address of the LP token
    /// @param _bond Address of the bond
    function setPoolState(
        PoolKey memory _poolKey,
        uint160 _sqrtPriceX96,
        PoolConfigData memory _poolConfigData,
        address _lpToken,
        address _bond
    )
        external;

    /// @notice Used to provide or remove liquidity
    /// @param _params Infomation about the liquditiy provision
    function modifyLiquidity(ModifyLiqudityParams memory _params) external;

    /// @notice Distributed yield earned from idle funds in the vaults among LPs
    /// @param _poolKey Key of the pool
    function distributeYieldFarmingRewards(PoolKey calldata _poolKey) external;

    /// @notice Finalizes rewards distribution once the bond expires
    /// @param _poolKey Key of the pool
    function emptyVaults(PoolKey calldata _poolKey) external;

    /// @notice Called by the oracle to peridically update the yield of a bond
    /// @dev We use EigenLayer AVS
    /// @param _poolId Id of the pool whose bond yield is updated
    /// @param _ytm Updated yield
    function updateBondYtm(bytes32 _poolId, uint256 _ytm) external;

    /// @notice Queries the configuration of a pool
    /// @param _poolId Id of the pool
    function getBondHookConfigData(PoolId _poolId) external view returns (PoolConfigData memory poolConfigData_);
    function getPoolInternalState(PoolId _poolId)
        external
        view
        returns (
            uint256 feeGrowthGlobal0X128_,
            uint256 feeGrowthGlobal1X128_,
            uint160 sqrtPriceX96_,
            uint24 lpFee_,
            uint128 liquidity_
        );

    /// @notice Queries the pricing mechanic sensitivity
    /// @param _poolId Id of the pool
    function getSenstivity(PoolId _poolId) external view returns (uint256);

    /// @notice Queries the reserves in the vaults
    /// @param _poolId Id of the pool
    function getReserveAmounts(PoolId _poolId) external view returns (uint256, uint256);
}
