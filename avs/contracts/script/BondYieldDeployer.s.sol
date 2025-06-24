// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/Test.sol";
import {BondYieldDeploymentLib} from "./utils/BondYieldDeploymentLib.sol";
import {CoreDeployLib, CoreDeploymentParsingLib} from "./utils/CoreDeploymentParsingLib.sol";
import {UpgradeableProxyLib} from "./utils/UpgradeableProxyLib.sol";
import {StrategyBase} from "@eigenlayer/contracts/strategies/StrategyBase.sol";
import {ERC20Mock} from "../test/ERC20Mock.sol";
import {TransparentUpgradeableProxy} from
    "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {StrategyFactory} from "@eigenlayer/contracts/strategies/StrategyFactory.sol";
import {StrategyManager} from "@eigenlayer/contracts/core/StrategyManager.sol";
import {IRewardsCoordinator} from "@eigenlayer/contracts/interfaces/IRewardsCoordinator.sol";
import {
    IECDSAStakeRegistryTypes,
    IStrategy
} from "@eigenlayer-middleware/src/interfaces/IECDSAStakeRegistry.sol";
import {MockOracleConsumer} from "../src/mock/MockOracleConsumer.sol";

import "forge-std/Test.sol";

contract BondYieldDeployer is Script, Test {
    using CoreDeployLib for *;
    using UpgradeableProxyLib for address;
    using stdJson for *;

    address private deployer;
    address proxyAdmin;
    address rewardsOwner;
    address rewardsInitiator;
    IStrategy bondYieldStrategy;
    CoreDeployLib.DeploymentData coreDeployment;
    BondYieldDeploymentLib.DeploymentData bondYieldDeployment;
    BondYieldDeploymentLib.DeploymentConfigData bondYieldConfig;
    IECDSAStakeRegistryTypes.Quorum internal quorum;
    ERC20Mock token;

    function setUp() public virtual {
        deployer = vm.rememberKey(vm.envUint("PRIVATE_KEY"));
        vm.label(deployer, "Deployer");

        bondYieldConfig =
            BondYieldDeploymentLib.readDeploymentConfigValues("config/bond-yield/", block.chainid);

        coreDeployment =
            CoreDeploymentParsingLib.readDeploymentJson("deployments/core/", block.chainid);
    }

    function run() external {
        vm.startBroadcast(deployer);
        rewardsOwner = bondYieldConfig.rewardsOwner;
        rewardsInitiator = bondYieldConfig.rewardsInitiator;

        token = new ERC20Mock();
        // NOTE: if this fails, it's because the initialStrategyWhitelister is not set to be the StrategyFactory
        bondYieldStrategy =
            IStrategy(StrategyFactory(coreDeployment.strategyFactory).deployNewStrategy(token));

        quorum.strategies.push(
            IECDSAStakeRegistryTypes.StrategyParams({
                strategy: bondYieldStrategy,
                multiplier: 10_000
            })
        );

        token.mint(deployer, 2000);
        token.increaseAllowance(address(coreDeployment.strategyManager), 1000);
        StrategyManager(coreDeployment.strategyManager).depositIntoStrategy(
            bondYieldStrategy, token, 1000
        );

        proxyAdmin = UpgradeableProxyLib.deployProxyAdmin();

        address oracleConsumer = _readHookAddress();

        bondYieldDeployment = BondYieldDeploymentLib.deployContracts(
            proxyAdmin, coreDeployment, quorum, rewardsInitiator, rewardsOwner, oracleConsumer
        );

        bondYieldDeployment.strategy = address(bondYieldStrategy);
        bondYieldDeployment.token = address(token);
        bondYieldDeployment.oracleConsumer = oracleConsumer;

        vm.stopBroadcast();
        verifyDeployment();
        BondYieldDeploymentLib.writeDeploymentJson(bondYieldDeployment);
    }

    function verifyDeployment() internal view {
        require(
            bondYieldDeployment.stakeRegistry != address(0), "StakeRegistry address cannot be zero"
        );
        require(
            bondYieldDeployment.bondYieldServiceManager != address(0),
            "BondYieldServiceManager address cannot be zero"
        );
        require(bondYieldDeployment.strategy != address(0), "Strategy address cannot be zero");
        require(proxyAdmin != address(0), "ProxyAdmin address cannot be zero");
        require(
            coreDeployment.delegationManager != address(0),
            "DelegationManager address cannot be zero"
        );
        require(coreDeployment.avsDirectory != address(0), "AVSDirectory address cannot be zero");
    }

    function _readHookAddress() internal view  returns (address) {
        string memory json = vm.readFile('../../contracts/config/hook/deployments.json');
        address hook = json.readAddress(".bondHookHub.address");
        console2.log("HOOK", hook);
        return hook;
    }
}
