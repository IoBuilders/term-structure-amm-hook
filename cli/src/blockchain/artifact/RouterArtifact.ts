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
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "executeSwap",
    inputs: [
      {
        name: "_params",
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
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "msgSender",
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
    type: "event",
    name: "SwapExecuted",
    inputs: [
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "id",
        type: "bytes32",
        indexed: true,
        internalType: "PoolId",
      },
    ],
    anonymous: false,
  },
] as const;
const BYTECODE = "0x" as const;

const DEPLOYED_BYTECODE = "0x" as const;

export type SwapEventList = GetContractEventsReturnType<
  typeof ABI,
  "SwapExecuted"
>;
export type SwapEvent = SwapEventList[0];

export default class RouterArtifact {
  public static abi = ABI;
  public static bytecode = BYTECODE;
  public static deployedBytecode = DEPLOYED_BYTECODE;
}
