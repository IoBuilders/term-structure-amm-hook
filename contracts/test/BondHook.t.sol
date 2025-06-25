// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.18;

import { Test } from "forge-std/Test.sol";
import { console2 } from "forge-std/Test.sol";
import { stdJson } from "forge-std/StdJson.sol";
import { BondHookHub, IBondHookHub } from "../src/BondHookHub.sol";
import { Hooks } from "@uniswap/v4-core/src/libraries/Hooks.sol";
import { IFactory } from "@hashgraph/ats/contracts/contracts/interfaces/factory/IFactory.sol";
import { IBusinessLogicResolver } from
    "@hashgraph/ats/contracts/contracts/interfaces/resolver/IBusinessLogicResolver.sol";
import { IResolverProxy } from
    "@hashgraph/ats/contracts/contracts/interfaces/resolver/resolverProxy/IResolverProxy.sol";
import { _DEFAULT_ADMIN_ROLE, _ISSUER_ROLE } from "@hashgraph/ats/contracts/contracts/layer_1/constants/roles.sol";
import { IBond } from "@hashgraph/ats/contracts/contracts/layer_2/interfaces/bond/IBond.sol";
import { DECIMAL_PRECISION, SECONDS_PER_YEAR, DUST_THRESHOLD } from "../src/constants/Constants.sol";
import {
    FactoryRegulationData,
    RegulationType,
    RegulationSubType
} from "@hashgraph/ats/contracts/contracts/layer_3/constants/regulation.sol";
import { BondUSA } from "@hashgraph/ats/contracts/contracts/layer_3/bondUSA/BondUSA.sol";
import { ISecurity } from "@hashgraph/ats/contracts/contracts/layer_3/interfaces/ISecurity.sol";
import { AccessControl } from "@hashgraph/ats/contracts/contracts/layer_1/accessControl/AccessControl.sol";
import { DiamondCutFacet } from "@hashgraph/ats/contracts/contracts/resolver/resolverProxy/facets/DiamondCutFacet.sol";
import { ERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { MockERC4626 } from "./mock/MockERC4626.sol";
import { PoolManager } from "@uniswap/v4-core/src/PoolManager.sol";
import { StateLibrary } from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import { FixedPoint96 } from "@uniswap/v4-core/src/libraries/FixedPoint96.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { SafeCast } from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import { PoolKey } from "@uniswap/v4-core/src/types/PoolKey.sol";
import { Currency } from "@uniswap/v4-core/src/types/Currency.sol";
import { IHooks } from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import { ERC1594 } from "@hashgraph/ats/contracts/contracts/layer_1/ERC1400/ERC1594/ERC1594.sol";
import { SwapParams } from "@uniswap/v4-core/src/types/PoolOperation.sol";
import { TickMath } from "@uniswap/v4-core/src/libraries/TickMath.sol";
import { IUnlockCallback } from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import { FixedPoint128 } from "@uniswap/v4-core/src/libraries/FixedPoint128.sol";
import { BalanceDelta } from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import { IMsgSender } from "../src/interfaces/IMsgSender.sol";
import { SignedMath } from "@openzeppelin/contracts/utils/math/SignedMath.sol";
import { BondHookIssuance, IBondHookIssuance } from "../src/BondHookIssuance.sol";

contract BondHookDeployer is IUnlockCallback, IMsgSender, Test {
    using StateLibrary for PoolManager;
    using Math for *;
    using SafeCast for *;
    using SignedMath for int256;

    bytes32 constant BOND_CONFIG_ID = 0x0000000000000000000000000000000000000000000000000000000000000002;
    uint256 constant STARTING_DATE_OFFSET = 1 days;
    uint256 constant EXPIRATION_DATE_OFFSET = 2 days;
    string constant ISIN = "US0378331005";
    uint8 constant DECIMALS = 18;
    string constant BOND_NAME = "UHI5BOND";
    string constant BOND_SYMBOL = "UB";
    uint256 constant BPS = 10_000;
    uint256 internal constant PIPS_DENOMINATOR = 1_000_000;
    uint256 constant INITIAL_YTM = DECIMAL_PRECISION * 300 / BPS; // 3%

    // Anvil state
    address private deployer;
    address businessLogicResolverProxy;
    BondHookHub bondHookHub;
    uint256 anvilFork;

    // Bond
    IFactory.BondData bondData;
    FactoryRegulationData factoryRegulationData;
    address bond;
    BondHookIssuance bondHookIssuance;

    // Pool
    address investor;
    address swapper;
    address oracle;
    IBondHookHub.PoolConfigData configData;
    ERC20 eur;
    PoolManager manager;
    PoolKey poolKey;

    function setUp() public virtual {
        // Fork
        anvilFork = vm.createFork(vm.envString("LOCAL_RPC_URL"));
        vm.selectFork(anvilFork);
        // Set up actors
        deployer = vm.rememberKey(vm.envUint("PRIVATE_KEY_ADMIN"));
        vm.label(deployer, "Deployer");
        investor = makeAddr("investor");
        vm.label(investor, "Investor");
        oracle = makeAddr("oracle");
        vm.label(oracle, "Oracle Service Manager");
        swapper = address(this);
        vm.label(swapper, "Swapper");
        // Set up pool contracts and data
        businessLogicResolverProxy = _readBlrDeployment();
        bondHookHub =
            BondHookHub(payable(address(uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG))));
        vm.startPrank(deployer);
        manager = new PoolManager(deployer);
        deployCodeTo("BondHookHub", abi.encode(manager, deployer), address(bondHookHub));
        _setBondDeploymentData();
        bondHookIssuance = new BondHookIssuance(bondHookHub);
        bond = bondHookIssuance.deployBond(bondData, factoryRegulationData);
        eur = ERC20(address(type(uint160).max)); // Make sure eur is always token 1
        assertGt(uint256(uint160(address(eur))), uint256(uint160(bond)));
        deployCodeTo("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", abi.encode("Euro", "EUR"), address(eur));
        bondHookIssuance.setCurrencyCode(bytes3("EUR"), address(eur));
        bondHookHub.setIssuance(address(bondHookIssuance));
        _congifurePoolState();
        vm.stopPrank();
        poolKey = PoolKey({
            tickSpacing: TickMath.MAX_TICK_SPACING,
            currency0: Currency.wrap(bond),
            currency1: Currency.wrap(address(eur)),
            fee: 0,
            hooks: IHooks(address(bondHookHub))
        });
    }

    function test_deployBond() external view {
        assertEq(abi.encode(BondUSA(bond).getBondDetails()), abi.encode(bondData.bondDetails));
        assertEq(
            uint8(ISecurity(bond).getSecurityRegulationData().regulationData.regulationType),
            uint8(factoryRegulationData.regulationType)
        );
        assertEq(
            uint8(ISecurity(bond).getSecurityRegulationData().regulationData.regulationSubType),
            uint8(factoryRegulationData.regulationSubType)
        );
        (address blrProxy, bytes32 configId, uint256 version) = DiamondCutFacet(bond).getConfigInfo();
        assertEq(blrProxy, businessLogicResolverProxy);
        assertEq(configId, bondData.security.resolverProxyConfiguration.key);
        assertEq(version, bondData.security.resolverProxyConfiguration.version);
        assertTrue(AccessControl(bond).hasRole(_DEFAULT_ADMIN_ROLE, deployer));
        assertTrue(AccessControl(bond).hasRole(_ISSUER_ROLE, deployer));
        assertTrue(bondHookIssuance.bondDeployedFromHook(bond));
    }

    function test_concludeSubscription() external {
        vm.prank(investor);
        vm.expectRevert(bytes("CallerIsNotBondAdmin()"));
        bondHookIssuance.concludeSubscription(bond, 0);
        vm.startPrank(deployer);
        address bondNotDeployedFromHook = bondHookIssuance.factory().deployBond(bondData, factoryRegulationData);
        vm.expectRevert(
            bytes(abi.encodeWithSelector(IBondHookIssuance.BondNotDeployedFromHook.selector, bondNotDeployedFromHook))
        );
        bondHookIssuance.concludeSubscription(bondNotDeployedFromHook, 0);
        vm.expectRevert(
            bytes(
                abi.encodeWithSelector(
                    IBondHookIssuance.BondStartingDateInFuture.selector, bondData.bondDetails.startingDate
                )
            )
        );
        bondHookIssuance.concludeSubscription(bond, 0);
        uint256 allocatedPrice = BondUSA(bond).getBondDetails().nominalValue.mulDiv(
            (
                DECIMAL_PRECISION
                    - INITIAL_YTM.mulDiv(BondUSA(bond).getBondDetails().maturityDate - block.timestamp, SECONDS_PER_YEAR)
            ),
            DECIMAL_PRECISION
        );
        vm.warp(bondData.bondDetails.startingDate);
        bondHookIssuance.concludeSubscription(bond, allocatedPrice);
        uint256 price = bondHookIssuance.bondPrice(bond);
        assertEq(price, allocatedPrice);
    }

    function test_launchPool() external {
        vm.prank(investor);
        vm.expectRevert(bytes("CallerIsNotBondAdmin()"));
        bondHookIssuance.launchPool(bond, configData);
        vm.startPrank(deployer);
        address bondNotDeployedFromHook = bondHookIssuance.factory().deployBond(bondData, factoryRegulationData);
        vm.expectRevert(
            bytes(abi.encodeWithSelector(IBondHookIssuance.BondNotDeployedFromHook.selector, bondNotDeployedFromHook))
        );
        bondHookIssuance.launchPool(bondNotDeployedFromHook, configData);
        vm.expectRevert(bytes("BondSubscriptionPeriodNotEnded()"));
        bondHookIssuance.launchPool(bond, configData);
        uint256 allocatedPrice =
            BondUSA(bond).getBondDetails().nominalValue * (DECIMAL_PRECISION - INITIAL_YTM) / DECIMAL_PRECISION;
        vm.warp(bondData.bondDetails.startingDate);
        bondHookIssuance.concludeSubscription(bond, allocatedPrice);
        bondHookIssuance.launchPool(bond, configData);
        address lpToken = bondHookHub.bondDetails(bond);
        assertEq(ERC20(lpToken).name(), "BondHookLpToken");
        assertEq(ERC20(lpToken).symbol(), "BHLT");
        (uint160 sqrtPriceX96,,,) = manager.getSlot0(poolKey.toId());
        assertEq(sqrtPriceX96, allocatedPrice.sqrt().mulDiv(FixedPoint96.Q96, DECIMAL_PRECISION.sqrt()).toUint160());
        assertEq(bondHookHub.poolToBond(poolKey.toId()), bond);
    }

    // Standard liqudity provision

    function test_add_liquditiy_normal_token0() external {
        vm.startPrank(deployer);
        uint256 allocatedPrice =
            BondUSA(bond).getBondDetails().nominalValue * (DECIMAL_PRECISION - INITIAL_YTM) / DECIMAL_PRECISION;
        vm.warp(bondData.bondDetails.startingDate);
        bondHookIssuance.concludeSubscription(bond, allocatedPrice);
        bondHookIssuance.launchPool(bond, configData);
        vm.stopPrank();
        address lpToken = bondHookHub.bondDetails(bond);
        uint256 bondLiqudity = 1000 * DECIMAL_PRECISION;
        IBondHookHub.AddLiqudityParams memory addParams =
            IBondHookHub.AddLiqudityParams({ isToken0: true, singleSided: false });
        IBondHookHub.ModifyLiqudityParams memory params = IBondHookHub.ModifyLiqudityParams({
            add: true,
            addParams: addParams,
            poolKey: poolKey,
            amount: bondLiqudity,
            sender: address(0)
        });
        uint256 eurLiqudity = bondLiqudity * allocatedPrice / DECIMAL_PRECISION;
        uint256 liqudityDelta = (eurLiqudity * bondLiqudity).sqrt();
        vm.prank(deployer);
        ERC1594(bond).issue(investor, bondLiqudity, "");
        vm.startPrank(investor);
        deal(address(eur), investor, eurLiqudity);
        ERC20(bond).approve(address(bondHookHub), bondLiqudity);
        eur.approve(address(bondHookHub), eurLiqudity);
        bondHookHub.modifyLiquidity(params);
        assertApproxEqRel(ERC20(lpToken).balanceOf(investor), liqudityDelta, DECIMAL_PRECISION / 1000);
        // accuracy
        // precision
        assertEq(ERC20(bond).balanceOf(investor), 0);
        assertLt(eur.balanceOf(investor), eurLiqudity / 1000);
        (,,,, uint256 liqudity) = bondHookHub.getPoolInternalState(poolKey.toId());
        assertApproxEqRel(liqudity, liqudityDelta, DECIMAL_PRECISION / 1000);
        assertEq(manager.balanceOf(address(bondHookHub), poolKey.currency0.toId()), bondLiqudity);
        assertApproxEqRel(
            manager.balanceOf(address(bondHookHub), poolKey.currency1.toId()), eurLiqudity, DECIMAL_PRECISION / 1000
        );
        (,, uint160 sqrtPriceX96,,) = bondHookHub.getPoolInternalState(poolKey.toId());
        assertApproxEqRel(
            allocatedPrice,
            sqrtPriceX96 * DECIMAL_PRECISION / FixedPoint96.Q96 * sqrtPriceX96 / FixedPoint96.Q96,
            DECIMAL_PRECISION / 1000
        );
    }

    function test_add_liquditiy_normal_token1() external {
        vm.startPrank(deployer);
        uint256 allocatedPrice =
            BondUSA(bond).getBondDetails().nominalValue * (DECIMAL_PRECISION - INITIAL_YTM) / DECIMAL_PRECISION;
        vm.warp(bondData.bondDetails.startingDate);
        bondHookIssuance.concludeSubscription(bond, allocatedPrice);
        bondHookIssuance.launchPool(bond, configData);
        vm.stopPrank();
        address lpToken = bondHookHub.bondDetails(bond);
        uint256 eurLiquidity = 1000 * DECIMAL_PRECISION;
        IBondHookHub.AddLiqudityParams memory addParams =
            IBondHookHub.AddLiqudityParams({ isToken0: false, singleSided: false });
        IBondHookHub.ModifyLiqudityParams memory params = IBondHookHub.ModifyLiqudityParams({
            add: true,
            addParams: addParams,
            poolKey: poolKey,
            amount: eurLiquidity,
            sender: address(0)
        });
        uint256 bondLiqudity = eurLiquidity * DECIMAL_PRECISION / allocatedPrice * 10_010 / BPS; // Extra 1% for
            // decimal precision loss
        uint256 liqudityDelta = (eurLiquidity * bondLiqudity).sqrt();
        vm.prank(deployer);
        ERC1594(bond).issue(investor, bondLiqudity, "");
        vm.startPrank(investor);
        deal(address(eur), investor, eurLiquidity);
        ERC20(bond).approve(address(bondHookHub), bondLiqudity);
        eur.approve(address(bondHookHub), eurLiquidity);
        bondHookHub.modifyLiquidity(params);
        assertApproxEqRel(ERC20(lpToken).balanceOf(investor), liqudityDelta, DECIMAL_PRECISION / 1000);
        // precision
        assertEq(eur.balanceOf(investor), 0);
        assertLt(ERC20(bond).balanceOf(investor), bondLiqudity / 1000); // max dust is 0.1% of the minted liquidity
        (,,,, uint256 liqudity) = bondHookHub.getPoolInternalState(poolKey.toId());
        assertApproxEqRel(liqudity, liqudityDelta, DECIMAL_PRECISION / 1000);
        assertEq(manager.balanceOf(address(bondHookHub), poolKey.currency1.toId()), eurLiquidity);
        assertApproxEqRel(
            manager.balanceOf(address(bondHookHub), poolKey.currency1.toId()), eurLiquidity, DECIMAL_PRECISION / 1000
        );
        (,, uint160 sqrtPriceX96,,) = bondHookHub.getPoolInternalState(poolKey.toId());
        assertApproxEqRel(
            allocatedPrice,
            sqrtPriceX96 * DECIMAL_PRECISION / FixedPoint96.Q96 * sqrtPriceX96 / FixedPoint96.Q96,
            DECIMAL_PRECISION / 1000
        );
    }

    // Swaps

    function test_swap_bond_for_eur_exact_in() external {
        _bootstrapPool();
        (,,,, uint256 liquidityBefore) = bondHookHub.getPoolInternalState(poolKey.toId());
        uint256 poolBalance0 = manager.balanceOf(address(bondHookHub), poolKey.currency0.toId());
        uint256 poolBalance1 = manager.balanceOf(address(bondHookHub), poolKey.currency1.toId());
        uint256 bondsToSwap = 100 * DECIMAL_PRECISION;
        uint256 eurToReceive = (PIPS_DENOMINATOR - configData.defaultFee) * bondsToSwap * poolBalance1
            / PIPS_DENOMINATOR
            / (poolBalance0 + (PIPS_DENOMINATOR - configData.defaultFee) * bondsToSwap / PIPS_DENOMINATOR); // Standard
            // Uniswap V2 formula
        vm.prank(deployer);
        ERC1594(bond).issue(swapper, bondsToSwap, "");

        ERC20(bond).approve(address(bondHookHub), bondsToSwap);
        SwapParams memory swapParams = SwapParams({
            zeroForOne: true,
            amountSpecified: -int256(bondsToSwap),
            sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
        });
        manager.unlock(abi.encode(swapParams));
        assertEq(ERC20(bond).balanceOf(swapper), 0);
        assertApproxEqRel(eur.balanceOf(swapper), eurToReceive, DECIMAL_PRECISION / 1000);
        (uint256 feeGrowthGlobal0X128, uint256 feeGrowthGlobal1X128, uint160 sqrtPriceX96,, uint256 liquidityAfter) =
            bondHookHub.getPoolInternalState(poolKey.toId());
        assertApproxEqRel(liquidityAfter, liquidityBefore, DECIMAL_PRECISION / 1000);
        assertApproxEqRel(
            feeGrowthGlobal0X128 * liquidityBefore / FixedPoint128.Q128,
            bondsToSwap * configData.defaultFee / PIPS_DENOMINATOR,
            DECIMAL_PRECISION / 1000
        );
        assertEq(feeGrowthGlobal1X128, 0);
        uint256 finalPrice = (poolBalance1 - eurToReceive).mulDiv(DECIMAL_PRECISION, (poolBalance0 + bondsToSwap));
        assertApproxEqRel(
            finalPrice,
            sqrtPriceX96.mulDiv(DECIMAL_PRECISION, FixedPoint96.Q96).mulDiv(sqrtPriceX96, FixedPoint96.Q96),
            DECIMAL_PRECISION / 1000
        );
    }

    function test_swap_eur_for_bond_exact_in() external {
        _bootstrapPool();
        (,,,, uint256 liquidityBefore) = bondHookHub.getPoolInternalState(poolKey.toId());
        uint256 poolBalance0 = manager.balanceOf(address(bondHookHub), poolKey.currency0.toId());
        uint256 poolBalance1 = manager.balanceOf(address(bondHookHub), poolKey.currency1.toId());
        uint256 eursToSwap = 100 * DECIMAL_PRECISION;
        uint256 bondsToReceive = (PIPS_DENOMINATOR - configData.defaultFee) * eursToSwap * poolBalance0
            / PIPS_DENOMINATOR
            / (poolBalance1 + (PIPS_DENOMINATOR - configData.defaultFee) * eursToSwap / PIPS_DENOMINATOR);
        deal(address(eur), swapper, eursToSwap);
        eur.approve(address(bondHookHub), eursToSwap);
        SwapParams memory swapParams = SwapParams({
            zeroForOne: false,
            amountSpecified: -int256(eursToSwap),
            sqrtPriceLimitX96: TickMath.MAX_SQRT_PRICE - 1
        });
        manager.unlock(abi.encode(swapParams));
        assertEq(eur.balanceOf(swapper), 0);
        assertApproxEqRel(ERC20(bond).balanceOf(swapper), bondsToReceive, DECIMAL_PRECISION / 1000);
        (uint256 feeGrowthGlobal0X128, uint256 feeGrowthGlobal1X128, uint160 sqrtPriceX96,, uint256 liquidityAfter) =
            bondHookHub.getPoolInternalState(poolKey.toId());
        assertApproxEqRel(liquidityAfter, liquidityBefore, DECIMAL_PRECISION / 1000);
        assertApproxEqRel(
            feeGrowthGlobal1X128 * liquidityBefore / FixedPoint128.Q128,
            eursToSwap * configData.defaultFee / PIPS_DENOMINATOR,
            DECIMAL_PRECISION / 1000
        );
        assertEq(feeGrowthGlobal0X128, 0);
        uint256 finalPrice = (poolBalance1 + eursToSwap).mulDiv(DECIMAL_PRECISION, (poolBalance0 - bondsToReceive));
        assertApproxEqRel(
            finalPrice,
            sqrtPriceX96.mulDiv(DECIMAL_PRECISION, FixedPoint96.Q96).mulDiv(sqrtPriceX96, FixedPoint96.Q96),
            DECIMAL_PRECISION / 1000
        );
    }

    function test_swap_bond_for_eur_exact_out() external {
        _bootstrapPool();
        (,,,, uint256 liquidityBefore) = bondHookHub.getPoolInternalState(poolKey.toId());
        uint256 poolBalance0 = manager.balanceOf(address(bondHookHub), poolKey.currency0.toId());
        uint256 poolBalance1 = manager.balanceOf(address(bondHookHub), poolKey.currency1.toId());
        uint256 eurToReceive = 100 * DECIMAL_PRECISION;
        uint256 bondsToSwap = poolBalance0 * eurToReceive
            / ((PIPS_DENOMINATOR - configData.defaultFee) * (poolBalance1 - eurToReceive) / PIPS_DENOMINATOR);

        vm.prank(deployer);
        ERC1594(bond).issue(swapper, 2 * bondsToSwap, "");

        ERC20(bond).approve(address(bondHookHub), bondsToSwap * 10_100 / BPS);
        SwapParams memory swapParams = SwapParams({
            zeroForOne: true,
            amountSpecified: int256(eurToReceive),
            sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
        });
        manager.unlock(abi.encode(swapParams));
        assertApproxEqRel(ERC20(bond).balanceOf(swapper), bondsToSwap, DECIMAL_PRECISION / 1000);
        assertEq(eur.balanceOf(swapper), eurToReceive);
        (uint256 feeGrowthGlobal0X128, uint256 feeGrowthGlobal1X128, uint160 sqrtPriceX96,, uint256 liquidityAfter) =
            bondHookHub.getPoolInternalState(poolKey.toId());
        assertApproxEqRel(liquidityAfter, liquidityBefore, DECIMAL_PRECISION / 1000);
        assertApproxEqRel(
            feeGrowthGlobal0X128 * liquidityBefore / FixedPoint128.Q128,
            bondsToSwap * configData.defaultFee / PIPS_DENOMINATOR,
            DECIMAL_PRECISION / 1000
        );
        assertEq(feeGrowthGlobal1X128, 0);
        uint256 finalPrice = (poolBalance1 - eurToReceive).mulDiv(DECIMAL_PRECISION, (poolBalance0 + bondsToSwap));
        assertApproxEqRel(
            finalPrice,
            sqrtPriceX96.mulDiv(DECIMAL_PRECISION, FixedPoint96.Q96).mulDiv(sqrtPriceX96, FixedPoint96.Q96),
            DECIMAL_PRECISION / 1000
        );
    }

    function test_swap_eur_for_bond_exact_out() external {
        _bootstrapPool();
        (,,,, uint256 liquidityBefore) = bondHookHub.getPoolInternalState(poolKey.toId());
        uint256 poolBalance0 = manager.balanceOf(address(bondHookHub), poolKey.currency0.toId());
        uint256 poolBalance1 = manager.balanceOf(address(bondHookHub), poolKey.currency1.toId());
        uint256 bondsToReceive = 100 * DECIMAL_PRECISION;
        uint256 eursToSwap = bondsToReceive * poolBalance1
            / ((PIPS_DENOMINATOR - configData.defaultFee) * (poolBalance0 - bondsToReceive) / PIPS_DENOMINATOR);

        deal(address(eur), swapper, eursToSwap * 2);
        eur.approve(address(bondHookHub), eursToSwap * 2); // Additional eur for precision loss
        SwapParams memory swapParams = SwapParams({
            zeroForOne: false,
            amountSpecified: int256(bondsToReceive),
            sqrtPriceLimitX96: TickMath.MAX_SQRT_PRICE - 1
        });
        manager.unlock(abi.encode(swapParams));
        assertApproxEqRel(eur.balanceOf(swapper), eursToSwap, DECIMAL_PRECISION / 1000);
        assertEq(ERC20(bond).balanceOf(swapper), bondsToReceive);
        (uint256 feeGrowthGlobal0X128, uint256 feeGrowthGlobal1X128, uint160 sqrtPriceX96,, uint256 liquidityAfter) =
            bondHookHub.getPoolInternalState(poolKey.toId());
        assertApproxEqRel(liquidityAfter, liquidityBefore, DECIMAL_PRECISION / 1000);
        assertApproxEqRel(
            feeGrowthGlobal1X128 * liquidityBefore / FixedPoint128.Q128,
            eursToSwap * configData.defaultFee / PIPS_DENOMINATOR,
            DECIMAL_PRECISION / 1000
        );
        assertEq(feeGrowthGlobal0X128, 0);
        uint256 finalPrice = (poolBalance1 + eursToSwap).mulDiv(DECIMAL_PRECISION, (poolBalance0 - bondsToReceive));
        assertApproxEqRel(
            finalPrice,
            sqrtPriceX96.mulDiv(DECIMAL_PRECISION, FixedPoint96.Q96).mulDiv(sqrtPriceX96, FixedPoint96.Q96),
            DECIMAL_PRECISION / 1000
        );
    }

    // Price update

    function test_price_update() external {
        _bootstrapPool();
        (,, uint160 sqrtPriceBeforeX96,,) = bondHookHub.getPoolInternalState(poolKey.toId());
        _swapBondToEur(100 * DECIMAL_PRECISION);
        (,, uint160 sqrtPriceAfterX96,,) = bondHookHub.getPoolInternalState(poolKey.toId());
        int256 priceDelta = int256(
            sqrtPriceAfterX96.mulDiv(DECIMAL_PRECISION, FixedPoint96.Q96).mulDiv(sqrtPriceAfterX96, FixedPoint96.Q96)
        )
            - int256(
                sqrtPriceBeforeX96.mulDiv(DECIMAL_PRECISION, FixedPoint96.Q96).mulDiv(
                    sqrtPriceBeforeX96, FixedPoint96.Q96
                )
            );
        vm.roll(block.number + 1);
        vm.warp(block.timestamp + 1 days);
        uint256 fairValue = BondUSA(bond).getBondDetails().nominalValue.mulDiv(
            (
                DECIMAL_PRECISION
                    - INITIAL_YTM.mulDiv(BondUSA(bond).getBondDetails().maturityDate - block.timestamp, SECONDS_PER_YEAR)
            ),
            DECIMAL_PRECISION
        );
        uint256 sensitivy = bondHookHub.getSenstivity(poolKey.toId());
        uint256 newPrice = uint256(int256(fairValue) + priceDelta * int256(sensitivy) / int256(DECIMAL_PRECISION));
        // Kick the price
        _swapBondToEur(1);
        (,, uint160 sqrtPriceKickedX96,,) = bondHookHub.getPoolInternalState(poolKey.toId());
        assertApproxEqRel(
            sqrtPriceKickedX96.mulDiv(sqrtPriceKickedX96, FixedPoint96.Q96).mulDiv(
                DECIMAL_PRECISION, FixedPoint96.Q96
            ),
            newPrice,
            DECIMAL_PRECISION / 1000
        );
    }

    // Sensitivity

    function test_sensitivity_update_above_noise() external {
        _bootstrapPool();
        (,, uint160 sqrtPriceBeforeX96,,) = bondHookHub.getPoolInternalState(poolKey.toId());
        _swapEurToBond(100 * DECIMAL_PRECISION);
        (,, uint160 sqrtPriceAfterX96,,) = bondHookHub.getPoolInternalState(poolKey.toId());
        int256 priceDelta = int256(
            sqrtPriceAfterX96.mulDiv(DECIMAL_PRECISION, FixedPoint96.Q96).mulDiv(sqrtPriceAfterX96, FixedPoint96.Q96)
        )
            - int256(
                sqrtPriceBeforeX96.mulDiv(DECIMAL_PRECISION, FixedPoint96.Q96).mulDiv(
                    sqrtPriceBeforeX96, FixedPoint96.Q96
                )
            );
        assertGt(priceDelta.abs(), configData.deltaPriceThreshold);
        vm.roll(block.number + 1);
        _swapEurToBond(2);
        uint256 sensitvityAfter = uint256(
            int256(configData.baseSensitivity)
                + int256(configData.marketDynamicGamma) * priceDelta / int256(DECIMAL_PRECISION)
        );
        uint256 poolSensitivty = bondHookHub.getSenstivity(poolKey.toId());
        assertLt(poolSensitivty, configData.limitSensitivity);
        assertGt(poolSensitivty, configData.baseSensitivity);
        assertApproxEqRel(sensitvityAfter, poolSensitivty, DECIMAL_PRECISION / 1000);
    }

    function test_sensitivity_update_below_noise() external {
        _bootstrapPool();
        _swapEurToBond(100 * DECIMAL_PRECISION); // Update above base sensitivity
        vm.roll(block.number + 1);
        _swapEurToBond(2); // Noise
        vm.roll(block.number + 1);
        uint256 poolSensitivtyBefore = bondHookHub.getSenstivity(poolKey.toId());
        _swapEurToBond(2);
        uint256 poolSensitivtyAfter = bondHookHub.getSenstivity(poolKey.toId());
        uint256 sensitivity = poolSensitivtyBefore - configData.sensitivityDecayRate;
        assertApproxEqRel(sensitivity, poolSensitivtyAfter, DECIMAL_PRECISION / 1000);
        assertLt(poolSensitivtyAfter, configData.limitSensitivity);
        assertGt(poolSensitivtyAfter, configData.baseSensitivity);
    }

    //TODO: test sensitivity limit and base

    // Lp fee

    function test_lp_fee_update() external {
        _bootstrapPool();
        uint256 nSwaps = 151;
        for (uint256 i; i < nSwaps; i++) {
            _swapEurToBond(2);
        }
        (,,, uint24 lpFeeAfter,) = bondHookHub.getPoolInternalState(poolKey.toId());
        uint256 lpFee = ((configData.defaultFee - configData.feeDecayRate * (nSwaps - 1))).toUint24();
        assertApproxEqRel(lpFee, lpFeeAfter, DECIMAL_PRECISION / 1000);
        uint256 poolBalance0 = manager.balanceOf(address(bondHookHub), poolKey.currency0.toId());
        uint256 poolBalance1 = manager.balanceOf(address(bondHookHub), poolKey.currency1.toId());
        uint256 eursToSwap = 100 * DECIMAL_PRECISION;
        uint256 bondsToReceive = (PIPS_DENOMINATOR - lpFee) * eursToSwap * poolBalance0 / PIPS_DENOMINATOR
            / (poolBalance1 + (PIPS_DENOMINATOR - lpFee) * eursToSwap / PIPS_DENOMINATOR);
        _swapEurToBond(eursToSwap);
        // fee decays by > 0.1%, i.e, we should receive ~0.1 additional bonds than at the beginning
        // using 0.1% relative delta should be enough to appreciate differences
        assertApproxEqRel(ERC20(bond).balanceOf(swapper), bondsToReceive, DECIMAL_PRECISION / 1000);
    }

    //TODO test lp fee base

    // Rebalances

    function test_surplus_bond_is_deposited_in_vault() external {
        _bootstrapPool();
        _swapBondToEur(100 * DECIMAL_PRECISION);
        uint256 poolBalance0 = manager.balanceOf(address(bondHookHub), poolKey.currency0.toId());
        uint256 poolBalance1 = manager.balanceOf(address(bondHookHub), poolKey.currency1.toId());
        vm.roll(block.number + 1);
        _swapBondToEur(2);
        uint256 poolBalance0After = manager.balanceOf(address(bondHookHub), poolKey.currency0.toId());
        uint256 poolBalance1After = manager.balanceOf(address(bondHookHub), poolKey.currency1.toId());
        (,, uint160 sqrtPriceAfterX96,, uint128 liqudity) = bondHookHub.getPoolInternalState(poolKey.toId());
        (uint256 reserveAmount0,) = bondHookHub.getReserveAmounts(poolKey.toId());
        uint256 surplusBonds = poolBalance0
            - poolBalance1 * DECIMAL_PRECISION
                / (sqrtPriceAfterX96.mulDiv(DECIMAL_PRECISION, FixedPoint96.Q96).mulDiv(sqrtPriceAfterX96, FixedPoint96.Q96));
        assertGt(surplusBonds, DUST_THRESHOLD);
        assertApproxEqRel(surplusBonds, reserveAmount0, DECIMAL_PRECISION / 1000);
        assertEq(reserveAmount0, configData.vault0.totalAssets());
        assertApproxEqRel((poolBalance0After * poolBalance1After).sqrt(), liqudity, DECIMAL_PRECISION / 1000);
    }

    function test_surplus_eur_is_deposited_in_vault() external {
        _bootstrapPool();
        _swapEurToBond(100 * DECIMAL_PRECISION);
        uint256 poolBalance0 = manager.balanceOf(address(bondHookHub), poolKey.currency0.toId());
        uint256 poolBalance1 = manager.balanceOf(address(bondHookHub), poolKey.currency1.toId());
        vm.roll(block.number + 1);
        _swapEurToBond(2);
        uint256 poolBalance0After = manager.balanceOf(address(bondHookHub), poolKey.currency0.toId());
        uint256 poolBalance1After = manager.balanceOf(address(bondHookHub), poolKey.currency1.toId());
        (,, uint160 sqrtPriceAfterX96,, uint128 liqudity) = bondHookHub.getPoolInternalState(poolKey.toId());
        (, uint256 reserveAmount1) = bondHookHub.getReserveAmounts(poolKey.toId());
        uint256 surplusEurs = poolBalance1
            - poolBalance0.mulDiv(sqrtPriceAfterX96, FixedPoint96.Q96).mulDiv(sqrtPriceAfterX96, FixedPoint96.Q96);
        assertGt(surplusEurs, DUST_THRESHOLD);
        assertApproxEqRel(surplusEurs, reserveAmount1, DECIMAL_PRECISION / 1000);
        assertEq(reserveAmount1, configData.vault1.totalAssets());
        assertApproxEqRel((poolBalance0After * poolBalance1After).sqrt(), liqudity, DECIMAL_PRECISION / 1000);
    }

    // Single sided LP

    function test_add_liquditiy_single_sided_token0() external {
        _bootstrapPool();
        _swapEurToBond(100 * DECIMAL_PRECISION);
        vm.roll(block.number + 1);
        _swapEurToBond(2);
        (,, uint160 sqrtPriceX96,, uint128 liqudityBefore) = bondHookHub.getPoolInternalState(poolKey.toId());
        (, uint256 reserveAmount1) = bondHookHub.getReserveAmounts(poolKey.toId());
        uint256 bondsToDeposit =
            (reserveAmount1 / 2).mulDiv(FixedPoint96.Q96, sqrtPriceX96).mulDiv(FixedPoint96.Q96, sqrtPriceX96);
        IBondHookHub.AddLiqudityParams memory addParams =
            IBondHookHub.AddLiqudityParams({ isToken0: true, singleSided: true });
        IBondHookHub.ModifyLiqudityParams memory params = IBondHookHub.ModifyLiqudityParams({
            add: true,
            addParams: addParams,
            poolKey: poolKey,
            amount: bondsToDeposit,
            sender: address(0)
        });
        vm.prank(deployer);
        ERC1594(bond).issue(investor, bondsToDeposit, "");
        vm.startPrank(investor);
        ERC20(bond).approve(address(bondHookHub), bondsToDeposit);
        address lpToken = bondHookHub.bondDetails(bond);
        uint256 lpTokenBlanceOfInvestor = ERC20(lpToken).balanceOf(investor);
        bondHookHub.modifyLiquidity(params);
        (,,,, uint128 liqudityAfter) = bondHookHub.getPoolInternalState(poolKey.toId());
        assertApproxEqRel(
            ERC20(lpToken).balanceOf(investor) - lpTokenBlanceOfInvestor,
            (liqudityAfter - liqudityBefore) / 2 * configData.singleSidedIncentive / BPS,
            DECIMAL_PRECISION / 1000
        );
        (, uint256 reserveAmount1After) = bondHookHub.getReserveAmounts(poolKey.toId());
        assertApproxEqRel(reserveAmount1After, reserveAmount1 / 2, DECIMAL_PRECISION / 1000);
        assertEq(reserveAmount1After, configData.vault1.totalAssets());
    }

    function test_add_liquditiy_single_sided_token1() external {
        _bootstrapPool();
        _swapBondToEur(100 * DECIMAL_PRECISION);
        vm.roll(block.number + 1);
        _swapBondToEur(2);
        (,, uint160 sqrtPriceX96,, uint128 liqudityBefore) = bondHookHub.getPoolInternalState(poolKey.toId());
        (uint256 reserveAmount0,) = bondHookHub.getReserveAmounts(poolKey.toId());
        uint256 eursToDeposit =
            (reserveAmount0 / 2).mulDiv(sqrtPriceX96, FixedPoint96.Q96).mulDiv(sqrtPriceX96, FixedPoint96.Q96);
        IBondHookHub.AddLiqudityParams memory addParams =
            IBondHookHub.AddLiqudityParams({ isToken0: false, singleSided: true });
        IBondHookHub.ModifyLiqudityParams memory params = IBondHookHub.ModifyLiqudityParams({
            add: true,
            addParams: addParams,
            poolKey: poolKey,
            amount: eursToDeposit,
            sender: address(0)
        });
        deal(address(eur), address(investor), eursToDeposit);
        vm.startPrank(investor);
        eur.approve(address(bondHookHub), eursToDeposit);
        address lpToken = bondHookHub.bondDetails(bond);
        uint256 lpTokenBlanceOfInvestor = ERC20(lpToken).balanceOf(investor);
        bondHookHub.modifyLiquidity(params);
        (,,,, uint128 liqudityAfter) = bondHookHub.getPoolInternalState(poolKey.toId());
        assertApproxEqRel(
            ERC20(lpToken).balanceOf(investor) - lpTokenBlanceOfInvestor,
            (liqudityAfter - liqudityBefore) / 2 * configData.singleSidedIncentive / BPS,
            DECIMAL_PRECISION / 1000
        );
        (uint256 reserveAmount0After,) = bondHookHub.getReserveAmounts(poolKey.toId());
        assertApproxEqRel(reserveAmount0After, reserveAmount0 / 2, DECIMAL_PRECISION / 1000);
        assertEq(reserveAmount0After, configData.vault0.totalAssets());
    }

    //TODO: add test to check liqudity is removed from vaults when LPs withdraw

    // Claim fees
    function test_claim_fees() external {
        _bootstrapPool();
        _swapBondToEur(100 * DECIMAL_PRECISION);
        _swapEurToBond(100 * DECIMAL_PRECISION);
        address lpToken = bondHookHub.bondDetails(bond);
        uint256 bondLiqudity = 1000 * DECIMAL_PRECISION;
        IBondHookHub.AddLiqudityParams memory addParams =
            IBondHookHub.AddLiqudityParams({ isToken0: true, singleSided: false });
        IBondHookHub.ModifyLiqudityParams memory params = IBondHookHub.ModifyLiqudityParams({
            add: true,
            addParams: addParams,
            poolKey: poolKey,
            amount: bondLiqudity,
            sender: address(0)
        });
        vm.prank(deployer);
        ERC1594(bond).issue(address(1), bondLiqudity, ""); // Another investor
        vm.startPrank(address(1));
        deal(address(eur), address(1), type(uint256).max);
        ERC20(bond).approve(address(bondHookHub), bondLiqudity);
        eur.approve(address(bondHookHub), type(uint256).max);
        bondHookHub.modifyLiquidity(params);
        vm.stopPrank();
        uint256 investorLpTokenBalance = ERC20(lpToken).balanceOf(investor);
        params = IBondHookHub.ModifyLiqudityParams({
            add: false,
            addParams: addParams,
            poolKey: poolKey,
            amount: investorLpTokenBalance,
            sender: address(0)
        });
        (uint256 feeGrowthGlobal0X128, uint256 feeGrowthGlobal1X128,,, uint128 liqudity) =
            bondHookHub.getPoolInternalState(poolKey.toId());
        uint256 totalLpSupply = ERC20(lpToken).totalSupply();
        uint256 bondsBalanceBefore = ERC20(bond).balanceOf(investor);
        uint256 eurBalanceBefore = eur.balanceOf(investor);
        vm.prank(investor);
        bondHookHub.modifyLiquidity(params);
        assertEq(ERC20(lpToken).balanceOf(investor), 0);
        assertEq(
            ERC20(bond).balanceOf(investor) - bondsBalanceBefore,
            investorLpTokenBalance * feeGrowthGlobal0X128 / totalLpSupply * liqudity / FixedPoint128.Q128
        );
        assertEq(
            eur.balanceOf(investor) - eurBalanceBefore,
            investorLpTokenBalance * feeGrowthGlobal1X128 / totalLpSupply * liqudity / FixedPoint128.Q128
        );
    }

    // Yield farming rewards

    function test_distribute_rewards() external {
        _bootstrapPool();
        _swapEurToBond(100 * DECIMAL_PRECISION); // Add some reserves to check they are not distributed
        vm.roll(block.number + 1);
        _swapBondToEur(200 * DECIMAL_PRECISION);
        vm.roll(block.number + 1);
        _swapBondToEur(2);
        (uint256 feeGrowthGlobal0X128, uint256 feeGrowthGlobal1X128,,, uint128 liqudity) =
            bondHookHub.getPoolInternalState(poolKey.toId());
        (uint256 reserveAmount0ABefore, uint256 reserveAmount1Before) = bondHookHub.getReserveAmounts(poolKey.toId());
        uint256 rewardsToDistribute = 10 * DECIMAL_PRECISION;
        uint256 vault0Balance = ERC20(bond).balanceOf(address(configData.vault0));
        uint256 vault1Balance = eur.balanceOf(address(configData.vault1));
        deal(address(eur), address(configData.vault1), vault1Balance + rewardsToDistribute);
        vm.prank(deployer);
        ERC1594(bond).issue(address(configData.vault0), rewardsToDistribute, "");
        bondHookHub.distributeYieldFarmingRewards(poolKey);
        (uint256 feeGrowthGlobalAfter0X128, uint256 feeGrowthGlobalAfter1X128,,,) =
            bondHookHub.getPoolInternalState(poolKey.toId());
        (uint256 reserveAmount0After, uint256 reserveAmount1After) = bondHookHub.getReserveAmounts(poolKey.toId());
        assertApproxEqRel(
            feeGrowthGlobalAfter1X128 - feeGrowthGlobal1X128,
            rewardsToDistribute.mulDiv(FixedPoint128.Q128, liqudity),
            DECIMAL_PRECISION / 1000
        );
        assertApproxEqRel(
            feeGrowthGlobalAfter0X128 - feeGrowthGlobal0X128,
            rewardsToDistribute.mulDiv(FixedPoint128.Q128, liqudity),
            DECIMAL_PRECISION / 1000
        );
        assertEq(reserveAmount0ABefore, reserveAmount0After);
        assertEq(reserveAmount1Before, reserveAmount1After);
        assertApproxEqRel(vault0Balance, ERC20(bond).balanceOf(address(configData.vault0)), DECIMAL_PRECISION / 1000);
        assertApproxEqRel(vault1Balance, eur.balanceOf(address(configData.vault1)), DECIMAL_PRECISION / 1000);
    }

    function test_empty_vaults() external {
        _bootstrapPool();
        _swapEurToBond(100 * DECIMAL_PRECISION); // Add some reserves to check they are not distributed
        vm.roll(block.number + 1);
        _swapBondToEur(200 * DECIMAL_PRECISION);
        vm.roll(block.number + 1);
        _swapBondToEur(2);
        vm.warp(block.timestamp + EXPIRATION_DATE_OFFSET + 1);
        (uint256 feeGrowthGlobal0X128, uint256 feeGrowthGlobal1X128,,, uint128 liqudity) =
            bondHookHub.getPoolInternalState(poolKey.toId());
        (uint256 reserveAmount0Before, uint256 reserveAmount1Before) = bondHookHub.getReserveAmounts(poolKey.toId());
        bondHookHub.emptyVaults(poolKey);
        (uint256 reserveAmount0After, uint256 reserveAmount1After) = bondHookHub.getReserveAmounts(poolKey.toId());
        (uint256 feeGrowthGlobalAfter0X128, uint256 feeGrowthGlobalAfter1X128,,,) =
            bondHookHub.getPoolInternalState(poolKey.toId());
        assertApproxEqRel(
            feeGrowthGlobalAfter1X128 - feeGrowthGlobal1X128,
            reserveAmount1Before.mulDiv(FixedPoint128.Q128, liqudity),
            DECIMAL_PRECISION / 1000
        );
        assertApproxEqRel(
            feeGrowthGlobalAfter0X128 - feeGrowthGlobal0X128,
            reserveAmount0Before.mulDiv(FixedPoint128.Q128, liqudity),
            DECIMAL_PRECISION / 1000
        );
        assertEq(reserveAmount0After, 0);
        assertEq(reserveAmount1After, 0);
        // There can be some dust left due to decimal offset (although we use 0 in the vault mocks)
        assertApproxEqRel(eur.balanceOf(address(configData.vault1)), 0, DECIMAL_PRECISION / 1000);
        assertApproxEqRel(ERC20(bond).balanceOf(address(configData.vault0)), 0, DECIMAL_PRECISION / 1000);
    }

    function unlockCallback(bytes calldata _data) external returns (bytes memory) {
        SwapParams memory swapParams = abi.decode(_data, (SwapParams));
        BalanceDelta swapDelta = manager.swap(poolKey, swapParams, "");
        if (swapParams.zeroForOne) {
            manager.take(poolKey.currency1, swapper, swapDelta.amount1().toUint256());
        } else {
            manager.take(poolKey.currency0, swapper, swapDelta.amount0().toUint256());
        }
    }

    function msgSender() external view returns (address) {
        return swapper;
    }

    function _bootstrapPool() internal {
        vm.startPrank(deployer);
        uint256 allocatedPrice = BondUSA(bond).getBondDetails().nominalValue.mulDiv(
            (
                DECIMAL_PRECISION
                    - INITIAL_YTM.mulDiv(BondUSA(bond).getBondDetails().maturityDate - block.timestamp, SECONDS_PER_YEAR)
            ),
            DECIMAL_PRECISION
        );
        vm.warp(bondData.bondDetails.startingDate);
        bondHookIssuance.concludeSubscription(bond, allocatedPrice);
        bondHookIssuance.launchPool(bond, configData);
        vm.stopPrank();
        uint256 bondLiqudity = 1000 * DECIMAL_PRECISION;
        IBondHookHub.AddLiqudityParams memory addParams =
            IBondHookHub.AddLiqudityParams({ isToken0: true, singleSided: false });
        IBondHookHub.ModifyLiqudityParams memory params = IBondHookHub.ModifyLiqudityParams({
            add: true,
            addParams: addParams,
            poolKey: poolKey,
            amount: bondLiqudity,
            sender: address(0)
        });
        uint256 eurLiqudity = bondLiqudity * allocatedPrice / DECIMAL_PRECISION;
        vm.prank(deployer);
        ERC1594(bond).issue(investor, bondLiqudity, "");
        vm.startPrank(investor);
        deal(address(eur), investor, eurLiqudity);
        ERC20(bond).approve(address(bondHookHub), bondLiqudity);
        eur.approve(address(bondHookHub), eurLiqudity);
        bondHookHub.modifyLiquidity(params);
        vm.stopPrank();
    }

    function _swapBondToEur(uint256 bondsToSwap) internal {
        vm.prank(deployer);
        ERC1594(bond).issue(swapper, bondsToSwap, "");
        ERC20(bond).approve(address(bondHookHub), bondsToSwap);
        SwapParams memory swapParams = SwapParams({
            zeroForOne: true,
            amountSpecified: -int256(bondsToSwap),
            sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
        });
        manager.unlock(abi.encode(swapParams));
    }

    function _swapEurToBond(uint256 eursToSwap) internal {
        vm.prank(deployer);
        deal(address(eur), swapper, eursToSwap);
        eur.approve(address(bondHookHub), eursToSwap);
        SwapParams memory swapParams = SwapParams({
            zeroForOne: false,
            amountSpecified: -int256(eursToSwap),
            sqrtPriceLimitX96: TickMath.MAX_SQRT_PRICE - 1
        });
        manager.unlock(abi.encode(swapParams));
    }

    function _setBondDeploymentData() internal {
        // Rbacs
        address[] memory admins = new address[](1);
        admins[0] = deployer;

        address[] memory issuers = new address[](1);
        issuers[0] = deployer;

        IResolverProxy.Rbac memory adminRbac = IResolverProxy.Rbac({ role: _DEFAULT_ADMIN_ROLE, members: admins });

        IResolverProxy.Rbac memory issuerRbac = IResolverProxy.Rbac({ role: _ISSUER_ROLE, members: issuers });

        bondData.security.rbacs.push(adminRbac);
        bondData.security.rbacs.push(issuerRbac);

        // Assign remaining fields
        bondData.security.resolver = IBusinessLogicResolver(businessLogicResolverProxy);
        bondData.security.resolverProxyConfiguration =
            IFactory.ResolverProxyConfiguration({ key: BOND_CONFIG_ID, version: 0 });
        bondData.security.erc20MetadataInfo.isin = ISIN;
        bondData.security.erc20MetadataInfo.decimals = DECIMALS;
        bondData.security.erc20MetadataInfo.name = BOND_NAME;
        bondData.security.erc20MetadataInfo.symbol = BOND_SYMBOL;
        bondData.security.maxSupply = type(uint256).max;

        // Bond details
        bondData.bondDetails.currency = bytes3("EUR");
        bondData.bondDetails.startingDate = block.timestamp + STARTING_DATE_OFFSET;
        bondData.bondDetails.maturityDate = block.timestamp + EXPIRATION_DATE_OFFSET;
        bondData.bondDetails.nominalValue = DECIMAL_PRECISION;

        // Regulation data
        factoryRegulationData.regulationType = RegulationType.REG_S;
        factoryRegulationData.regulationSubType = RegulationSubType.NONE;
    }

    function _congifurePoolState() internal {
        ERC4626 vault0 = new MockERC4626(ERC20(bond));
        ERC4626 vault1 = new MockERC4626(eur);
        configData.vault0 = vault0;
        configData.vault1 = vault1;
        configData.baseSensitivity = DECIMAL_PRECISION / 2; // delta = 0.5
        configData.limitSensitivity = DECIMAL_PRECISION; // delta = 1
        configData.sensitivityDecayRate = 500 * DECIMAL_PRECISION / BPS; // 5%
        configData.deltaPriceThreshold = bondData.bondDetails.nominalValue * 50 / BPS; // 0.5% with respect to nominal
            // delta sensitivity (gamma) = relative delta price with respect to nominal
        configData.marketDynamicGamma = DECIMAL_PRECISION ** 2 / bondData.bondDetails.nominalValue;
        configData.ytm = INITIAL_YTM;
        configData.defaultFee = uint24(30 * PIPS_DENOMINATOR / BPS); // 0.3%
        configData.baseFee = uint24(10 * PIPS_DENOMINATOR / BPS); // 0.1%
        configData.feeDecayRate = uint24(PIPS_DENOMINATOR / (10 * BPS)); // 0.001% per block tx
        configData.singleSidedIncentive = 10_200; // 2% (bps)
        configData.ytmOracle = oracle;
    }

    function _readBlrDeployment() internal view returns (address) {
        string memory fileName = "config/ats/deployments.json";
        require(vm.exists(fileName), "Bond Hook deployment file does not exist");
        string memory json = vm.readFile(fileName);
        return stdJson.readAddress(json, ".businessLogicResolverProxy.address");
    }
}
