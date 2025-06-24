import {
    createWalletClient,
    createPublicClient,
    http,
    type Address,
    type Client,
    type HDAccount,
    type PublicClient,
    type LocalAccount,
    type Hex,
} from 'viem';
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts';

// Define the constructor parameters as a discriminated union
type AccountConstructorParams = {
    rpcUrl: string;
} & (
    | {
          mnemonic: string;
          number?: number;
          privateKey?: never; // Ensure privateKey is not provided when mnemonic is
      }
    | {
          privateKey: Hex;
          mnemonic?: never; // Ensure mnemonic is not provided when privateKey is
          number?: never;
      }
);

export default class Account {
    private _mnemonic?: string;
    private _privateKey?: Hex;
    private _number: number;
    private _rpcUrl: string;

    /**
     * Constructs an instance of the Account class.
     *
     * @param {AccountConstructorParams} params - The parameters for the constructor.
     */
    constructor(params: AccountConstructorParams) {
        this._rpcUrl = params.rpcUrl;
        if (params.mnemonic) {
            this._mnemonic = params.mnemonic;
            this._number = params.number || 0;
        } else if (params.privateKey) {
            this._privateKey = params.privateKey;
            this._number = 0; // Not used for private key, but set to a default
        } else {
            throw new Error('Either mnemonic or privateKey must be provided.');
        }
        this._checkBlockchainConnection();
    }

    /**
     * Gets the address associated with this account.
     *
     * @returns {Address} The address of the account.
     */
    get address(): Address {
        return this.account.address;
    }

    /**
     * Retrieves the Account (either HD or Local)
     *
     * @returns {HDAccount | LocalAccount<string>} The account generated from the mnemonic or private key.
     */
    get account(): HDAccount | LocalAccount<string> {
        if (this._mnemonic) {
            return mnemonicToAccount(this._mnemonic, {
                addressIndex: this._number,
            });
        }
        // The check in the constructor ensures that if _mnemonic is not present, _privateKey is.
        return privateKeyToAccount(this._privateKey!);
    }

    /**
     * Getter for the `client` property.
     *
     * @returns {Client} A new instance of `Client` configured with the current account and RPC URL.
     */
    get client(): Client {
        return createWalletClient({
            account: this.account,
            transport: http(this._rpcUrl),
        });
    }

    /**
     * Gets the public client instance.
     *
     * @returns {PublicClient} The public client configured with the specified RPC URL.
     */
    get publicClient(): PublicClient {
        return createPublicClient({
            transport: http(this._rpcUrl),
        });
    }

    /**
     * Gets the blockchain network associated with the public client.
     *
     * @returns The blockchain network.
     */
    get chain() {
        return this.publicClient.chain;
    }

    // * Private methods

    private async _checkBlockchainConnection(): Promise<boolean> {
        try {
            const blockNumber = await this.publicClient.getBlockNumber();
            if (blockNumber) {
                return true;
            } else {
                throw new Error('Failed to retrieve block number.');
            }
        } catch (error) {
            throw new Error(
                `❌ ⛓️ Failed to connect to the blockchain. Please check RPC connection: ${error}`
            );
        }
    }
}
