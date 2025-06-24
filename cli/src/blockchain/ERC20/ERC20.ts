import type { Address } from "viem";
import { ERC20Artifact } from "@blockchain/artifact";
import {
  BaseContract,
  ValidateRecentReceiptQuery,
} from "@blockchain/base-contract";
import type IERC20 from "./IERC20";
import type NewERC20Command from "./command/NewERC20Command";
import type BalanceOfQuery from "./query/BalanceOfQuery";
import type ApproveCommand from "./command/ApproveCommand";
import type ApproveResponse from "./response/ApproveResponse";
import type { ApprovalEventList } from "blockchain/artifact/ERC20Artifact";
import ApprovalLengthError from "./error/ApprovalLengthError";
import { APPROVAL_MULTIPLE_EVENTS_WARNING } from "./constants";
import ApprovalOperatorNotSenderError from "./error/ApprovalOperatorNotSenderError";
import ApprovalSpenderNotExpectedError from "./error/ApprovalSpenderNotExpectedError";
import Event from "blockchain/Event";
import { EVENTS } from "@blockchain/ERC20";
import { Separator } from "@inquirer/prompts";
import type { AtsControlList } from "@blockchain/AtsControlList";

const { abi: ABI } = ERC20Artifact;

export default class ERC20 extends BaseContract<typeof ABI> implements IERC20 {
  private _atsControlList: AtsControlList;
  private _lastApprovalEventBlock: number = 0;

  constructor({ address, account, atsControlList }: NewERC20Command) {
    super({
      abi: ABI,
      address,
      account,
      eventList: ERC20.events,
    });
    this._atsControlList = atsControlList;
  }

  public async balanceOf({ account }: BalanceOfQuery): Promise<bigint> {
    const balance = await this.instance.read.balanceOf([account]);

    return balance;
  }

  public async approve({
    account,
    amount,
    to,
  }: ApproveCommand): Promise<ApproveResponse | undefined> {
    const isInControlList = await this._atsControlList.isInControlList({
      accountAddress: account,
    });
    if (isInControlList) {
      console.error(
        `[⚙️ Admin Backend⚙️ ] 🔴 Account ${account} is in the ATS control list. Cannot perform this action.`,
      );
      return undefined;
    }
    const txHash = await this.instance.write.approve([to, amount], {
      account: this._account.account,
      chain: this.chain,
    });

    // Get the transaction receipt (including logs)
    const txReceipt = await this._validateRecentReceipt(
      new ValidateRecentReceiptQuery({ txHash, log: true }),
    );

    // Fetch Swap events indexed by sender within that block
    const approvalEvents = await this.instance.getEvents.Approval(
      { owner: account, spender: to },
      {
        fromBlock: txReceipt.blockNumber,
        toBlock: txReceipt.blockNumber,
        strict: true,
      },
    );

    // Validate the approve event
    this._validateApprove({
      approvalEvents,
      account,
      to,
    });

    return {
      txReceipt,
      account,
    } as ApproveResponse;
  }

  public static get events(): Event[] {
    return [
      new Event({
        name: EVENTS.APPROVAL,
        func: (logs) => {
          logs.forEach((log) => {
            // ! duplicate events
            // console.log(new Separator().separator);
            // console.log(
            //     `🎯 Approval event detected - (⛓️  TxHash: ${log.transactionHash})`
            // );
            // console.log(new Separator().separator);
          });
        },
      }),
    ];
  }

  // * Private Methods

  private _validateApprove({
    approvalEvents,
    account,
    to,
  }: {
    approvalEvents: ApprovalEventList;
    account: Address;
    to: Address;
  }): {
    approvalEvent: ApprovalEventList[0];
    operator: string;
  } {
    if (approvalEvents.length === 0) {
      throw new ApprovalLengthError();
    }

    if (approvalEvents.length > 1) {
      console.warn(APPROVAL_MULTIPLE_EVENTS_WARNING);
    }

    const event = approvalEvents[0];

    // operator/sender must match caller
    if (event.args.owner !== account) {
      throw new ApprovalOperatorNotSenderError();
    }
    if (event.args.spender !== to) {
      throw new ApprovalSpenderNotExpectedError();
    }

    return {
      approvalEvent: event,
      operator: event.args.owner,
    };
  }
}
