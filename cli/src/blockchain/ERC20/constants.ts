export const APPROVAL_LENGTH_ERROR_MESSAGE = "❌ No Approval event found";
export const APPROVAL_OPERATOR_NOT_SENDER_ERROR_MESSAGE =
  "❌ Approve event operator is not the sender";
export const APPROVAL_TO_NOT_EXPECTED_ERROR_MESSAGE =
  "❌ Approve event spender is not the expected spender";
export const APPROVAL_MULTIPLE_EVENTS_WARNING =
  "Multiple Approval events found. This may indicate a potential issue with the transaction or the contract state. Please verify the transaction details and ensure that the correct event is being processed.";

export const EVENTS = {
  APPROVAL: "Approval",
} as const;
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
