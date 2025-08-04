import { parseEther, formatEther, hexToBigInt, type Address } from "viem";
import { input, confirm } from "@inquirer/prompts";
import {
  THEME,
  INT16_MAX,
  MIN_SQRT_PRICE,
  MAX_SQRT_PRICE,
} from "@configuration";
import {
  NewRouterCommand,
  Router,
  SwapCommand,
  SwapResponse,
} from "@blockchain/Router";
import { ERC20 } from "@blockchain/ERC20";
import { BalanceOfQuery } from "blockchain/ERC20";
import type { ModifyLiquidityParams, PoolKey, SwapParams } from "@hook";
import type { Account } from "@blockchain";
import NewERC20Command from "blockchain/ERC20/command/NewERC20Command";
import { HookHub, NewHookHubCommand } from "@blockchain/HookHub";
import type ModifyLiquidityResponse from "blockchain/HookHub/response/ModifyLiquidityResponse";
import ModifyLiquidiyCommand from "blockchain/HookHub/command/ModifyLiquidiyCommand";

export default class HookInquirer {
  private _router: Router;
  private _poolKey: PoolKey;
  private _bond: ERC20;
  private _eur: ERC20;
  private _lpToken: ERC20;
  private _hookHub: HookHub;

  constructor(
    router: Router,
    bond: ERC20,
    eur: ERC20,
    lpToken: ERC20,
    hookHub: HookHub,
  ) {
    this._router = router;
    this._poolKey = router.poolKey;
    this._bond = bond;
    this._eur = eur;
    this._lpToken = lpToken;
    this._hookHub = hookHub;
  }

  set account(account: Account) {
    this._router.account = account;
    this._bond.account = account;
    this._eur.account = account;
    this._lpToken.account = account;
    this._hookHub.account = account;
  }

  public static async create({
    bond,
    routerAddress,
    eur,
    hookHubAddress,
    lpTokenAddress,
    fee = 0,
    tickSpacing = INT16_MAX,
    account,
  }: {
    bond: ERC20;
    routerAddress: Address;
    eur: ERC20;
    hookHubAddress: Address;
    lpTokenAddress: Address;
    fee?: number;
    tickSpacing?: number;
    account: Account;
  }): Promise<HookInquirer> {
    const poolKey: PoolKey = {
      currency0:
        hexToBigInt(bond.address) < hexToBigInt(eur.address)
          ? bond.address
          : eur.address,
      currency1:
        hexToBigInt(bond.address) < hexToBigInt(eur.address)
          ? eur.address
          : bond.address,
      fee,
      tickSpacing,
      hooks: hookHubAddress,
    };
    const router = new Router(
      new NewRouterCommand(
        {
          address: routerAddress,
          account,
        },
        poolKey,
      ),
    );
    const lpToken = new ERC20(
      new NewERC20Command({
        address: lpTokenAddress,
        account,
      }),
    );
    const hookHub = new HookHub(
      new NewHookHubCommand({ address: hookHubAddress, account }, poolKey),
    );

    return new HookInquirer(router, bond, eur, lpToken, hookHub);
  }

  public async inquireSwap({ address }: { address: Address }): Promise<{
    swapResponse: SwapResponse;
    bondBlanace: string;
    eurBalance: string;
  }> {
    const swapDirection =
      this._poolKey.currency0 === this._bond.address
        ? "bonds for EUR"
        : "EUR for bonds";

    const zeroForOne = await confirm({
      message: `🔑 Do you want to swap ${swapDirection}?`,
      default: true,
      theme: THEME,
    });

    const amount = await input({
      message: "🔑 Specify the deisred input amount to be swapped: ",
      required: false,
      theme: THEME,
    });

    console.log(`🛠️ Executing the swap...`);
    try {
      const sqrtPriceLimitX96 = zeroForOne
        ? MIN_SQRT_PRICE + 1n
        : MAX_SQRT_PRICE - 1n;
      const swapParams: SwapParams = {
        zeroForOne,
        amountSpecified: parseEther(amount),
        sqrtPriceLimitX96,
      };
      const response = await this._router.swap(
        new SwapCommand({
          account: address,
          swapParams,
        }),
      );

      const balanceBonds = await this._bond.balanceOf(
        new BalanceOfQuery({ account: address }),
      );
      const balanceEurs = await this._eur.balanceOf(
        new BalanceOfQuery({ account: address }),
      );

      return {
        swapResponse: response,
        bondBlanace: formatEther(balanceBonds.valueOf()),
        eurBalance: formatEther(balanceEurs.valueOf()),
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error(`❌ Error executing swap: ${error.message}`);
        throw error;
      } else {
        console.error(`❌ Error executing swap: ${String(error)}`);
        throw new Error(`❌ Error executing swap: ${String(error)}`);
      }
    }
  }

  public async inquireModifyLiquidity({
    address,
  }: {
    address: Address;
  }): Promise<{
    modifyLiquidityResponse: ModifyLiquidityResponse;
    bondBlanace: string;
    eurBalance: string;
    lpTokenBalance: string;
  }> {
    const add = await confirm({
      message: `🔑 Do you want to add liquidity?`,
      default: true,
      theme: THEME,
    });

    if (!add) {
      try {
        const amount = await input({
          message: "🔑 Specify how many LP tokens you would like to reclaim: ",
          required: false,
          theme: THEME,
        });

        console.log(`🛠️ Removing liquidity...`);

        const removeLiqudityParams: ModifyLiquidityParams = {
          add: false,
          addParams: {
            isToken0: false,
            singleSided: false,
          },
          poolKey: this._poolKey,
          amount: parseEther(amount),
          sender: address,
        };
        const response = await this._hookHub.modifyLiquidity(
          new ModifyLiquidiyCommand({
            account: address,
            modifyLiquidityParams: removeLiqudityParams,
          }),
        );

        const balanceLpTokens = await this._lpToken.balanceOf(
          new BalanceOfQuery({ account: address }),
        );
        const balanceBonds = await this._bond.balanceOf(
          new BalanceOfQuery({ account: address }),
        );
        const balanceEurs = await this._eur.balanceOf(
          new BalanceOfQuery({ account: address }),
        );

        return {
          modifyLiquidityResponse: response,
          bondBlanace: formatEther(balanceBonds),
          eurBalance: formatEther(balanceEurs),
          lpTokenBalance: formatEther(balanceLpTokens),
        };
      } catch (error) {
        if (error instanceof Error) {
          console.error(`❌ Error modifying liquidity: ${error.message}`);
          throw error;
        } else {
          console.error(`❌ Error modifying liquidity: ${String(error)}`);
          throw new Error(`❌ Error modifying liquidity: ${String(error)}`);
        }
      }
    } else {
      try {
        const token0 =
          this._poolKey.currency0 === this._bond.address ? "Bond" : "EUR";

        const isToken0 = await confirm({
          message: `🔑 Do you want to provide liquidity specifying ${token0}?`,
          default: true,
          theme: THEME,
        });
        const singleSided = await confirm({
          message: `🔑 Do you want to deposit single sided? (if there is not enough tokens in the vault, you'll need to deposit the rest)`,
          default: true,
          theme: THEME,
        });

        const amount = await input({
          message: "🔑 Specify how many tokens you would like to deposit.",
          required: false,
          theme: THEME,
        });

        console.log(`🛠️ Adding liquidity...`);

        const addLiquidtyParams: ModifyLiquidityParams = {
          add: true,
          addParams: {
            isToken0,
            singleSided,
          },
          poolKey: this._poolKey,
          amount: parseEther(amount),
          sender: address,
        };
        const response = await this._hookHub.modifyLiquidity(
          new ModifyLiquidiyCommand({
            account: address,
            modifyLiquidityParams: addLiquidtyParams,
          }),
        );

        const balanceLpTokens = await this._lpToken.balanceOf(
          new BalanceOfQuery({ account: address }),
        );
        const balanceBonds = await this._bond.balanceOf(
          new BalanceOfQuery({ account: address }),
        );
        const balanceEurs = await this._eur.balanceOf(
          new BalanceOfQuery({ account: address }),
        );

        return {
          modifyLiquidityResponse: response,
          bondBlanace: formatEther(balanceBonds),
          eurBalance: formatEther(balanceEurs),
          lpTokenBalance: formatEther(balanceLpTokens),
        };
      } catch (error) {
        if (error instanceof Error) {
          console.error(`❌ Error modifying liquidity: ${error.message}`);
          throw error;
        } else {
          console.error(`❌ Error modifying liquidity: ${String(error)}`);
          throw new Error(`❌ Error modifying liquidity: ${String(error)}`);
        }
      }
    }
  }

  public get bond(): ERC20 {
    return this._bond;
  }

  public get eur(): ERC20 {
    return this._eur;
  }
}
