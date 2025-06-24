import type BalanceOfquery from "./query/BalanceOfQuery";

export default interface IERC20 {
  balanceOf(command: BalanceOfquery): Promise<BigInt>;
}
