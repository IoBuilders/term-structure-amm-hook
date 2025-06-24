import { ADDED_TO_CONTROL_LIST_ACCOUNT_NOT_EXPECTED_ERROR_MESSAGE } from "@blockchain/AtsControlList";

export default class AddedToControlListAccountNotExpectedError extends Error {
  constructor() {
    super(ADDED_TO_CONTROL_LIST_ACCOUNT_NOT_EXPECTED_ERROR_MESSAGE);
  }
}
