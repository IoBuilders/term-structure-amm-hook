import type { TransactionReceipt } from "viem";

export default class TxResponse {
  private _txReceipt: TransactionReceipt;

  constructor({ txReceipt }: { txReceipt: TransactionReceipt }) {
    this._txReceipt = txReceipt;
  }

  get txReceipt(): TransactionReceipt {
    return this._txReceipt;
  }
}
