import { ERC20Artifact } from "blockchain/artifact";
import { NewBaseContractCommand } from "@blockchain/base-contract";
import type { AtsControlList } from "@blockchain/AtsControlList";

const { abi: ABI } = ERC20Artifact;

interface NewERC20CommandParams
  extends Omit<NewBaseContractCommand<typeof ABI>, "abi" | "eventList"> {
  atsControlList: AtsControlList;
}

export default class NewERC20Command extends NewBaseContractCommand<
  typeof ABI
> {
  public atsControlList: AtsControlList;
  constructor({ address, account, atsControlList }: NewERC20CommandParams) {
    super({ abi: ABI, address, account, eventList: [] });
    this.atsControlList = atsControlList;
  }
}
