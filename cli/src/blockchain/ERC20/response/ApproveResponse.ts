import type { TransactionReceipt } from "viem";
import { TxResponse } from "@blockchain";

export default class ApproveResponse extends TxResponse {
  private _account: string;

  constructor({
    txReceipt,
    account,
  }: {
    txReceipt: TransactionReceipt;
    account: string;
  }) {
    super({ txReceipt });
    this._account = account;
  }

  get account(): string {
    return this._account;
  }
}
