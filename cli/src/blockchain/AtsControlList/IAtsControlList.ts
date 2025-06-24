import type {
  AddToControlListCommand,
  AddToControlListResponse,
} from "@blockchain/AtsControlList";

export default interface IAtsControlList {
  addToControlList(
    command: AddToControlListCommand,
  ): Promise<AddToControlListResponse>;
}
