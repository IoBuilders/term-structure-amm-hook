import { REMOVED_FROM_CONTROL_LIST_ACCOUNT_NOT_EXPECTED_ERROR_MESSAGE } from "@blockchain/AtsControlList";

export default class RemovedFromControlListAccountNotExpectedError extends Error {
  constructor() {
    super(REMOVED_FROM_CONTROL_LIST_ACCOUNT_NOT_EXPECTED_ERROR_MESSAGE);
  }
}
