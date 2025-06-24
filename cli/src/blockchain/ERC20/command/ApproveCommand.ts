import type { Address } from "viem";

export default class ApproveCommand {
  private _account: Address;
  private _amount: bigint;
  private _to: Address;

  constructor({
    account,
    amount,
    to,
  }: {
    account: Address;
    amount: bigint;
    to: Address;
  }) {
    this._account = account;
    this._amount = amount;
    this._to = to;
  }
  get account(): Address {
    return this._account;
  }
  get amount(): bigint {
    return this._amount;
  }
  get to(): Address {
    return this._to;
  }
}
