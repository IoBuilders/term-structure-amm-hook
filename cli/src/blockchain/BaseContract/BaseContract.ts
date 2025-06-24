import {
  getContract,
  type Abi,
  type Address,
  type TransactionReceipt,
  type WatchContractEventReturnType,
} from "viem";
import Time from "@time";
import type { Account, Event } from "@blockchain";
import {
  GetRecentReceiptQuery,
  NewBaseContractCommand,
  ReceiptNotFoundError,
  Warnings,
} from "@blockchain/base-contract";
import type ValidateRecentReceiptQuery from "./query/ValidateRecentReceiptQuery";

/**
 * Abstract base class for blockchain contracts.
 *
 * @template AbiType - The type of the ABI (Application Binary Interface) of the contract.
 */
export default abstract class BaseContract<AbiType extends Abi> {
  protected _abi: AbiType;
  protected _address: Address;
  protected _account: Account;
  protected _watchedEventList: WatchContractEventReturnType[] = [];

  /**
   * Creates an instance of BaseContract.
   *
   * @param {Object} params - The initialization parameters.
   * @param {AbiType} params.abi - The ABI (Application Binary Interface) of the contract.
   * @param {string} params.address - The address of the contract.
   * @param {Account} params.account - The account associated with the contract.
   * @param {EventType[]} [params.eventList] - Optional list of events to subscribe to.
   */
  constructor({
    abi,
    address,
    account,
    eventList,
  }: NewBaseContractCommand<AbiType>) {
    this._abi = abi;
    this._address = address;
    this._account = account;
    // * Subscribe to events
    if (eventList) {
      this._subscribe({ eventList });
    }
  }

  get abi(): AbiType {
    return this._abi;
  }

  get address(): Address {
    return this._address;
  }

  get instance() {
    return getContract({
      abi: this._abi,
      address: this._address,
      client: this._account.client,
    });
  }

  get chain() {
    return this._account.chain;
  }

  private _subscribe({ eventList }: { eventList: Event[] }): void {
    // * Subscribe to events
    for (const event of eventList) {
      this._watchedEventList.push(
        this._account.publicClient.watchContractEvent({
          abi: this._abi,
          address: this._address,
          eventName: event.name,
          onLogs: event.func,
        }),
      );
    }
  }

  protected async _getRecentReceipt({
    txHash,
    timeout,
    maxRetries,
    log,
  }: GetRecentReceiptQuery): Promise<TransactionReceipt | undefined> {
    // Pooling function with retries and time between retries
    let tryCount = 1;
    do {
      try {
        const receipt = await this._account.publicClient.getTransactionReceipt({
          hash: txHash,
        });
        if (receipt) {
          return receipt;
        }
      } catch (error) {
        if (
          (error instanceof Error &&
            error.message.includes("TransactionReceiptNotFoundError")) ||
          JSON.stringify(error).includes("TransactionReceiptNotFoundError")
        ) {
          if (log) {
            console.log(
              Warnings.fetchingTransactionReceipt(tryCount, maxRetries),
            );
          }
        } else {
          throw error as Error;
        }
      }
      await Time.wait({ duration: timeout, unit: "seconds" });
      tryCount++;
    } while (tryCount <= maxRetries);
    return undefined;
  }

  protected async _validateRecentReceipt({
    txHash,
    timeout,
    maxRetries,
    log,
  }: ValidateRecentReceiptQuery): Promise<TransactionReceipt> {
    const receipt = await this._getRecentReceipt(
      new GetRecentReceiptQuery({ txHash, timeout, maxRetries, log }),
    );
    if (!receipt) {
      throw new ReceiptNotFoundError();
    }
    return receipt;
  }
}
