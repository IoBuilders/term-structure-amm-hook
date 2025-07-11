import type { GetContractEventsReturnType } from "viem";

const ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "ListedAccount",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "UnlistedAccount",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "operator",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "AddedToControlList",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "operator",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "RemovedFromControlList",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_account",
        type: "address",
      },
    ],
    name: "addToControlList",
    outputs: [
      {
        internalType: "bool",
        name: "success_",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getControlListCount",
    outputs: [
      {
        internalType: "uint256",
        name: "controlListCount_",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_pageIndex",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "_pageLength",
        type: "uint256",
      },
    ],
    name: "getControlListMembers",
    outputs: [
      {
        internalType: "address[]",
        name: "members_",
        type: "address[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getControlListType",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bool",
        name: "_isWhiteList",
        type: "bool",
      },
    ],
    name: "initialize_ControlList",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_account",
        type: "address",
      },
    ],
    name: "isInControlList",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_account",
        type: "address",
      },
    ],
    name: "removeFromControlList",
    outputs: [
      {
        internalType: "bool",
        name: "success_",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
const BYTECODE = "0x" as const;

const DEPLOYED_BYTECODE = "0x" as const;

export type AddedToControlListEventList = GetContractEventsReturnType<
  typeof ABI,
  "AddedToControlList"
>;
export type AddedToControlListEvent = AddedToControlListEventList[0];

export type RemovedFromControlListEventList = GetContractEventsReturnType<
  typeof ABI,
  "RemovedFromControlList"
>;
export type RemovedFromControlListEvent = RemovedFromControlListEventList[0];

export default class AtsControlListArtifact {
  public static abi = ABI;
  public static bytecode = BYTECODE;
  public static deployedBytecode = DEPLOYED_BYTECODE;
}
