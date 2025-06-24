import type { ModifyLiquidityParams } from "@hook";
import type { Address } from "viem";

export default class ModifyLiquidiyCommand {
  private _account: Address;
  private _modifyLiquidityParams: ModifyLiquidityParams;

  constructor({
    account,
    modifyLiquidityParams,
  }: {
    account: Address;
    modifyLiquidityParams: ModifyLiquidityParams;
  }) {
    this._account = account;
    this._modifyLiquidityParams = modifyLiquidityParams;
  }
  get account(): Address {
    return this._account;
  }
  get modifyLiquidityParams(): ModifyLiquidityParams {
    return this._modifyLiquidityParams;
  }
}
