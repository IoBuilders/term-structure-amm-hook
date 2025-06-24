// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.18;

uint256 constant DECIMAL_PRECISION = 1e18;
uint256 constant BPS = 1e4;
uint256 constant SECONDS_PER_YEAR = 365 days;
uint256 constant DUST_THRESHOLD = DECIMAL_PRECISION / BPS;
