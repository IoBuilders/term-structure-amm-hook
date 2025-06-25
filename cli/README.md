# Term Structure AMM – CLI

[![bundler: bun](https://img.shields.io/badge/bundler-bun-blue)](https://bun.sh/)

---

## Table of Contents

1. [About](#about)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Usage](#usage)
   1. [Selecting Account](#selecting-account)
   2. [Interacting with the Pool](#interacting-with-the-pool)
      1. [Providing Liquidity](#providing-liquidity)
      2. [Removing Liquidity](#removing-liquidity)
      3. [Swapping](#swapping)
   3. [Compliance](#compliance)
      1. [Checking Compliance Status](#checking-compliance-status)
      2. [Control List](#control-list)

---

## About

The CLI is a demo tool used to interact with the pool and showcase its core functionalities.

## Installation

From the root of the CLI project workspace, install dependencies:

```sh
bun install
```

## Quick Start

1. Copy `.env.sample` to `.env` and set your Circle API key.
2. Run the CLI:

   ```sh
   bun start
   ```

## Usage

### Selecting Account

There are three account types:

- **invalid**: Circle will flag this as denied; you’ll be blacklisted on first use.
- **valid**: Pre-funded with EUR & bonds; intended for normal pool interactions.
- **admin**: Can manage the control (black) list.

### Interacting with the Pool

#### Providing Liquidity

1. Choose a token and amount.
2. The hook calculates the counterpart deposit.
3. You can also act as a single-sided LP: the pool will withdraw the non-desired input token from the vaults.

#### Removing Liquidity

1. Specify how many LP tokens to burn.
2. You’ll receive your share + accrued fees.

#### Swapping

- **Positive amount** = “I want to receive exactly this much output token.”
- **Negative amount** = “I want to deposit exactly this much input token.”

### Compliance

#### Checking Compliance Status

- Query any user’s status via Circle’s API.

#### Control List

- **View**: list all blacklisted users.
- **Admin**: add or remove users from the blacklist.
