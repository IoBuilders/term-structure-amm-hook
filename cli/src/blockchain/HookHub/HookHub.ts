import {
  HookHubArtifact,
  type ModifiedLiquidityEventList,
} from "@blockchain/artifact";
import {
  BaseContract,
  ValidateRecentReceiptQuery,
} from "@blockchain/base-contract";
import type IHookHub from "./IHookHub";
import type { PoolKey } from "@hook";
import type NewHookHubCommand from "./command/NewHookHubCommand";
import type ModifyLiquidiyCommand from "./command/ModifyLiquidiyCommand";
import ModifyLiquidityResponse from "./response/ModifyLiquidityResponse";
import {
  EVENTS,
  MODIFY_LIQUIDITY_MULTIPLE_EVENTS_WARNING,
} from "@blockchain/HookHub";
import ModifyLiquidityLengthError from "./error/ModifyLiquidityLengthError";
import ModifyLiquidityOperatorNotSenderError from "./error/ModifyLiquidityOperatorNotSenderError";
import Event from "blockchain/Event";
import { Separator } from "@inquirer/prompts";

const { abi: ABI } = HookHubArtifact;

export default class HookHub
  extends BaseContract<typeof ABI>
  implements IHookHub
{
  private _poolKey: PoolKey;

  constructor({ address, account, poolKey }: NewHookHubCommand) {
    super({
      abi: ABI,
      address,
      account,
      eventList: HookHub.events,
    });
    this._poolKey = poolKey;
  }

  public async modifyLiquidity({
    account,
    modifyLiquidityParams,
  }: ModifyLiquidiyCommand): Promise<ModifyLiquidityResponse> {
    const txHash = await this.instance.write.modifyLiquidity(
      [modifyLiquidityParams],
      {
        account: this._account.account,
        chain: this.chain,
      },
    );

    // Get the transaction receipt (including logs)
    const txReceipt = await this._validateRecentReceipt(
      new ValidateRecentReceiptQuery({ txHash, log: true }),
    );

    // Fetch Swap events indexed by sender within that block
    const modifiyLiquidityEvents =
      await this.instance.getEvents.ModifiedLiquidity(
        { sender: this._account.address },
        {
          fromBlock: txReceipt.blockNumber,
          toBlock: txReceipt.blockNumber,
          strict: true,
        },
      );

    // Validate the Swap event
    this._validateModifyLiquidity({
      modifiyLiquidityEvents,
    });

    return {
      txReceipt,
      account,
    } as ModifyLiquidityResponse;
  }

  public static get events(): Event[] {
    return [
      new Event({
        name: EVENTS.MODIFY_LIQUIDITY,
        func: (logs) => {
          logs.forEach((log) => {
            console.log(new Separator().separator);
            console.log(
              `🎯 Modified liquidity event detected - (⛓️ TxHash: ${log.transactionHash})`,
            );
            console.log(new Separator().separator);
          });
        },
      }),
    ];
  }

  // * Private Methods

  private _validateModifyLiquidity({
    modifiyLiquidityEvents,
  }: {
    modifiyLiquidityEvents: ModifiedLiquidityEventList;
  }): {
    modifiyLiquidityEvent: ModifiedLiquidityEventList[0];
    operator: string;
  } {
    if (modifiyLiquidityEvents.length === 0) {
      throw new ModifyLiquidityLengthError();
    }

    if (modifiyLiquidityEvents.length > 1) {
      console.warn(MODIFY_LIQUIDITY_MULTIPLE_EVENTS_WARNING);
    }

    const event = modifiyLiquidityEvents[0];

    // operator/sender must match caller
    if (event.args.sender !== this._account.address) {
      throw new ModifyLiquidityOperatorNotSenderError();
    }

    return {
      modifiyLiquidityEvent: event,
      operator: event.args.sender,
    };
  }
}
