import { SWAP_ID_NOT_EXPECTED_ERROR_MESSAGE } from "@blockchain/Router";

export default class SwapIdNotExpectedError extends Error {
  constructor() {
    super(SWAP_ID_NOT_EXPECTED_ERROR_MESSAGE);
  }
}
