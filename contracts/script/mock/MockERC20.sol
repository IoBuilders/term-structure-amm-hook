// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.18;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) { }

    function mint(address _user, uint256 _amount) external {
        _mint(_user, _amount);
    }
}
