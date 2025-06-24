import { APPROVAL_LENGTH_ERROR_MESSAGE } from "@blockchain/ERC20";

export default class ApprovalLengthError extends Error {
  constructor() {
    super(APPROVAL_LENGTH_ERROR_MESSAGE);
  }
}
