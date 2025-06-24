export const MODIFY_LIQUIDITY_LENGTH_ERROR_MESSAGE =
  "❌ No modify liquidity event found";
export const MODIFY_LIQUIDITY_OPERATOR_NOT_SENDER_ERROR_MESSAGE =
  "❌ Modify liquidity event operator is not the sender";
export const MODIFY_LIQUIDITY_ACCOUNT_NOT_EXPECTED_ERROR_MESSAGE =
  "❌ Modify liquidity event account is not the expected account";
export const MODIFY_LIQUIDITY_MULTIPLE_EVENTS_WARNING =
  "Multiple modify liquidity events found. This may indicate a potential issue with the transaction or the contract state. Please verify the transaction details and ensure that the correct event is being processed.";

export const EVENTS = {
  MODIFY_LIQUIDITY: "ModifiedLiquidity",
} as const;
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
