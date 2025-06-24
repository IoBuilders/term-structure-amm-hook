import { MODIFY_LIQUIDITY_LENGTH_ERROR_MESSAGE } from "@blockchain/HookHub";

export default class ModifyLiquidityLengthError extends Error {
  constructor() {
    super(MODIFY_LIQUIDITY_LENGTH_ERROR_MESSAGE);
  }
}
