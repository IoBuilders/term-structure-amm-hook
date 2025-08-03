# Term Structure AMM

The project is structured in three folders:

- `avs/`: Contains the oracle logic used to calculate the YTM of the bond based on external data. This is where we integrate EigenLayer.
- `cli/`: A CLI tool to interact with the pool, users go through a screening process the moment they are connected, if they are not compliant they are added to the blacklist. Here we integrate Circle.
- `contracts/`: Core hook logic.

---

## Table of Contents

1. [Installation](#installation)  
2. [Quick Start](#quick-start)  
   1. [Build Contracts](#build-contracts)  
   2. [Start Anvil Chain](#start-anvil-chain)  
   3. [Deploy Bond & Start Operator](#deploy-bond--start-operator)  
   4. [Start Traffic](#start-traffic)  
   5. [Start the CLI](#start-the-cli)  
---

## Installation

In a terminal, install ATS and Uniswap:

```sh
cd contracts
make install
```

## Quick Start

### Build Contracts

From the `contracts/` folder, compile the smart contracts:

```sh
make build-contracts
```

### Start Anvil Chain

Spin up Anvil with pre-deployed ATS infrastructure:

```sh
# When using testnet, set up your own Pk and RPC url
make build-anvil-state-with-deployed-contracts
```

### Deploy Bond & Start Operator (Local)

In one terminal:

1. Copy environment variables:  
   ```sh
   cp .env.sample .env
   # Set up your own Pk for testnet usage
   # Set up your desired RPC url
   ```  
2. Run the operator (note that in testnet you will need to wait for the starting date of the bond to pass before launching the pool):  
   ```sh
   # Set up your own Pk and RPC in the AVS
   make start-operator
   ```  
   This deploys the issuance module, hook, LP token, and EigenLayer contracts; configures the hook as the AVS oracle consumer; and launches the pool. The operator listens for tasks and responds with updated YTM.

You can also skip the operator part and deploy a pool with a flat YTM by running:

```sh
make deploy-bond
# Wait unti starting date is passed  
make launch-pool
```

### Start Traffic

In a new terminal, generate demo tasks every 10 seconds:

```sh
cd contracts
make start-traffic
```

Tasks simulate YTM updates; real integrations would pull from external sources (e.g., credit agencies).

### Start the CLI

In another terminal, switch to the CLI folder and configure your Circle API key:

```sh
cd cli
cp .env.sample .env
# Edit .env to add your Circle API key
# When using testnet, edit .env to add your Pk and RPC
bun start
```

Interact with the pool and perform compliance checks.
