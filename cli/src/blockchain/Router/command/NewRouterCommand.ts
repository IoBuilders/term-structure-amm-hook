import { NewBaseContractCommand } from "@blockchain/base-contract";
import type { PoolKey } from "@hook";
import { RouterArtifact } from "@blockchain/artifact";

const { abi: ABI } = RouterArtifact;

interface NewRouterCommandParams
  extends Omit<NewBaseContractCommand<typeof ABI>, "abi" | "eventList"> {}

export default class NewRouterCommand extends NewBaseContractCommand<
  typeof ABI
> {
  private _poolKey: PoolKey;
  constructor({ address, account }: NewRouterCommandParams, poolKey: PoolKey) {
    super({ abi: ABI, address, account, eventList: [] });
    this._poolKey = poolKey;
  }
  get poolKey(): PoolKey {
    return this._poolKey;
  }
}
