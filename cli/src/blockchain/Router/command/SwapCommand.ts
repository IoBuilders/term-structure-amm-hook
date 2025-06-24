import type { PoolKey, SwapParams } from "@hook";
import type { Address } from "viem";

export default class SwapCommand {
  private _account: Address;
  private _swapParams: SwapParams;

  constructor({
    account,
    swapParams,
  }: {
    account: Address;
    swapParams: SwapParams;
  }) {
    this._account = account;
    this._swapParams = swapParams;
  }
  get account(): Address {
    return this._account;
  }
  get swapParams(): SwapParams {
    return this._swapParams;
  }
}
