import { NewBaseContractCommand } from "@blockchain/base-contract";
import type { PoolKey } from "@hook";
import { HookHubArtifact } from "@blockchain/artifact";

const { abi: ABI } = HookHubArtifact;

interface NewHookHubCommandParams
  extends Omit<NewBaseContractCommand<typeof ABI>, "abi" | "eventList"> {}

export default class NewHookHubCommand extends NewBaseContractCommand<
  typeof ABI
> {
  private _poolKey: PoolKey;
  constructor({ address, account }: NewHookHubCommandParams, poolKey: PoolKey) {
    super({ abi: ABI, address, account, eventList: [] });
    this._poolKey = poolKey;
  }
  get poolKey(): PoolKey {
    return this._poolKey;
  }
}
