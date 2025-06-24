import { RouterArtifact } from "@blockchain/artifact";
import {
  BaseContract,
  ValidateRecentReceiptQuery,
} from "@blockchain/base-contract";
import {
  EVENTS,
  SWAP_MULTIPLE_EVENTS_WARNING,
  SwapLengthError,
  SwapOperatorNotSenderError,
  SwapIdNotExpectedError,
  type SwapCommand,
  type SwapResponse,
  type IPoolManager,
} from "@blockchain/Router";
import Event from "blockchain/Event";
import { Separator } from "@inquirer/prompts";
import type NewRouterCommand from "./command/NewRouterCommand";
import { getPoolId, type PoolKey } from "hook/PoolKey";
import type { SwapEventList } from "@blockchain/artifact";

const { abi: ABI } = RouterArtifact;

export default class Router
  extends BaseContract<typeof ABI>
  implements IPoolManager
{
  private _poolKey: PoolKey;

  constructor({ address, account, poolKey }: NewRouterCommand) {
    super({
      abi: ABI,
      address,
      account,
      eventList: Router.events,
    });
    this._poolKey = poolKey;
  }

  get poolKey(): PoolKey {
    return this._poolKey;
  }

  public async swap({
    account,
    swapParams,
  }: SwapCommand): Promise<SwapResponse> {
    const txHash = await this.instance.write.executeSwap([swapParams], {
      account: this._account.account,
      chain: this.chain,
    });

    // Get the transaction receipt (including logs)
    const txReceipt = await this._validateRecentReceipt(
      new ValidateRecentReceiptQuery({ txHash, log: true }),
    );

    // Fetch Swap events indexed by sender within that block
    const swapEvents = await this.instance.getEvents.SwapExecuted(
      { sender: this._account.address, id: getPoolId(this._poolKey) },
      {
        fromBlock: txReceipt.blockNumber,
        toBlock: txReceipt.blockNumber,
        strict: true,
      },
    );

    // Validate the Swap event
    this._validateSwap({
      swapEvents,
      expectedPoolId: getPoolId(this._poolKey),
    });

    return {
      txReceipt,
      account,
    } as SwapResponse;
  }

  public static get events(): Event[] {
    return [
      new Event({
        name: EVENTS.SWAP,
        func: (logs) => {
          logs.forEach((log) => {
            console.log(new Separator().separator);
            console.log(
              `🎯 Swap event detected - (⛓️ TxHash: ${log.transactionHash})`,
            );
            console.log(new Separator().separator);
          });
        },
      }),
    ];
  }

  // * Private Methods

  private _validateSwap({
    swapEvents,
    expectedPoolId,
  }: {
    swapEvents: SwapEventList;
    expectedPoolId: string;
  }): {
    swapEvent: SwapEventList[0];
    operator: string;
  } {
    if (swapEvents.length === 0) {
      throw new SwapLengthError();
    }

    if (swapEvents.length > 1) {
      console.warn(SWAP_MULTIPLE_EVENTS_WARNING);
    }

    const event = swapEvents[0];

    // operator/sender must match caller
    if (event.args.sender !== this._account.address) {
      throw new SwapOperatorNotSenderError();
    }

    // pool ID must match the one we passed in
    if (event.args.id != expectedPoolId) {
      throw new SwapIdNotExpectedError();
    }

    return {
      swapEvent: event,
      operator: event.args.sender,
    };
  }
}
