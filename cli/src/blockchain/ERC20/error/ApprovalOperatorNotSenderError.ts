import { APPROVAL_TO_NOT_EXPECTED_ERROR_MESSAGE } from "@blockchain/ERC20";

export default class ApprovalOperatorNotSenderError extends Error {
  constructor() {
    super(APPROVAL_TO_NOT_EXPECTED_ERROR_MESSAGE);
  }
}
