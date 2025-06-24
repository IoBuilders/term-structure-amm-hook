import { confirm } from '@inquirer/prompts';
import { THEME } from '@configuration';
import { type Address } from 'viem';
import {
    AddToControlListCommand,
    RemoveFromControlListCommand,
    RemoveFromControlListResponse,
    type AddToControlListResponse,
    type AtsControlList,
} from '@blockchain/AtsControlList';

export default class AtsInquirer {
    private _controlList: AtsControlList;

    constructor(controlList: AtsControlList) {
        this._controlList = controlList;
    }

    public async inquireAddToControlList({
        accountToAdd,
    }: {
        accountToAdd: Address;
    }): Promise<AddToControlListResponse | undefined> {
        try {
            const response = await this._controlList.addToControlList(
                new AddToControlListCommand({
                    accountAddress: accountToAdd,
                })
            );
            return response;
        } catch (error) {
            if (error instanceof Error) {
                console.error(
                    `❌ Error adding to control list: ${error.message}`
                );
                throw error;
            } else {
                console.error(
                    `❌ Error adding to control list: ${String(error)}`
                );
                throw new Error(
                    `❌ Error adding to control list: ${String(error)}`
                );
            }
        }
    }

    public async inquireRemoveFromControlList({
        accountToRemove,
    }: {
        accountToRemove: Address;
    }): Promise<RemoveFromControlListResponse | undefined> {
        try {
            const response = await this._controlList.removeFromControlList(
                new RemoveFromControlListCommand({
                    accountAddress: accountToRemove,
                })
            );
            return response;
        } catch (error) {
            if (error instanceof Error) {
                console.error(
                    `❌ Error removing from control list: ${error.message}`
                );
                throw error;
            } else {
                console.error(
                    `❌ Error removing from control list: ${String(error)}`
                );
                throw new Error(
                    `❌ Error removing from control list: ${String(error)}`
                );
            }
        }
    }

    public async inquireIsInControlList({
        accountToCheck,
    }: {
        accountToCheck: Address;
    }): Promise<boolean> {
        const isInControlList = await this._controlList.isInControlList({
            accountAddress: accountToCheck,
        });
        return isInControlList;
    }
}
