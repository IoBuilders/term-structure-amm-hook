// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.18;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { FixedPoint128 } from "@uniswap/v4-core/src/libraries/FixedPoint128.sol";

/// @notice LP token, it supports custom issuance for single sided LPs
/// @dev We use our own interface for LPs since we need our pool to be able to handle outside of the pool manager
/// swaps
contract BondHookLpToken is Ownable, ERC20 {
    using Math for *;

    struct Fees {
        uint256 feeGrowthInside0LastX128;
        uint256 feeGrowthInside1LastX128;
        uint256 feesOwed0;
        uint256 feesOwed1;
    }

    mapping(address => Fees) public feeDataForUser;

    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) { }

    function mint(
        address _to,
        uint256 _amount,
        uint256 _feeGrowthInside0X128,
        uint256 _feeGrowthInside1X128,
        uint256 _liqudity
    )
        external
        onlyOwner
    {
        Fees memory feeData = feeDataForUser[_to];

        if (totalSupply() > 0) {
            unchecked {
                feeDataForUser[_to].feesOwed0 += (_feeGrowthInside0X128 - feeData.feeGrowthInside0LastX128).mulDiv(
                    balanceOf(_to), FixedPoint128.Q128
                ).mulDiv(_liqudity, totalSupply());
                feeDataForUser[_to].feesOwed1 += (_feeGrowthInside1X128 - feeData.feeGrowthInside1LastX128).mulDiv(
                    balanceOf(_to), FixedPoint128.Q128
                ).mulDiv(_liqudity, totalSupply());
            }
        }

        feeData.feeGrowthInside0LastX128  = _feeGrowthInside0X128;
        feeData.feeGrowthInside1LastX128  = _feeGrowthInside1X128;

        _mint(_to, _amount);
    }

    function burn(
        address _from,
        uint256 _amount,
        uint256 _feeGrowthInside0X128,
        uint256 _feeGrowthInside1X128,
        uint256 _liqudity
    )
        external
        onlyOwner
        returns (uint256 feesOwed0_, uint256 feesOwed1_)
    {
        Fees memory feeData = feeDataForUser[_from];

        if (totalSupply() > 0) {
            unchecked {
                feeDataForUser[_from].feesOwed0 += (_feeGrowthInside0X128 - feeData.feeGrowthInside0LastX128).mulDiv(
                    balanceOf(_from), FixedPoint128.Q128
                ).mulDiv(_liqudity, totalSupply());
                feeDataForUser[_from].feesOwed1 += (_feeGrowthInside1X128 - feeData.feeGrowthInside1LastX128).mulDiv(
                    balanceOf(_from), FixedPoint128.Q128
                ).mulDiv(_liqudity, totalSupply());
            }
        }

        _burn(_from, _amount);

        feesOwed0_ = feeDataForUser[_from].feesOwed0;
        feesOwed1_ = feeDataForUser[_from].feesOwed1;

        feeData.feesOwed0 = 0;
        feeData.feesOwed1 = 0;
    }
}
