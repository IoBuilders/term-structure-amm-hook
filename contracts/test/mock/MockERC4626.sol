// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.18;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

contract MockERC4626 is ERC4626 {
    constructor(ERC20 _underlying) ERC4626(_underlying) ERC20(_underlying.name(), _underlying.symbol()) { }
}
