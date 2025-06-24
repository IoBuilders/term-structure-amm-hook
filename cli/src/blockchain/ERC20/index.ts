// * Constants
export * from "./constants";

// * Queries
export { default as BalanceOfQuery } from "./query/BalanceOfQuery";

// * Commands
export { default as NewERC20Command } from "./command/NewERC20Command";
export { default as ApproveCommand } from "./command/ApproveCommand";

// * Interfaces
export type { default as IERC20 } from "./IERC20";

// * Main Class
export { default as ERC20 } from "./ERC20";
