// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import { ERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

interface IOracleConsumer {
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

    function updateBondYtm(bytes32 _poolId, uint256 _ytm) external;

    function getBondHookConfigData(bytes32 _poolId) external view returns (PoolConfigData memory poolConfigData_);
}
