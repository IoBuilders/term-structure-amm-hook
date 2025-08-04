# Term Structure AMM – Contracts

[![bundler: foundry](https://img.shields.io/badge/framework-foundry-orange)](https://github.com/foundry-rs/foundry)

Term Structure AMM brings yield curves on-chain by using a combination of fair valuation and price impact from trades. It is built entirely on top of Uniswap V4 and Hedera’s Asset Tokenization Studio.

---

## Table of Contents

1. [Installation](#installation)  
2. [Build](#build)  
3. [Contracts Deployment](#contracts-deployment)  
   1. [Deploy ATS Infrastructure](#deploy-ats-infrastructure)  
   2. [Deploy Hub & Bond](#deploy-hub--bond)  
   3. [Launch Pool](#launch-pool)  
4. [Test](#test)  
---

## Installation

To install dependencies and set up ATS & Uniswap libraries:

```sh
make install
```

## Build

Compile the smart contracts:

```sh
make build-contracts
```

## Contracts Deployment

First, configure, the .env files, then:

### Deploy ATS Infrastructure

To deploy the contracts you will first need to deploy the ATS infrastructure, you can do this by running:

```sh
make build-anvil-state-with-deployed-contracts
```

### Deploy Hub & Bond

Deploy the Hook Hub (interface & hook logic) and a bond token:

```sh
make deploy-bond
```

### Launch Pool

Finally, initialize and seed the liquidity pool:

```sh
make launch-pool
```

## Test

Run tests with coverage reporting:

```sh
make test-contracts
```