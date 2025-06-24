// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.18;

import "forge-std/Script.sol";
import { BondHookHub, IBondHookHub } from "../src/BondHookHub.sol";
import { MockERC20 } from "./mock/MockERC20.sol";
import { DECIMAL_PRECISION } from "../src/constants/Constants.sol";
import { stdJson } from "forge-std/StdJson.sol";
import { MockERC4626 } from "../test/mock/MockERC4626.sol";
import { ERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { BondHookIssuance } from "../src/BondHookIssuance.sol";
import { ERC1594 } from "@hashgraph/ats/contracts/contracts/layer_1/ERC1400/ERC1594/ERC1594.sol";
import { PoolKey } from "@uniswap/v4-core/src/types/PoolKey.sol";
import { Currency } from "@uniswap/v4-core/src/types/Currency.sol";
import { IHooks } from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import { TickMath } from "@uniswap/v4-core/src/libraries/TickMath.sol";
import { MockRouter } from "./mock/MockRouter.sol";
import { IPoolManager } from "@uniswap/v4-core/src/PoolManager.sol";
import { BondUSA } from "@hashgraph/ats/contracts/contracts/layer_3/bondUSA/BondUSA.sol";
import { PoolId } from "@uniswap/v4-core/src/types/PoolId.sol";
import { SwapParams } from "@uniswap/v4-core/src/types/PoolOperation.sol";

contract PoolLauncher is Script {
    uint256 constant BPS = 10_000;
    uint256 internal constant PIPS_DENOMINATOR = 1_000_000;
    uint256 constant INITIAL_YTM = DECIMAL_PRECISION * 300 / BPS; // 3%
    uint256 constant INITIAL_BALANCE = 100 * DECIMAL_PRECISION;
    uint256 constant INITIAL_LIQUIDITY = 1000 * DECIMAL_PRECISION;
    uint256 constant SECONDS_PER_YEAR = 365 days;

    address bond;
    address token0;
    address token1;
    address oracle;
    IBondHookHub.PoolConfigData configData;
    MockERC20 eur;
    BondHookHub hookHub;
    BondHookIssuance bondHookIssuance;
    address poolManager;

    function run() public {
        _readBondHookDeployment();
        eur = MockERC20(bondHookIssuance.codeToCurrency(bytes3("EUR")));
        (token0, token1) = address(eur) > bond ? (bond, address(eur)) : (address(eur), bond);

        uint256 allocatedPrice = BondUSA(bond).getBondDetails().nominalValue
            * (
                DECIMAL_PRECISION
                    - INITIAL_YTM * (BondUSA(bond).getBondDetails().maturityDate - block.timestamp) / SECONDS_PER_YEAR
            ) / DECIMAL_PRECISION;

        vm.startBroadcast();
        _congifurePoolState();

        bondHookIssuance.concludeSubscription(bond, allocatedPrice);

        bondHookIssuance.launchPool(bond, configData);

        eur.mint(vm.addr(vm.envUint("PRIVATE_KEY_VALID")), INITIAL_BALANCE);
        ERC1594(bond).issue(vm.addr(vm.envUint("PRIVATE_KEY_VALID")), INITIAL_BALANCE, "");

        PoolKey memory poolKey = PoolKey({
            tickSpacing: TickMath.MAX_TICK_SPACING,
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(address(token1)),
            fee: 0,
            hooks: IHooks(address(hookHub))
        });

        address mockRouter = address(new MockRouter(IPoolManager(poolManager), poolKey));

        eur.mint(vm.addr(vm.envUint("PRIVATE_KEY_ADMIN")), INITIAL_LIQUIDITY);
        ERC1594(bond).issue(vm.addr(vm.envUint("PRIVATE_KEY_ADMIN")), INITIAL_LIQUIDITY, "");
        eur.approve(address(hookHub), type(uint256).max);
        ERC20(bond).approve(address(hookHub), type(uint256).max);

        IBondHookHub.AddLiqudityParams memory addParams =
            IBondHookHub.AddLiqudityParams({ isToken0: true, singleSided: false });
        IBondHookHub.ModifyLiqudityParams memory params = IBondHookHub.ModifyLiqudityParams({
            add: true,
            addParams: addParams,
            poolKey: poolKey,
            amount: INITIAL_LIQUIDITY,
            sender: address(0)
        });

        hookHub.modifyLiquidity(params);

        // // Test swap
        // {
        //     SwapParams memory swapParams = SwapParams({
        //         zeroForOne: true,
        //         amountSpecified: -int256(DECIMAL_PRECISION),
        //         sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
        //     });
        //     MockRouter(mockRouter).executeSwap(swapParams);
        // }
        address lpToken = hookHub.bondDetails(bond);

        vm.stopBroadcast();

        string memory deploymentJson = string.concat(
            '{"bondHookHub":{"address":"',
            vm.toString(address(hookHub)),
            '"},',
            '"poolManager":{"address":"',
            vm.toString(address(poolManager)),
            '"},',
            '"bond":{"address":"',
            vm.toString(bond),
            '"},',
            '"bondHookIssuance":{"address":"',
            vm.toString(address(bondHookIssuance)),
            '"},',
            '"eur":{"address":"',
            vm.toString(address(eur)),
            '"},',
            '"router":{"address":"',
            vm.toString(mockRouter),
            '"},',
            '"lpToken":{"address":"',
            vm.toString(lpToken),
            '"},',
            '"poolId":{"address":"',
            vm.toString(PoolId.unwrap(poolKey.toId())),
            '"}}'
        );

        vm.writeFile("config/hook/deployments.json", deploymentJson);
    }

    function _congifurePoolState() internal {
        ERC4626 vault0 = new MockERC4626(ERC20(token0));
        ERC4626 vault1 = new MockERC4626(ERC20(token1));
        configData.vault0 = vault0;
        configData.vault1 = vault1;
        configData.baseSensitivity = DECIMAL_PRECISION / 2; // delta = 0.5
        configData.limitSensitivity = DECIMAL_PRECISION; // delta = 1
        configData.sensitivityDecayRate = 500 * DECIMAL_PRECISION / BPS; // 5%
        configData.deltaPriceThreshold = DECIMAL_PRECISION * 50 / BPS; // 0.5% with respect to nominal
            // delta sensitivity (gamma) = relative delta price with respect to nominal
        configData.marketDynamicGamma = DECIMAL_PRECISION ** 2 / DECIMAL_PRECISION;
        configData.ytm = INITIAL_YTM;
        configData.defaultFee = uint24(30 * PIPS_DENOMINATOR / BPS); // 0.3%
        configData.baseFee = uint24(10 * PIPS_DENOMINATOR / BPS); // 0.1%
        configData.feeDecayRate = uint24(PIPS_DENOMINATOR / (10 * BPS)); // 0.001% per block tx
        configData.singleSidedIncentive = 10_200; // 2% (bps)
        configData.ytmOracle = oracle;
    }

    function _readBondHookDeployment() internal {
        string memory fileName = "config/hook/deployments.json";
        require(vm.exists(fileName), "Bond Hook deployment file does not exist");
        string memory json = vm.readFile(fileName);
        hookHub = BondHookHub(stdJson.readAddress(json, ".bondHookHub.address"));
        bond = stdJson.readAddress(json, ".bond.address");
        bondHookIssuance = BondHookIssuance(stdJson.readAddress(json, ".bondHookIssuance.address"));
        poolManager = stdJson.readAddress(json, ".poolManager.address");

        fileName = "../avs/contracts/deployments/bond-yield/31337.json";
        require(vm.exists(fileName), "AVS deployment file does not exist");
        json = vm.readFile(fileName);
        oracle = stdJson.readAddress(json, ".addresses.bondYieldServiceManager");
    }
}
