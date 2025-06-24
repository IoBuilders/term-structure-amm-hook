export const ADDED_TO_CONTROL_LIST_LENGTH_ERROR_MESSAGE =
  "❌ No AddedToControlList event found";
export const ADDED_TO_CONTROL_LIST_OPERATOR_NOT_SENDER_ERROR_MESSAGE =
  "❌ AddedToControlList event operator is not the sender";
export const ADDED_TO_CONTROL_LIST_ACCOUNT_NOT_EXPECTED_ERROR_MESSAGE =
  "❌ AddedToControlList event account is not the expected account";
export const REMOVED_FROM_CONTROL_LIST_LENGTH_ERROR_MESSAGE =
  "❌ No RemovedFromControlList event found";
export const REMOVED_FROM_CONTROL_LIST_OPERATOR_NOT_SENDER_ERROR_MESSAGE =
  "❌ RemovedFromControlList event operator is not the sender";
export const REMOVED_FROM_CONTROL_LIST_ACCOUNT_NOT_EXPECTED_ERROR_MESSAGE =
  "❌ RemovedFromControlList event account is not the expected account";

export const ADDED_TO_CONTROL_LIST_MULTIPLE_EVENTS_WARNING =
  "Multiple AddedToControlList events found. This may indicate a potential issue with the transaction or the contract state. Please verify the transaction details and ensure that the correct event is being processed.";
export const REMOVED_FROM_CONTROL_LIST_MULTIPLE_EVENTS_WARNING =
  "Multiple RemovedFromControlList events found. This may indicate a potential issue with the transaction or the contract state. Please verify the transaction details and ensure that the correct event is being processed.";

export const EVENTS = {
  ADDED_TO_CONTROL_LIST: "AddedToControlList",
  REMOVED_FROM_CONTROL_LIST: "RemovedFromControlList",
} as const;
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
