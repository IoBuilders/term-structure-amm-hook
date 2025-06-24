import type { Address, TransactionReceipt } from "viem";
import { TxResponse } from "@blockchain";

export default class RemoveFromControlListResponse extends TxResponse {
  private _accountAddress: Address;

  constructor({
    txReceipt,
    accountAddress,
  }: {
    txReceipt: TransactionReceipt;
    accountAddress: Address;
  }) {
    super({ txReceipt });
    this._accountAddress = accountAddress;
  }

  get accountAddress(): Address {
    return this._accountAddress;
  }
}
