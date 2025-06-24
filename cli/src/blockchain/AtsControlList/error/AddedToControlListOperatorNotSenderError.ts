import { ADDED_TO_CONTROL_LIST_OPERATOR_NOT_SENDER_ERROR_MESSAGE } from "@blockchain/AtsControlList";

export default class AddedToControlListOperatorNotSenderError extends Error {
  constructor() {
    super(ADDED_TO_CONTROL_LIST_OPERATOR_NOT_SENDER_ERROR_MESSAGE);
  }
}
