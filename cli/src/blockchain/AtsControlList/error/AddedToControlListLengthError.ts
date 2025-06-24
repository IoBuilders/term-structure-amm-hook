import { ADDED_TO_CONTROL_LIST_LENGTH_ERROR_MESSAGE } from "@blockchain/AtsControlList";

export default class AddedToControlListLengthError extends Error {
  constructor() {
    super(ADDED_TO_CONTROL_LIST_LENGTH_ERROR_MESSAGE);
  }
}
