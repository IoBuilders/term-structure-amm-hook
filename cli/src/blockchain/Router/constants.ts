export const SWAP_LENGTH_ERROR_MESSAGE = "❌ No Swap event found";
export const SWAP_OPERATOR_NOT_SENDER_ERROR_MESSAGE =
  "❌ Swap event operator is not the sender";
export const SWAP_ACCOUNT_NOT_EXPECTED_ERROR_MESSAGE =
  "❌ Swap event account is not the expected account";
export const SWAP_ID_NOT_EXPECTED_ERROR_MESSAGE =
  "❌ Swap event pool id is not the expected id";
export const SWAP_MULTIPLE_EVENTS_WARNING =
  "Multiple Swap events found. This may indicate a potential issue with the transaction or the contract state. Please verify the transaction details and ensure that the correct event is being processed.";

export const EVENTS = {
  SWAP: "SwapExecuted",
} as const;
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
