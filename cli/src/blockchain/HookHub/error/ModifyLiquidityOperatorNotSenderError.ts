import { MODIFY_LIQUIDITY_OPERATOR_NOT_SENDER_ERROR_MESSAGE } from "@blockchain/HookHub";

export default class ModifyLiquidityOperatorNotSenderError extends Error {
  constructor() {
    super(MODIFY_LIQUIDITY_OPERATOR_NOT_SENDER_ERROR_MESSAGE);
  }
}
