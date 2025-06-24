import { AtsControlListArtifact } from "blockchain/artifact";
import { NewBaseContractCommand } from "@blockchain/base-contract";

const { abi: ABI } = AtsControlListArtifact;

interface NewAtsControlListCommandParams
  extends Omit<NewBaseContractCommand<typeof ABI>, "abi" | "eventList"> {}

export default class NewAtsControlListCommand extends NewBaseContractCommand<
  typeof ABI
> {
  constructor({ address, account }: NewAtsControlListCommandParams) {
    super({ abi: ABI, address, account, eventList: [] });
  }
}
