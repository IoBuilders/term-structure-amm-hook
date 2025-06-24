import { SWAP_ACCOUNT_NOT_EXPECTED_ERROR_MESSAGE } from "@blockchain/Router";

export default class SwapAccountNotExpectedError extends Error {
  constructor() {
    super(SWAP_ACCOUNT_NOT_EXPECTED_ERROR_MESSAGE);
  }
}
