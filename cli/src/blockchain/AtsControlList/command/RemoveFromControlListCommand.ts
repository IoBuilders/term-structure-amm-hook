import type { Address } from "viem";

export default class RemoveFromControlListCommand {
  private _accountAddress: Address;

  constructor({ accountAddress }: { accountAddress: Address }) {
    this._accountAddress = accountAddress;
  }
  get accountAddress(): Address {
    return this._accountAddress;
  }
}
