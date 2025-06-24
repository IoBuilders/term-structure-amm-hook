import type { GetContractEventsReturnType } from "viem";

const ABI = [
  {
    type: "constructor",
    inputs: [
      {
        name: "_poolManager",
        type: "address",
        internalType: "contract IPoolManager",
      },
      {
        name: "_owner",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "afterAddLiquidity",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address",
      },
      {
        name: "key",
        type: "tuple",
        internalType: "struct PoolKey",
        components: [
          {
            name: "currency0",
            type: "address",
            internalType: "Currency",
          },
          {
            name: "currency1",
            type: "address",
            internalType: "Currency",
          },
          {
            name: "fee",
            type: "uint24",
            internalType: "uint24",
          },
          {
            name: "tickSpacing",
            type: "int24",
            internalType: "int24",
          },
          {
            name: "hooks",
            type: "address",
            internalType: "contract IHooks",
          },
        ],
      },
      {
        name: "params",
        type: "tuple",
        internalType: "struct ModifyLiquidityParams",
        components: [
          {
            name: "tickLower",
            type: "int24",
            internalType: "int24",
          },
          {
            name: "tickUpper",
            type: "int24",
            internalType: "int24",
          },
          {
            name: "liquidityDelta",
            type: "int256",
            internalType: "int256",
          },
          {
            name: "salt",
            type: "bytes32",
            internalType: "bytes32",
          },
        ],
      },
      {
        name: "delta",
        type: "int256",
        internalType: "BalanceDelta",
      },
      {
        name: "feesAccrued",
        type: "int256",
        internalType: "BalanceDelta",
      },
      {
        name: "hookData",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4",
      },
      {
        name: "",
        type: "int256",
        internalType: "BalanceDelta",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "afterDonate",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address",
      },
      {
        name: "key",
        type: "tuple",
        internalType: "struct PoolKey",
        components: [
          {
            name: "currency0",
            type: "address",
            internalType: "Currency",
          },
          {
            name: "currency1",
            type: "address",
            internalType: "Currency",
          },
          {
            name: "fee",
            type: "uint24",
            internalType: "uint24",
          },
          {
            name: "tickSpacing",
            type: "int24",
            internalType: "int24",
          },
          {
            name: "hooks",
            type: "address",
            internalType: "contract IHooks",
          },
        ],
      },
      {
        name: "amount0",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "amount1",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "hookData",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "afterInitialize",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address",
      },
      {
        name: "key",
        type: "tuple",
        internalType: "struct PoolKey",
        components: [
          {
            name: "currency0",
            type: "address",
            internalType: "Currency",
          },
          {
            name: "currency1",
            type: "address",
            internalType: "Currency",
          },
          {
            name: "fee",
            type: "uint24",
            internalType: "uint24",
          },
          {
            name: "tickSpacing",
            type: "int24",
            internalType: "int24",
          },
          {
            name: "hooks",
            type: "address",
            internalType: "contract IHooks",
          },
        ],
      },
      {
        name: "sqrtPriceX96",
        type: "uint160",
        internalType: "uint160",
      },
      {
        name: "tick",
        type: "int24",
        internalType: "int24",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "afterRemoveLiquidity",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address",
      },
      {
        name: "key",
        type: "tuple",
        internalType: "struct PoolKey",
        components: [
          {
            name: "currency0",
            type: "address",
            internalType: "Currency",
          },
          {
            name: "currency1",
            type: "address",
            internalType: "Currency",
          },
          {
            name: "fee",
            type: "uint24",
            internalType: "uint24",
          },
          {
            name: "tickSpacing",
            type: "int24",
            internalType: "int24",
          },
          {
            name: "hooks",
            type: "address",
            internalType: "contract IHooks",
          },
        ],
      },
      {
        name: "params",
        type: "tuple",
        internalType: "struct ModifyLiquidityParams",
        components: [
          {
            name: "tickLower",
            type: "int24",
            internalType: "int24",
          },
          {
            name: "tickUpper",
            type: "int24",
            internalType: "int24",
          },
          {
            name: "liquidityDelta",
            type: "int256",
            internalType: "int256",
          },
          {
            name: "salt",
            type: "bytes32",
            internalType: "bytes32",
          },
        ],
      },
      {
        name: "delta",
        type: "int256",
        internalType: "BalanceDelta",
      },
      {
        name: "feesAccrued",
        type: "int256",
        internalType: "BalanceDelta",
      },
      {
        name: "hookData",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4",
      },
      {
        name: "",
        type: "int256",
        internalType: "BalanceDelta",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "afterSwap",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address",
      },
      {
        name: "key",
        type: "tuple",
        internalType: "struct PoolKey",
        components: [
          {
            name: "currency0",
            type: "address",
            internalType: "Currency",
          },
          {
            name: "currency1",
            type: "address",
            internalType: "Currency",
          },
          {
            name: "fee",
            type: "uint24",
            internalType: "uint24",
          },
          {
            name: "tickSpacing",
            type: "int24",
            internalType: "int24",
          },
          {
            name: "hooks",
            type: "address",
            internalType: "contract IHooks",
          },
        ],
      },
      {
        name: "params",
        type: "tuple",
        internalType: "struct SwapParams",
        components: [
          {
            name: "zeroForOne",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "amountSpecified",
            type: "int256",
            internalType: "int256",
          },
          {
            name: "sqrtPriceLimitX96",
            type: "uint160",
            internalType: "uint160",
          },
        ],
      },
      {
        name: "delta",
        type: "int256",
        internalType: "BalanceDelta",
      },
      {
        name: "hookData",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4",
      },
      {
        name: "",
        type: "int128",
        internalType: "int128",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "beforeAddLiquidity",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address",
      },
      {
        name: "key",
        type: "tuple",
        internalType: "struct PoolKey",
        components: [
          {
            name: "currency0",
            type: "address",
            internalType: "Currency",
          },
          {
            name: "currency1",
            type: "address",
            internalType: "Currency",
          },
          {
            name: "fee",
            type: "uint24",
            internalType: "uint24",
          },
          {
            name: "tickSpacing",
            type: "int24",
            internalType: "int24",
          },
          {
            name: "hooks",
            type: "address",
            internalType: "contract IHooks",
          },
        ],
      },
      {
        name: "params",
        type: "tuple",
        internalType: "struct ModifyLiquidityParams",
        components: [
          {
            name: "tickLower",
            type: "int24",
            internalType: "int24",
          },
          {
            name: "tickUpper",
            type: "int24",
            internalType: "int24",
          },
          {
            name: "liquidityDelta",
            type: "int256",
            internalType: "int256",
          },
          {
            name: "salt",
            type: "bytes32",
            internalType: "bytes32",
          },
        ],
      },
      {
        name: "hookData",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "beforeDonate",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address",
      },
      {
        name: "key",
        type: "tuple",
        internalType: "struct PoolKey",
        components: [
          {
            name: "currency0",
            type: "address",
            internalType: "Currency",
          },
          {
            name: "currency1",
            type: "address",
            internalType: "Currency",
          },
          {
            name: "fee",
            type: "uint24",
            internalType: "uint24",
          },
          {
            name: "tickSpacing",
            type: "int24",
            internalType: "int24",
          },
          {
            name: "hooks",
            type: "address",
            internalType: "contract IHooks",
          },
        ],
      },
      {
        name: "amount0",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "amount1",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "hookData",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "beforeInitialize",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address",
      },
      {
        name: "key",
        type: "tuple",
        internalType: "struct PoolKey",
        components: [
          {
            name: "currency0",
            type: "address",
            internalType: "Currency",
          },
          {
            name: "currency1",
            type: "address",
            internalType: "Currency",
          },
          {
            name: "fee",
            type: "uint24",
            internalType: "uint24",
          },
          {
            name: "tickSpacing",
            type: "int24",
            internalType: "int24",
          },
          {
            name: "hooks",
            type: "address",
            internalType: "contract IHooks",
          },
        ],
      },
      {
        name: "sqrtPriceX96",
        type: "uint160",
        internalType: "uint160",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "beforeRemoveLiquidity",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address",
      },
      {
        name: "key",
        type: "tuple",
        internalType: "struct PoolKey",
        components: [
          {
            name: "currency0",
            type: "address",
            internalType: "Currency",
          },
          {
            name: "currency1",
            type: "address",
            internalType: "Currency",
          },
          {
            name: "fee",
            type: "uint24",
            internalType: "uint24",
          },
          {
            name: "tickSpacing",
            type: "int24",
            internalType: "int24",
          },
          {
            name: "hooks",
            type: "address",
            internalType: "contract IHooks",
          },
        ],
      },
      {
        name: "params",
        type: "tuple",
        internalType: "struct ModifyLiquidityParams",
        components: [
          {
            name: "tickLower",
            type: "int24",
            internalType: "int24",
          },
          {
            name: "tickUpper",
            type: "int24",
            internalType: "int24",
          },
          {
            name: "liquidityDelta",
            type: "int256",
            internalType: "int256",
          },
          {
            name: "salt",
            type: "bytes32",
            internalType: "bytes32",
          },
        ],
      },
      {
        name: "hookData",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "beforeSwap",
    inputs: [
      {
        name: "sender",
        type: "address",
        internalType: "address",
      },
      {
        name: "key",
        type: "tuple",
        internalType: "struct PoolKey",
        components: [
          {
            name: "currency0",
            type: "address",
            internalType: "Currency",
          },
          {
            name: "currency1",
            type: "address",
            internalType: "Currency",
          },
          {
            name: "fee",
            type: "uint24",
            internalType: "uint24",
          },
          {
            name: "tickSpacing",
            type: "int24",
            internalType: "int24",
          },
          {
            name: "hooks",
            type: "address",
            internalType: "contract IHooks",
          },
        ],
      },
      {
        name: "params",
        type: "tuple",
        internalType: "struct SwapParams",
        components: [
          {
            name: "zeroForOne",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "amountSpecified",
            type: "int256",
            internalType: "int256",
          },
          {
            name: "sqrtPriceLimitX96",
            type: "uint160",
            internalType: "uint160",
          },
        ],
      },
      {
        name: "hookData",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4",
      },
      {
        name: "",
        type: "int256",
        internalType: "BeforeSwapDelta",
      },
      {
        name: "",
        type: "uint24",
        internalType: "uint24",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "bondDetails",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "lpToken",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "distributeYieldFarmingRewards",
    inputs: [
      {
        name: "_poolKey",
        type: "tuple",
        internalType: "struct PoolKey",
        components: [
          {
            name: "currency0",
            type: "address",
            internalType: "Currency",
          },
          {
            name: "currency1",
            type: "address",
            internalType: "Currency",
          },
          {
            name: "fee",
            type: "uint24",
            internalType: "uint24",
          },
          {
            name: "tickSpacing",
            type: "int24",
            internalType: "int24",
          },
          {
            name: "hooks",
            type: "address",
            internalType: "contract IHooks",
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "emptyVaults",
    inputs: [
      {
        name: "_poolKey",
        type: "tuple",
        internalType: "struct PoolKey",
        components: [
          {
            name: "currency0",
            type: "address",
            internalType: "Currency",
          },
          {
            name: "currency1",
            type: "address",
            internalType: "Currency",
          },
          {
            name: "fee",
            type: "uint24",
            internalType: "uint24",
          },
          {
            name: "tickSpacing",
            type: "int24",
            internalType: "int24",
          },
          {
            name: "hooks",
            type: "address",
            internalType: "contract IHooks",
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getBondHookConfigData",
    inputs: [
      {
        name: "_poolId",
        type: "bytes32",
        internalType: "PoolId",
      },
    ],
    outputs: [
      {
        name: "poolConfigData_",
        type: "tuple",
        internalType: "struct IBondHookHub.PoolConfigData",
        components: [
          {
            name: "vault0",
            type: "address",
            internalType: "contract ERC4626",
          },
          {
            name: "vault1",
            type: "address",
            internalType: "contract ERC4626",
          },
          {
            name: "baseSensitivity",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "limitSensitivity",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "sensitivityDecayRate",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "deltaPriceThreshold",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "marketDynamicGamma",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "ytm",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "defaultFee",
            type: "uint24",
            internalType: "uint24",
          },
          {
            name: "baseFee",
            type: "uint24",
            internalType: "uint24",
          },
          {
            name: "feeDecayRate",
            type: "uint24",
            internalType: "uint24",
          },
          {
            name: "singleSidedIncentive",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "ytmOracle",
            type: "address",
            internalType: "address",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getHookPermissions",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct Hooks.Permissions",
        components: [
          {
            name: "beforeInitialize",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "afterInitialize",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "beforeAddLiquidity",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "afterAddLiquidity",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "beforeRemoveLiquidity",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "afterRemoveLiquidity",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "beforeSwap",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "afterSwap",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "beforeDonate",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "afterDonate",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "beforeSwapReturnDelta",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "afterSwapReturnDelta",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "afterAddLiquidityReturnDelta",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "afterRemoveLiquidityReturnDelta",
            type: "bool",
            internalType: "bool",
          },
        ],
      },
    ],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "getPoolInternalState",
    inputs: [
      {
        name: "_poolId",
        type: "bytes32",
        internalType: "PoolId",
      },
    ],
    outputs: [
      {
        name: "feeGrowthGlobal0X128_",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "feeGrowthGlobal1X128_",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "sqrtPriceX96_",
        type: "uint160",
        internalType: "uint160",
      },
      {
        name: "lpFee_",
        type: "uint24",
        internalType: "uint24",
      },
      {
        name: "liquidity_",
        type: "uint128",
        internalType: "uint128",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getReserveAmounts",
    inputs: [
      {
        name: "_poolId",
        type: "bytes32",
        internalType: "PoolId",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getSenstivity",
    inputs: [
      {
        name: "_poolId",
        type: "bytes32",
        internalType: "PoolId",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "modifyLiquidity",
    inputs: [
      {
        name: "_params",
        type: "tuple",
        internalType: "struct IBondHookHub.ModifyLiqudityParams",
        components: [
          {
            name: "add",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "addParams",
            type: "tuple",
            internalType: "struct IBondHookHub.AddLiqudityParams",
            components: [
              {
                name: "isToken0",
                type: "bool",
                internalType: "bool",
              },
              {
                name: "singleSided",
                type: "bool",
                internalType: "bool",
              },
            ],
          },
          {
            name: "poolKey",
            type: "tuple",
            internalType: "struct PoolKey",
            components: [
              {
                name: "currency0",
                type: "address",
                internalType: "Currency",
              },
              {
                name: "currency1",
                type: "address",
                internalType: "Currency",
              },
              {
                name: "fee",
                type: "uint24",
                internalType: "uint24",
              },
              {
                name: "tickSpacing",
                type: "int24",
                internalType: "int24",
              },
              {
                name: "hooks",
                type: "address",
                internalType: "contract IHooks",
              },
            ],
          },
          {
            name: "amount",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "sender",
            type: "address",
            internalType: "address",
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "poolManager",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IPoolManager",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "poolToBond",
    inputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "PoolId",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setIssuance",
    inputs: [
      {
        name: "_issuance",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setPoolState",
    inputs: [
      {
        name: "_poolKey",
        type: "tuple",
        internalType: "struct PoolKey",
        components: [
          {
            name: "currency0",
            type: "address",
            internalType: "Currency",
          },
          {
            name: "currency1",
            type: "address",
            internalType: "Currency",
          },
          {
            name: "fee",
            type: "uint24",
            internalType: "uint24",
          },
          {
            name: "tickSpacing",
            type: "int24",
            internalType: "int24",
          },
          {
            name: "hooks",
            type: "address",
            internalType: "contract IHooks",
          },
        ],
      },
      {
        name: "_sqrtPriceX96",
        type: "uint160",
        internalType: "uint160",
      },
      {
        name: "_poolConfigData",
        type: "tuple",
        internalType: "struct IBondHookHub.PoolConfigData",
        components: [
          {
            name: "vault0",
            type: "address",
            internalType: "contract ERC4626",
          },
          {
            name: "vault1",
            type: "address",
            internalType: "contract ERC4626",
          },
          {
            name: "baseSensitivity",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "limitSensitivity",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "sensitivityDecayRate",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "deltaPriceThreshold",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "marketDynamicGamma",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "ytm",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "defaultFee",
            type: "uint24",
            internalType: "uint24",
          },
          {
            name: "baseFee",
            type: "uint24",
            internalType: "uint24",
          },
          {
            name: "feeDecayRate",
            type: "uint24",
            internalType: "uint24",
          },
          {
            name: "singleSidedIncentive",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "ytmOracle",
            type: "address",
            internalType: "address",
          },
        ],
      },
      {
        name: "_lpToken",
        type: "address",
        internalType: "address",
      },
      {
        name: "_bond",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [
      {
        name: "newOwner",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "unlockCallback",
    inputs: [
      {
        name: "_data",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateBondYtm",
    inputs: [
      {
        name: "_poolId",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "_ytm",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "ModifiedLiquidity",
    inputs: [
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "liqudityDelta",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "BondMaturityDatePassed",
    inputs: [
      {
        name: "maturityDate",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "CallerIsNotOracle",
    inputs: [],
  },
  {
    type: "error",
    name: "CannotEmptyVaultsBeforeMaturity",
    inputs: [
      {
        name: "maturityDate",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "ComplianceCheckFailed",
    inputs: [],
  },
  {
    type: "error",
    name: "HookNotImplemented",
    inputs: [],
  },
  {
    type: "error",
    name: "NotIssuance",
    inputs: [],
  },
  {
    type: "error",
    name: "NotPoolManager",
    inputs: [],
  },
  {
    type: "error",
    name: "PriceCannotBeLessThan0",
    inputs: [],
  },
  {
    type: "error",
    name: "PriceTooHigh",
    inputs: [],
  },
  {
    type: "error",
    name: "RouterNotAllowed",
    inputs: [],
  },
] as const;
const BYTECODE = "0x" as const;

const DEPLOYED_BYTECODE = "0x" as const;

export type ModifiedLiquidityEventList = GetContractEventsReturnType<
  typeof ABI,
  "ModifiedLiquidity"
>;
export type ModifiedLiquidityEvent = ModifiedLiquidityEventList[0];

export default class HookHubArtifact {
  public static abi = ABI;
  public static bytecode = BYTECODE;
  public static deployedBytecode = DEPLOYED_BYTECODE;
}
