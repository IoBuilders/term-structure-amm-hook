import type { Account, Event } from "@blockchain";
import { isAddress, type Abi, type Address } from "viem";

interface NewBaseContractCommandParams<AbiType extends Abi> {
  abi: AbiType;
  address: Address;
  account: Account;
  eventList?: Event[];
}

export default class NewBaseContractCommand<AbiType extends Abi> {
  public readonly abi: AbiType;
  public readonly address: Address;
  public readonly account: Account;
  public readonly eventList: Event[];

  constructor({
    abi,
    address,
    account,
    eventList = [],
  }: NewBaseContractCommandParams<AbiType>) {
    if (!isAddress(address)) {
      throw new Error(`Invalid address: ${address}`);
    }
    this.abi = abi;
    this.address = address;
    this.account = account;
    this.eventList = eventList;
  }
}
