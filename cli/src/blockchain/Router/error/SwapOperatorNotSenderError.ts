import { SWAP_OPERATOR_NOT_SENDER_ERROR_MESSAGE } from "@blockchain/Router";

export default class SwapOperatorNotSenderError extends Error {
  constructor() {
    super(SWAP_OPERATOR_NOT_SENDER_ERROR_MESSAGE);
  }
}
