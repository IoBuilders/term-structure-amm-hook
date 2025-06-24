import { RECEIPT_NOT_FOUND_ERROR_MESSAGE } from "@blockchain/base-contract";

export default class ReceiptNotFoundError extends Error {
  constructor() {
    super(RECEIPT_NOT_FOUND_ERROR_MESSAGE);
  }
}
