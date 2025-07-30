// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.18;

/// @notice Once the issuance module launches the pool, the secondary market is open for trading
contract BondHookRewardsDistributor {
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
}
