import type { Hash } from "viem";

interface GetRecentReceiptQueryParams {
  txHash: Hash;
  timeout?: number;
  maxRetries?: number;
  log?: boolean;
}

export default class GetRecentReceiptQuery {
  public readonly txHash: Hash;
  public readonly timeout: number = 5;
  public readonly maxRetries: number = 5;
  public readonly log: boolean = false;

  constructor({
    txHash,
    timeout = 5,
    maxRetries = 5,
    log = false,
  }: GetRecentReceiptQueryParams) {
    this.txHash = txHash;
    this.timeout = timeout;
    this.maxRetries = maxRetries;
    this.log = log;
  }
}
