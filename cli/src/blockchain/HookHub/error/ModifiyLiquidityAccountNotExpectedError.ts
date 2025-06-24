import { MODIFY_LIQUIDITY_ACCOUNT_NOT_EXPECTED_ERROR_MESSAGE } from "@blockchain/HookHub";

export default class ModifiyLiquidityAccountNotExpectedError extends Error {
  constructor() {
    super(MODIFY_LIQUIDITY_ACCOUNT_NOT_EXPECTED_ERROR_MESSAGE);
  }
}
