import { REMOVED_FROM_CONTROL_LIST_OPERATOR_NOT_SENDER_ERROR_MESSAGE } from "@blockchain/AtsControlList";

export default class RemovedFromControlListOperatorNotSenderError extends Error {
  constructor() {
    super(REMOVED_FROM_CONTROL_LIST_OPERATOR_NOT_SENDER_ERROR_MESSAGE);
  }
}
