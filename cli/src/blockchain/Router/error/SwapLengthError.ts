import { SWAP_LENGTH_ERROR_MESSAGE } from "@blockchain/Router";

export default class SwapLengthError extends Error {
  constructor() {
    super(SWAP_LENGTH_ERROR_MESSAGE);
  }
}
