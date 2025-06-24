import type { Address } from "viem";

interface BalanceOfqueryParams {
  account: Address;
}

export default class BalanceOfquery {
  public readonly account: Address;

  constructor({ account }: BalanceOfqueryParams) {
    this.account = account;
  }
}
