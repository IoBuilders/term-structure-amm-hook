// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.18;

import "forge-std/Script.sol";
import { Hooks } from "@uniswap/v4-core/src/libraries/Hooks.sol";
import { IPoolManager, PoolManager } from "@uniswap/v4-core/src/PoolManager.sol";
import { HookMiner } from "@uniswap/v4-periphery/src/utils/HookMiner.sol";
import { BondHookHub } from "../src/BondHookHub.sol";
import { IResolverProxy } from
    "@hashgraph/ats/contracts/contracts/interfaces/resolver/resolverProxy/IResolverProxy.sol";
import { IFactory } from "@hashgraph/ats/contracts/contracts/interfaces/factory/IFactory.sol";
import {
    _DEFAULT_ADMIN_ROLE,
    _ISSUER_ROLE,
    _CONTROL_LIST_ROLE
} from "@hashgraph/ats/contracts/contracts/layer_1/constants/roles.sol";
import {
    FactoryRegulationData,
    RegulationType,
    RegulationSubType
} from "@hashgraph/ats/contracts/contracts/layer_3/constants/regulation.sol";
import { BondHookIssuance } from "../src/BondHookIssuance.sol";
import { MockERC20 } from "./mock/MockERC20.sol";
import { DECIMAL_PRECISION } from "../src/constants/Constants.sol";
import { IBusinessLogicResolver } from
    "@hashgraph/ats/contracts/contracts/interfaces/resolver/IBusinessLogicResolver.sol";
import { stdJson } from "forge-std/StdJson.sol";

contract BondDeployer is Script {
    bytes32 constant BOND_CONFIG_ID = 0x0000000000000000000000000000000000000000000000000000000000000002;
    uint256 constant STARTING_DATE_OFFSET = 30 seconds;
    uint256 constant EXPIRATION_DATE_OFFSET = 2 days;
    string constant ISIN = "US0378331005";
    uint8 constant DECIMALS = 18;
    string constant BOND_NAME = "UHI5BOND";
    string constant BOND_SYMBOL = "UB";

    address businessLogicResolverProxy;
    BondHookIssuance bondHookIssuance;

    // Bond
    IFactory.BondData bondData;
    FactoryRegulationData factoryRegulationData;
    address bond;

    // Pool
    MockERC20 eur;
    PoolManager manager;
    BondHookHub hookHub;

    function run() public {
        _readBondHookDeployment();
        _readBlrDeployment();

        vm.startBroadcast();

        eur = new MockERC20("EURO", "EUR");

        _setBondDeploymentData();

        bondHookIssuance = new BondHookIssuance(hookHub);

        hookHub.setIssuance(address(bondHookIssuance));

        bondHookIssuance.setCurrencyCode(bytes3("EUR"), address(eur));

        bond = bondHookIssuance.deployBond(bondData, factoryRegulationData);

        vm.stopBroadcast();

        string memory fileName = "config/hook/deployments.json";

        string memory deploymentJson = string.concat(
            '{"bondHookHub":{"address":"',
            vm.toString(address(hookHub)),
            '"},',
            '"poolManager":{"address":"',
            vm.toString(address(manager)),
            '"},',
            '"bond":{"address":"',
            vm.toString(bond),
            '"},',
            '"bondHookIssuance":{"address":"',
            vm.toString(address(bondHookIssuance)),
            '"}}'
        );

        vm.writeFile(fileName, deploymentJson);
    }

    function _setBondDeploymentData() internal {
        // Rbacs
        address[] memory admins = new address[](1);
        admins[0] = vm.addr(vm.envUint("PRIVATE_KEY_ADMIN"));

        IResolverProxy.Rbac memory adminRbac = IResolverProxy.Rbac({ role: _DEFAULT_ADMIN_ROLE, members: admins });

        IResolverProxy.Rbac memory issuerRbac = IResolverProxy.Rbac({ role: _ISSUER_ROLE, members: admins });

        IResolverProxy.Rbac memory controlListRbac =
            IResolverProxy.Rbac({ role: _CONTROL_LIST_ROLE, members: admins });

        bondData.security.rbacs.push(adminRbac);
        bondData.security.rbacs.push(issuerRbac);
        bondData.security.rbacs.push(controlListRbac);

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

    function _readBondHookDeployment() internal {
        string memory fileName = "config/hook/deployments.json";
        require(vm.exists(fileName), "Bond Hook deployment file does not exist");
        string memory json = vm.readFile(fileName);
        hookHub = BondHookHub(stdJson.readAddress(json, ".bondHookHub.address"));
        manager = PoolManager(stdJson.readAddress(json, ".poolManager.address"));
    }

    function _readBlrDeployment() internal {
        string memory fileName = "config/ats/deployments.json";
        require(vm.exists(fileName), "ATS deployment file does not exist");
        string memory json = vm.readFile(fileName);
        businessLogicResolverProxy = stdJson.readAddress(json, ".businessLogicResolverProxy.address");
    }
}
