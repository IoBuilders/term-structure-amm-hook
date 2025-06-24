import type { Address } from "viem";

interface IsInControlListQueryParams {
  accountAddress: Address;
}

export default class IsInControlListQuery {
  public readonly accountAddress: Address;

  constructor({ accountAddress }: IsInControlListQueryParams) {
    this.accountAddress = accountAddress;
  }
}
