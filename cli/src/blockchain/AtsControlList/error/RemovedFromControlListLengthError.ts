import { REMOVED_FROM_CONTROL_LIST_LENGTH_ERROR_MESSAGE } from "@blockchain/AtsControlList";

export default class RemovedFromControlListLengthError extends Error {
  constructor() {
    super(REMOVED_FROM_CONTROL_LIST_LENGTH_ERROR_MESSAGE);
  }
}
