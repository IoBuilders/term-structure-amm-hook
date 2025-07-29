// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.18;

import { PoolKey } from "@uniswap/v4-core/src/types/PoolKey.sol";
import { IBondHookHub } from "./interfaces/IBondHookHub.sol";
import { Factory } from "@hashgraph/ats/contracts/contracts/factory/Factory.sol";
import { IFactory } from "@hashgraph/ats/contracts/contracts/interfaces/factory/IFactory.sol";
import { FactoryRegulationData } from "@hashgraph/ats/contracts/contracts/layer_3/constants/regulation.sol";
import { TickMath } from "@uniswap/v4-core/src/libraries/TickMath.sol";
import { Currency } from "@uniswap/v4-core/src/types/Currency.sol";
import { FixedPoint96 } from "@uniswap/v4-core/src/libraries/FixedPoint96.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { SafeCast } from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import { DECIMAL_PRECISION } from "./constants/Constants.sol";
import { IHooks } from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import { BondUSA } from "@hashgraph/ats/contracts/contracts/layer_3/bondUSA/BondUSA.sol";
import { IBond } from "@hashgraph/ats/contracts/contracts/layer_2/interfaces/bond/IBond.sol";
import { BondHookLpToken } from "./BondHookLpToken.sol";
import { AccessControl } from "@hashgraph/ats/contracts/contracts/layer_1/accessControl/AccessControl.sol";
import { _DEFAULT_ADMIN_ROLE } from "@hashgraph/ats/contracts/contracts/layer_0/constants/roles.sol";
import { IBondHookIssuance } from "./interfaces/IBondHookIssuance.sol";
import { IImmutableState } from "@uniswap/v4-periphery/src/interfaces/IImmutableState.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice This is where the issuance of the bond and end of the subscription period take place
contract BondHookIssuance is IBondHookIssuance, Ownable {
    using Math for *;
    using SafeCast for *;

    /// @dev Factory used to deploy bonds
    Factory public factory;
    mapping(address => bool) public bondDeployedFromHook;
    mapping(address => uint256) public bondPrice;
    /// @dev ATS registers currencies as bytes3
    mapping(bytes3 => address) public codeToCurrency;
    IBondHookHub bondHookHub;

    modifier onlyBondAdmin(address _bond) {
        if (!AccessControl(_bond).hasRole(_DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert CallerIsNotBondAdmin();
        }
        _;
    }

    constructor(IBondHookHub _bondHookHub) {
        factory = new Factory();
        bondHookHub = _bondHookHub;
    }

    /// @inheritdoc IBondHookIssuance
    function setCurrencyCode(bytes3 _code, address _currency) external onlyOwner {
        codeToCurrency[_code] = _currency;
    }

    /// @inheritdoc IBondHookIssuance
    function deployBond(
        IFactory.BondData memory _bondData,
        FactoryRegulationData memory _factoryRegulationData
    )
        external
        returns (address)
    {
        address bond = factory.deployBond(_bondData, _factoryRegulationData);
        bondDeployedFromHook[bond] = true;
        return bond;
    }

    /// @inheritdoc IBondHookIssuance
    function concludeSubscription(address _bond, uint256 _allocatedPrice) external onlyBondAdmin(_bond) {
        if (!bondDeployedFromHook[_bond]) {
            revert BondNotDeployedFromHook(_bond);
        }

        IBond.BondDetailsData memory bondDetailsData = BondUSA(_bond).getBondDetails();

        if (bondDetailsData.startingDate > block.timestamp) {
            revert BondStartingDateInFuture(bondDetailsData.startingDate);
        }

        bondPrice[_bond] = _allocatedPrice;
    }

    /// @inheritdoc IBondHookIssuance
    function launchPool(
        address _bond,
        IBondHookHub.PoolConfigData memory _poolConfigData
    )
        external
        onlyBondAdmin(_bond)
    {
        if (!bondDeployedFromHook[_bond]) {
            revert BondNotDeployedFromHook(_bond);
        }
        if (bondPrice[_bond] == 0) {
            revert BondSubscriptionPeriodNotEnded();
        }

        Currency token0;
        Currency token1;

        IBond.BondDetailsData memory bondDetailsData = BondUSA(_bond).getBondDetails();
        address _denominatedCurrency = codeToCurrency[bondDetailsData.currency];
        uint160 sqrtPriceX96 = bondPrice[_bond].sqrt().mulDiv(FixedPoint96.Q96, DECIMAL_PRECISION.sqrt()).toUint160();

        _bond > _denominatedCurrency
            ? (token0, token1) = (Currency.wrap(_denominatedCurrency), Currency.wrap(_bond))
            : (token0, token1) = (Currency.wrap(_bond), Currency.wrap(_denominatedCurrency));

        PoolKey memory poolKey = PoolKey({
            tickSpacing: TickMath.MAX_TICK_SPACING,
            currency0: token0,
            currency1: token1,
            fee: 0,
            hooks: IHooks(address(bondHookHub))
        });

        IImmutableState(address(bondHookHub)).poolManager().initialize(poolKey, sqrtPriceX96);

        address poolLpToken = address(new BondHookLpToken("BondHookLpToken", "BHLT"));
        BondHookLpToken(poolLpToken).transferOwnership(address(bondHookHub));

        bondHookHub.setPoolState(poolKey, sqrtPriceX96, _poolConfigData, poolLpToken, _bond);
    }
}
