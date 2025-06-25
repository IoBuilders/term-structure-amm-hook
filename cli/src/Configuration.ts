import fs from "fs";
import path from "path";
import { hexToBigInt, type Address, type Hex } from "viem";
import { Separator } from "@inquirer/core";
import type { PoolKey } from "@hook";

export const CONTROL_LIST_ROLE: Hex =
  "0xca537e1c88c9f52dc5692c96c482841c3bea25aafc5f3bfe96f645b5f800cac3";

export const INT16_MAX = 32767;
export const MAX_SQRT_PRICE =
  1461446703485210103287273052203988822378723970342n;
export const MIN_SQRT_PRICE = 4295128739n;

const RPC_URL_ERROR_MESSAGE = "❌ Please set your RPC_URL in an .env file";
const PRIVATE_KEY_ADMIN_ERROR_MESSAGE =
  "❌ Please set your PRIVATE_KEY_ADMIN in an .env file";
const PRIVATE_KEY_VALID_ERROR_MESSAGE =
  "❌ Please set your PRIVATE_KEY_VALID in an .env file";
const PRIVATE_KEY_INVALID_ERROR_MESSAGE =
  "❌ Please set your PRIVATE_KEY_INVALID in an .env file";
export const CIRCLE_API_COMPLIANCE_NOT_ENABLED_WARN_MESSAGE = `🟠 Circle API compliance check \x1b[31mdisabled\x1b[0m. Please set the environment variable \x1b[33mCIRCLE_API_KEY\x1b[0m to enable it.`;
const CIRCLE_API_KEY_ERROR_MESSAGE =
  "❌ Please set your CIRCLE_API_KEY in an .env file";
const CIRCLE_API_COMPLIANCE_SCREENING_URL_ERROR_MESSAGE =
  "❌ Please set your CIRCLE_API_COMPLIANCE_SCREENING_URL in an .env file";
const CIRCLE_API_COMPLIANCE_SCREENING_CHAIN_ERROR_MESSAGE =
  "❌ Please set your CIRCLE_API_COMPLIANCE_SCREENING_CHAIN in an .env file";
const ATS_BOND_ADDR_ERROR_MESSAGE =
  "❌ Bond address not found in deployments file";
const ROUTER_ADDR_ERROR_MESSAGE =
  "❌ Router address not found in deployments file";
const EUR_ADDR_ERROR_MESSAGE = "❌ Eur address not found in deployments file";
const LP_TOKEN_ADDR_ERROR_MESSAGE =
  "❌ Lp token address not found in deployments file";
const HOOK_HUB_ADDR_ERROR_MESSAGE =
  "❌ Please set your HOOK_HUB_ADDR in an .env file";

const DEFAULT_CIRCLE_API_COMPLIANCE_SCREENING_URL =
  "https://api.circle.com/v1/w3s/compliance/screening/addresses";

export const DEFAULT_CIRCLE_API_COMPLIANCE_SCREENING_CHAIN = "ETH-SEPOLIA";

const deploymentsPath = path.resolve(
  __dirname,
  "../../contracts/config/hook/deployments.json",
);
const deploymentsData = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));

export enum HttpMethods {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
}

export const THEME = {
  prefix: { idle: "❓", done: "✅" },
  spinner: {
    interval: 10000,
    frames: ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"],
  },
  icon: {
    cursor: "→",
  },
};

export const BIG_SEPARATOR = `\n${new Separator().separator}\n${
  new Separator().separator
}\n`;

interface circleEnvVariables {
  apiComplianceEnabled: boolean;
  apiKey?: string;
  apiComplianceScreeningUrl: string;
  apiComplianceScreeningChain: string;
}

export interface EnvironmentVariables {
  privateKeyAdmin: Hex;
  privateKeyValid: Hex;
  privateKeyInvalid: Hex;
  rpcUrl: string;
  circle: circleEnvVariables;
  atsBondAddr: Address;
  routerAddr: Address;
  eurAddr: Address;
  hookHubAddr: Address;
  lpTokenAddr: Address;
}

export default class Configuration {
  private _privateKeyAdmin: Hex;
  private _privateKeyValid: Hex;
  private _privateKeyInvalid: Hex;
  private _rpcUrl: string;
  private _circle: circleEnvVariables;
  private _atsBondAddr: Address;
  private _routerAddr: Address;
  private _eurAddr: Address;
  private _hookHubAddr: Address;
  private _poolKey: PoolKey;
  private _lpTokenAddr: Address;

  /**
   * Constructs a new instance of the Configuration class.
   *
   * @param {Object} params - The parameters for the constructor.
   * @param {string} params.privateKeyAdmin - The admin private key.
   * @param {string} params.privateKeyValid - The valid private key.
   * @param {string} params.privateKeyInvalid - The invalid private key.
   * @param {string} params.rpcUrl - The RPC URL.
   * @param {circleEnvVariables} params.circle - The Circle environment variables.
   * @param {Address} params.atsBondAddr - The ATS Bond address.
   * @param {Address} params.routerAddr - The Router address.
   * @param {Address} params.eurAddr - The EUR address.
   * @param {Address} params.hookHubAddr - The Hook Hub address.
   * @param {PoolKey} params.poolKey - The Pool Key.
   * @param {PoolKey} params.lpTokenAddr - The LP token address.
   */
  constructor({
    privateKeyAdmin,
    privateKeyValid,
    privateKeyInvalid,
    rpcUrl,
    circle,
    atsBondAddr,
    routerAddr,
    eurAddr,
    hookHubAddr,
    lpTokenAddr,
  }: EnvironmentVariables) {
    this._privateKeyAdmin = privateKeyAdmin;
    this._privateKeyValid = privateKeyValid;
    this._privateKeyInvalid = privateKeyInvalid;
    this._rpcUrl = rpcUrl;
    this._circle = circle;
    this._atsBondAddr = atsBondAddr;
    this._routerAddr = routerAddr;
    this._eurAddr = eurAddr;
    this._hookHubAddr = hookHubAddr;
    this._lpTokenAddr = lpTokenAddr;
    this._poolKey = {
      currency0:
        hexToBigInt(atsBondAddr) < hexToBigInt(eurAddr) ? atsBondAddr : eurAddr,
      currency1:
        hexToBigInt(atsBondAddr) < hexToBigInt(eurAddr) ? eurAddr : atsBondAddr,
      fee: 0,
      tickSpacing: INT16_MAX,
      hooks: hookHubAddr,
    };
  }

  /**
   * Creates a new Configuration instance from environment variables.
   *
   * This method reads the environment variables and uses them to create a new Configuration instance.
   * If any of these environment variables are not set, an error is thrown.
   *
   * @returns {Promise<Configuration>} A promise that resolves to a new Configuration instance.
   * @throws {Error} If any of the required environment variables are not set.
   */
  public static async fromEnv(): Promise<Configuration> {
    // * Check if all required environment variables are set
    const {
      privateKeyAdmin,
      privateKeyValid,
      privateKeyInvalid,
      rpcUrl,
      circle,
      atsBondAddr,
      routerAddr,
      eurAddr,
      hookHubAddr,
      lpTokenAddr,
    } = this._validateAllEnvs();

    return new Configuration({
      privateKeyAdmin,
      privateKeyValid,
      privateKeyInvalid,
      rpcUrl,
      circle,
      atsBondAddr,
      routerAddr,
      eurAddr,
      hookHubAddr,
      lpTokenAddr,
    });
  }

  /**
   * Obfuscates a given mnemonic phrase by replacing each word with "****" and partially revealing the last two words.
   *
   * @param {Object} param - The parameter object.
   * @param {string} param.mnemonic - The mnemonic phrase to be obfuscated.
   * @returns {string} The obfuscated private key.
   */
  public static obfuscatePrivateKey({
    privateKey,
  }: {
    privateKey: string;
  }): string {
    // Obfuscate all but the first 2 and last 6 characters
    if (privateKey.length < 10) return "****";
    return (
      privateKey.slice(0, 2) +
      "*".repeat(privateKey.length - 8) +
      privateKey.slice(-6)
    );
  }

  public static obfuscateString({ input }: { input: string }): string {
    // Obfuscate all but the first 4 and last 4 characters
    if (input.length < 8) return "****";
    return input.slice(0, 4) + "*".repeat(input.length - 8) + input.slice(-4);
  }

  // * Getters for configuration variables

  /**
   * Gets the valid admin private key.
   *
   * @returns {Hex} The valid admin private key.
   */
  get privateKeyAdmin(): Hex {
    return this._privateKeyAdmin;
  }

  /**
   * Gets the obfuscated admin private key.
   *
   * @returns {string} The obfuscated admin private key.
   */
  get privateKeyAdminObfuscated(): string {
    return Configuration.obfuscatePrivateKey({
      privateKey: this._privateKeyAdmin,
    });
  }

  /**
   * Gets the valid private key.
   *
   * @returns {Hex} The valid private key.
   */
  get privateKeyValid(): Hex {
    return this._privateKeyValid;
  }

  /**
   * Gets the obfuscated valid private key.
   *
   * @returns {string} The obfuscated valid private key.
   */
  get privateKeyValidObfuscated(): string {
    return Configuration.obfuscatePrivateKey({
      privateKey: this._privateKeyValid,
    });
  }

  /**
   * Gets the invalid private key.
   *
   * @returns {Hex} The invalid private key.
   */
  get privateKeyInvalid(): Hex {
    return this._privateKeyInvalid;
  }

  /**
   * Gets the obfuscated invalid private key.
   *
   * @returns {string} The obfuscated invalid private key.
   */
  get privateKeyInvalidObfuscated(): string {
    return Configuration.obfuscatePrivateKey({
      privateKey: this._privateKeyInvalid,
    });
  }

  /**
   * Gets the RPC URL.
   *
   * @returns {string} The RPC URL.
   */
  get rpcUrl(): string {
    return this._rpcUrl;
  }

  get circleApiKey(): string | undefined {
    return this._circle.apiKey;
  }

  get obfuscatedCircleApiKey(): string | undefined {
    return Configuration.obfuscateString({
      input: this._circle.apiKey ? this._circle.apiKey : "",
    });
  }

  get circleApiComplianceScreeningUrl(): string {
    return this._circle.apiComplianceScreeningUrl;
  }

  get circleApiComplianceScreeningChain(): string {
    return this._circle.apiComplianceScreeningChain;
  }

  get circleApiComplianceEnabled(): boolean {
    return this._circle.apiComplianceEnabled;
  }

  /**
   * Gets the Circle environment variables.
   *
   * @returns {circleEnvVariables} The Circle environment variables.
   */
  get circleEnvVariables(): circleEnvVariables {
    return this._circle;
  }

  /**
   * Gets the address of the bond.
   *
   * @returns {string} The address of the W3C resolver.
   */
  get atsBondAddr(): Address {
    return this._atsBondAddr;
  }

  /**
   * Gets the address of the Router.
   * @returns {Address} The address of the Router.
   */
  get routerAddr(): Address {
    return this._routerAddr;
  }

  /**
   * Gets the address of the EUR token.
   *
   * @returns {Address} The address of the EUR token.
   */
  get eurAddr(): Address {
    return this._eurAddr;
  }

  /**
   * Gets the address of the Hook Hub.
   *
   * @returns {Address} The address of the Hook Hub.
   */
  get hookHubAddr(): Address {
    return this._hookHubAddr;
  }

  /**
   * Gets the address of the LP token.
   *
   * @returns {Address} The address of the LP token.
   */
  get lpTokenAddr(): Address {
    return this._lpTokenAddr;
  }

  /**
   * Gets the Pool Key.
   *
   * @returns {PoolKey} The Pool Key.
   */
  get poolKey(): PoolKey | undefined {
    return this._poolKey;
  }

  /**
   * Gets the addresses.
   *
   * @returns {Address[]} An array of addresses
   */
  get addresses(): Address[] {
    return [
      this.atsBondAddr,
      this.routerAddr,
      this.eurAddr,
      this.hookHubAddr,
      this.lpTokenAddr,
    ].filter((addr) => addr !== undefined) as Address[];
  }

  // * Validators
  /**
   * Executes all environment checks by invoking the mnemonic, didManagerAddr, and rpcUrl methodList.
   * This method ensures that all necessary environment variables are properly set and validated.
   */
  private static _validateAllEnvs(): EnvironmentVariables {
    // * Required environment variables
    const privateKeyAdmin = this._validatePrivateKeyAdmin();
    const privateKeyValid = this._validatePrivateKeyValid();
    const privateKeyInvalid = this._validatePrivateKeyInvalid();
    const rpcUrl = this._validateRpcUrl();
    const atsBondAddr = this._validateAtsBondAddr();
    const routerAddr = this._validateRouterAddr();
    const eurAddr = this._validateEurAddr();
    const hookHubAddr = this._validateHookHubAddr();
    const lpTokenAddr = this._validateLpTokenAddr();
    const circle = this._validateCircleEnv();
    return {
      privateKeyAdmin,
      privateKeyValid,
      privateKeyInvalid,
      rpcUrl,
      circle,
      atsBondAddr,
      routerAddr,
      eurAddr,
      hookHubAddr,
      lpTokenAddr,
    };
  }

  /**
   * Checks if the `RPC_URL` environment variable is set.
   * If the `RPC_URL` environment variable is not set, it throws a `RpcUrlError`.
   *
   * @throws {RpcUrlError} If the `RPC_URL` environment variable is not set.
   */
  private static _validateRpcUrl(): string {
    if (!process.env.RPC_URL) {
      throw new RpcUrlError();
    }
    return process.env.RPC_URL;
  }

  /**
   * Validates the admin private key environment variable.
   *
   * @returns {Hex} The valid admin private key.
   * @throws {PrivateKeyAdminError} If the `PRIVATE_KEY_ADMIN` environment variable is not set.
   */
  private static _validatePrivateKeyAdmin(): Hex {
    if (!process.env.PRIVATE_KEY_ADMIN) {
      throw new PrivateKeyAdminError();
    }
    return process.env.PRIVATE_KEY_ADMIN as Hex;
  }

  /**
   * Validates the private key environment variables.
   *
   * @returns {Hex} The valid private key.
   * @throws {PrivateKeyValidError} If the `PRIVATE_KEY_VALID` environment variable is not set.
   * @throws {PrivateKeyInvalidError} If the `PRIVATE_KEY_INVALID` environment variable is not set.
   */
  private static _validatePrivateKeyValid(): Hex {
    if (!process.env.PRIVATE_KEY_VALID) {
      throw new PrivateKeyValidError();
    }
    return process.env.PRIVATE_KEY_VALID as Hex;
  }

  /**
   * Validates the invalid private key environment variable.
   *
   * @returns {Hex} The invalid private key.
   * @throws {PrivateKeyInvalidError} If the `PRIVATE_KEY_INVALID` environment variable is not set.
   */
  private static _validatePrivateKeyInvalid(): Hex {
    if (!process.env.PRIVATE_KEY_INVALID) {
      throw new PrivateKeyInvalidError();
    }
    return process.env.PRIVATE_KEY_INVALID as Hex;
  }
  /**
   * Validates the ATS Bond address environment variable.
   *
   * @returns {Address} The ATS Bond address.
   * @throws {AtsBondAddrError} If the `bond` environment variable is not set.
   */
  private static _validateAtsBondAddr(): Address {
    const bond = deploymentsData?.bond.address;

    if (!bond) {
      throw new AtsBondAddrError();
    }
    return bond as Address;
  }

  /**
   * Validates the Router address environment variable.
   *
   * @returns {Address} The Router address.
   * @throws {Error} If the `router` environment variable is not set.
   */
  private static _validateRouterAddr(): Address {
    const router = deploymentsData?.router.address;

    if (!router) {
      throw new RouterAddrError();
    }
    return router as Address;
  }

  /**
   * Validates the EUR address environment variable.
   *
   * @returns {Address} The EUR address.
   * @throws {Error} If the `eur` environment variable is not set.
   */
  private static _validateEurAddr(): Address {
    const eur = deploymentsData?.eur.address;

    if (!eur) {
      throw new EurAddrError();
    }
    return eur as Address;
  }
  /**
   * Validates the LP token address environment variable.
   *
   * @returns {Address} The LP token address.
   * @throws {Error} If the `lpToken` environment variable is not set.
   */
  private static _validateLpTokenAddr(): Address {
    const lpToken = deploymentsData?.lpToken.address;

    if (!lpToken) {
      throw new LpTokenAddrErrror();
    }
    return lpToken as Address;
  }

  /**
   * Validates the Hook Hub address environment variable.
   *
   * @returns {Address} The Hook Hub address.
   * @throws {Error} If the `bondHookHub` environment variable is not set.
   */
  private static _validateHookHubAddr(): Address {
    const hookHub = deploymentsData?.bondHookHub.address;

    if (!hookHub) {
      throw new HookHubAddrError();
    }
    return hookHub as Address;
  }

  /**
   * Validates the Circle environment variables.
   *
   * @returns {circleEnvVariables} An object containing the Circle API key and compliance screening URL.
   * @throws {Error} If the Circle API key or compliance screening URL is not set.
   */
  private static _validateCircleEnv(): circleEnvVariables {
    // apiComplianceEnabled set to false if false, otherwise true
    const apiComplianceEnabled =
      process.env.CIRCLE_API_COMPLIANCE_ENABLED !== "false";
    const apiKey = process.env.CIRCLE_API_KEY;
    const apiComplianceScreeningUrl =
      process.env.CIRCLE_API_COMPLIANCE_SCREENING_URL ||
      DEFAULT_CIRCLE_API_COMPLIANCE_SCREENING_URL;
    const apiComplianceScreeningChain =
      process.env.CIRCLE_API_COMPLIANCE_SCREENING_CHAIN ||
      DEFAULT_CIRCLE_API_COMPLIANCE_SCREENING_CHAIN;

    if (apiComplianceEnabled) {
      if (!apiKey) {
        throw new CircleApiKeyError();
      }
      if (!apiComplianceScreeningUrl) {
        throw new CircleApiComplianceScreeningUrlError();
      }
      if (!apiComplianceScreeningChain) {
        throw new CircleApiComplianceScreeningChainError();
      }
    }

    return {
      apiKey,
      apiComplianceScreeningUrl,
      apiComplianceScreeningChain,
      apiComplianceEnabled,
    };
  }
}

/**
 * @class RpcUrlError
 * @extends {Error}
 *
 * @description
 * Represents an error that occurs when there is an issue with the RPC URL.
 * This error is thrown when the RPC URL is invalid or not properly configured.
 *
 * @example
 * throw new RpcUrlError();
 */
class RpcUrlError extends Error {
  constructor() {
    super(RPC_URL_ERROR_MESSAGE);
  }
}

/**
 * @class PrivateKeyAdminError
 * @extends {Error}
 *
 * @description
 * Custom error class for handling errors related to the admin private key.
 *
 * @example
 * ```typescript
 * throw new PrivateKeyAdminError();
 * ```
 */
class PrivateKeyAdminError extends Error {
  constructor() {
    super(PRIVATE_KEY_ADMIN_ERROR_MESSAGE);
  }
}

/**
 * @class PrivateKeyError
 * @extends {Error}
 *
 * @description
 * Custom error class for handling errors related to the Private key.
 *
 * @example
 * ```typescript
 * throw new PrivateKeyError();
 * ```
 */
class PrivateKeyValidError extends Error {
  constructor() {
    super(PRIVATE_KEY_VALID_ERROR_MESSAGE);
  }
}

/**
 * @class PrivateKeyInvalidError
 * @extends {Error}
 *
 * @description
 * Custom error class for handling errors related to the invalid private key.
 *
 * @example
 * ```typescript
 * throw new PrivateKeyInvalidError();
 * ```
 */
class PrivateKeyInvalidError extends Error {
  constructor() {
    super(PRIVATE_KEY_INVALID_ERROR_MESSAGE);
  }
}

/**
 * @class AtsBondAddrError
 * @extends {Error}
 *
 * @description
 * Custom error class for handling errors related to the ATS Bond address.
 *
 * @example
 * ```typescript
 * throw new AtsBondAddrError();
 * ```
 */
class AtsBondAddrError extends Error {
  constructor() {
    super(ATS_BOND_ADDR_ERROR_MESSAGE);
  }
}

/**
 * @class RouterAddrError
 * @extends {Error}
 *
 * @description
 * Custom error class for handling errors related to the Router address.
 *
 * @example
 * ```typescript
 * throw new RouterAddrError();
 * ```
 */
class RouterAddrError extends Error {
  constructor() {
    super(ROUTER_ADDR_ERROR_MESSAGE);
  }
}

/**
 * @class EurAddrError
 * @extends {Error}
 *
 * @description
 * Custom error class for handling errors related to the EUR address.
 *
 * @example
 * ```typescript
 * throw new EurAddrError();
 * ```
 * */
class EurAddrError extends Error {
  constructor() {
    super(EUR_ADDR_ERROR_MESSAGE);
  }
}

class LpTokenAddrErrror extends Error {
  constructor() {
    super(LP_TOKEN_ADDR_ERROR_MESSAGE);
  }
}

/**
 * @class HookHubAddrError
 * @extends {Error}
 *
 * @description
 * Custom error class for handling errors related to the Hook Hub address.
 *
 * @example
 * ```typescript
 * throw new HookHubAddrError();
 * ```
 */
class HookHubAddrError extends Error {
  constructor() {
    super(HOOK_HUB_ADDR_ERROR_MESSAGE);
  }
}

/**
 * @class CircleApiKeyError
 * @extends {Error}
 *
 * @description
 * Custom error class for handling errors related to the Circle API key.
 *
 * @example
 * throw new CircleApiKeyError();
 */
class CircleApiKeyError extends Error {
  constructor() {
    super(CIRCLE_API_KEY_ERROR_MESSAGE);
  }
}

/**
 * @class CircleApiComplianceScreeningUrlError
 * @extends {Error}
 *
 * @description
 * Should not be thrown because the Circle API compliance screening URL is set to a default value.
 * Custom error class for handling errors related to the Circle API compliance screening URL.
 *
 * @example
 * throw new CircleApiComplianceScreeningUrlError();
 */
class CircleApiComplianceScreeningUrlError extends Error {
  constructor() {
    super(CIRCLE_API_COMPLIANCE_SCREENING_URL_ERROR_MESSAGE);
  }
}
/**
 * @class CircleApiComplianceScreeningChainError
 * @extends {Error}
 *
 * @description
 * Should not be thrown because the Circle API compliance screening chain is set to a default value.
 * Custom error class for handling errors related to the Circle API compliance screening chain.
 *
 * @example
 * throw new CircleApiComplianceScreeningChainError();
 */
class CircleApiComplianceScreeningChainError extends Error {
  constructor() {
    super(CIRCLE_API_COMPLIANCE_SCREENING_CHAIN_ERROR_MESSAGE);
  }
}
