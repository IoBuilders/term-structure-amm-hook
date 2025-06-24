import type { Address } from "viem";
import {
  AtsControlListArtifact,
  type AddedToControlListEventList,
  type RemovedFromControlListEventList,
} from "@blockchain/artifact";
import {
  BaseContract,
  ValidateRecentReceiptQuery,
} from "@blockchain/base-contract";
import {
  EVENTS,
  ADDED_TO_CONTROL_LIST_MULTIPLE_EVENTS_WARNING,
  REMOVED_FROM_CONTROL_LIST_MULTIPLE_EVENTS_WARNING,
  AddedToControlListAccountNotExpectedError,
  AddedToControlListLengthError,
  AddedToControlListOperatorNotSenderError,
  AddToControlListCommand,
  IsInControlListQuery,
  RemovedFromControlListAccountNotExpectedError,
  RemovedFromControlListLengthError,
  RemovedFromControlListOperatorNotSenderError,
  RemoveFromControlListCommand,
  RemoveFromControlListResponse,
  type AddToControlListResponse,
  type IAtsControlList,
  type NewAtsControlListCommand,
} from "@blockchain/AtsControlList";
import Event from "blockchain/Event";
import { Separator } from "@inquirer/prompts";
import eventBus, { CIRCLE_COMPLIANCE_CHECK_PERFORMED } from "@events";
import { ComplianceStatus } from "@circle";
import Time from "@time";

const { abi: ABI } = AtsControlListArtifact;

export default class AtsControlList
  extends BaseContract<typeof ABI>
  implements IAtsControlList
{
  private _checkingCompliance = false;
  constructor({ address, account }: NewAtsControlListCommand) {
    super({
      abi: ABI,
      address,
      account,
      eventList: AtsControlList.events,
    });
    this._setupNodeEventListeners();
  }

  public async addToControlList({
    accountAddress,
  }: AddToControlListCommand): Promise<AddToControlListResponse> {
    // First check if the account is already in the control list
    const isInControlList = await this.isInControlList({ accountAddress });
    if (isInControlList) {
      console.log(
        `🟠 Address ${accountAddress} is already in the ATS Control List. NO ACTION WILL BE TAKEN`,
      );
      return {
        accountAddress,
      } as AddToControlListResponse;
    }
    // If not, proceed to add it to the control list
    return this._addToControlList(
      new AddToControlListCommand({
        accountAddress,
      }),
    );
  }

  public async removeFromControlList({
    accountAddress,
  }: RemoveFromControlListCommand): Promise<RemoveFromControlListResponse> {
    // First check if the account is in the control list
    const isInControlList = await this.isInControlList({ accountAddress });
    if (!isInControlList) {
      console.log(
        `🟠 Address ${accountAddress} is not in the ATS Control List. NO ACTION WILL BE TAKEN`,
      );
      return {
        accountAddress,
      } as RemoveFromControlListResponse;
    }
    // If it is, proceed to remove it from the control list
    return this._removeFromControlList(
      new RemoveFromControlListCommand({
        accountAddress,
      }),
    );
  }

  public async isInControlList({
    accountAddress,
  }: IsInControlListQuery): Promise<boolean> {
    while (this._checkingCompliance) {
      console.log(
        `[⚙️ Admin Backend⚙️ ] 🕒 Waiting for compliance check to complete...`,
      );
      await Time.wait({ duration: 4 });
    }
    const isInControlList = await this.instance.read.isInControlList([
      accountAddress,
    ]);

    return isInControlList;
  }

  public static get events(): Event[] {
    return [
      new Event({
        name: EVENTS.ADDED_TO_CONTROL_LIST,
        func: (logs) => {
          logs.forEach((log) => {
            console.log(new Separator().separator);
            console.log(
              `[⚙️ Admin Backend⚙️ ] 🎯 Added to control list event detected - (⛓️ TxHash: ${log.transactionHash})`,
            );
            if (log.topics[2]) {
              console.log(`  - Address added: ${log.topics[2]}`);
            } else {
              console.warn("  - Address added: Not available in logs");
            }
            console.log(new Separator().separator);
          });
        },
      }),
    ];
  }

  // * Private Methods

  private async _addToControlList({
    accountAddress,
  }: AddToControlListCommand): Promise<AddToControlListResponse> {
    const txHash = await this.instance.write.addToControlList(
      [accountAddress],
      {
        account: this._account.account,
        chain: this.chain,
        gas: 1200000n, // Set a reasonable gas limit
      },
    );

    // Get the transaction receipt
    const txReceipt = await this._validateRecentReceipt(
      new ValidateRecentReceiptQuery({ txHash, log: true }),
    );
    const addedToControlListEvents =
      await this.instance.getEvents.AddedToControlList(
        { operator: this._account.address, account: accountAddress },
        {
          fromBlock: txReceipt.blockNumber,
          toBlock: txReceipt.blockNumber,
          strict: true,
        },
      );

    this._validateAddedToControlList({
      addedToControlListEvents,
      accountAddress,
    });

    return {
      txReceipt,
      accountAddress,
    } as AddToControlListResponse;
  }

  private async _removeFromControlList({
    accountAddress,
  }: RemoveFromControlListCommand): Promise<RemoveFromControlListResponse> {
    const txHash = await this.instance.write.removeFromControlList(
      [accountAddress],
      {
        account: this._account.account,
        chain: this.chain,
        gas: 1200000n, // Set a reasonable gas limit
      },
    );

    // Get the transaction receipt
    const txReceipt = await this._validateRecentReceipt(
      new ValidateRecentReceiptQuery({ txHash, log: true }),
    );

    const removeFromControlListEvents =
      await this.instance.getEvents.RemovedFromControlList(
        { operator: this._account.address, account: accountAddress },
        {
          fromBlock: txReceipt.blockNumber,
          toBlock: txReceipt.blockNumber,
          strict: true,
        },
      );

    this._validateRemoveFromControlList({
      removeFromControlListEvents,
      accountAddress,
    });

    // No specific event for removal, so we just return the receipt
    return {
      txReceipt,
      accountAddress,
    } as RemoveFromControlListResponse;
  }

  private async _isInControlList({
    accountAddress,
  }: IsInControlListQuery): Promise<boolean> {
    // Check if the account is in the control list
    const isInControlList = await this.instance.read.isInControlList([
      accountAddress,
    ]);
    return isInControlList;
  }

  private _validateAddedToControlList({
    addedToControlListEvents,
    accountAddress,
  }: {
    addedToControlListEvents: AddedToControlListEventList;
    accountAddress: Address;
  }) {
    if (addedToControlListEvents.length === 0) {
      throw new AddedToControlListLengthError();
    }
    if (addedToControlListEvents.length > 1) {
      console.warn(ADDED_TO_CONTROL_LIST_MULTIPLE_EVENTS_WARNING);
    }

    const event = addedToControlListEvents[0];
    if (event.args.operator !== this._account.address) {
      throw new AddedToControlListOperatorNotSenderError();
    }
    if (event.args.account !== accountAddress) {
      throw new AddedToControlListAccountNotExpectedError();
    }

    return {
      addedToControlListEvent: event,
      operator: event.args.operator,
      accountAddress: event.args.account,
    };
  }

  private _validateRemoveFromControlList({
    removeFromControlListEvents,
    accountAddress,
  }: {
    removeFromControlListEvents: RemovedFromControlListEventList;
    accountAddress: Address;
  }) {
    if (removeFromControlListEvents.length === 0) {
      throw new RemovedFromControlListLengthError();
    }
    if (removeFromControlListEvents.length > 1) {
      console.warn(REMOVED_FROM_CONTROL_LIST_MULTIPLE_EVENTS_WARNING);
    }

    const event = removeFromControlListEvents[0];
    if (event.args.operator !== this._account.address) {
      throw new RemovedFromControlListOperatorNotSenderError();
    }
    if (event.args.account !== accountAddress) {
      throw new RemovedFromControlListAccountNotExpectedError();
    }

    return {
      removedFromControlListEvent: event,
      operator: event.args.operator,
      accountAddress: event.args.account,
    };
  }

  private _setupNodeEventListeners() {
    eventBus.on(
      CIRCLE_COMPLIANCE_CHECK_PERFORMED,
      async ({
        address,
        complianceStatus,
      }: {
        address: Address;
        complianceStatus: ComplianceStatus;
      }) => {
        this._checkingCompliance = true;
        const isInControlList = await this._isInControlList({
          accountAddress: address,
        });
        if (complianceStatus === ComplianceStatus.APPROVED) {
          if (isInControlList) {
            console.log(
              `\n[⚙️ Admin Backend⚙️ ] 🟠 Approved address ${address} is in the control list, removing...`,
            );
            const removeFromControlListResult =
              await this._removeFromControlList(
                new RemoveFromControlListCommand({
                  accountAddress: address,
                }),
              );
            if (removeFromControlListResult) {
              console.log(
                `[⚙️ Admin Backend⚙️ ] ✅ Approved address ${address} removed from the control list successfully!`,
              );
            }
          }
          console.log(`\n`);
        } else if (complianceStatus === ComplianceStatus.DENIED) {
          if (!isInControlList) {
            console.log(
              `\n[⚙️ Admin Backend⚙️ ] 🔴 Denied address ${address} is not in the control list, adding...`,
            );
            const addToControlListResult = await this._addToControlList(
              new AddToControlListCommand({
                accountAddress: address,
              }),
            );
            if (addToControlListResult) {
              console.log(
                `[⚙️ Admin Backend⚙️ ] ✅ Denied address ${address} added to the control list successfully!`,
              );
            }
          }
          console.log(`\n`);
        }
        this._checkingCompliance = false;
      },
    );
  }
}
