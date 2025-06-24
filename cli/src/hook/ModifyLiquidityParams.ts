import type { Address } from "viem";
import type { PoolKey } from "./PoolKey";

export interface AddLiquidityParams {
  isToken0: boolean;
  singleSided: boolean;
}

export type ModifyLiquidityParams = {
  add: boolean;
  addParams: AddLiquidityParams;
  poolKey: PoolKey;
  amount: bigint;
  sender: Address;
};
