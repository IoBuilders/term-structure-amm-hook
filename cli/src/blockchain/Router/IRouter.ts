import type SwapCommand from "./command/SwapCommand";
import type SwapResponse from "./response/SwapResponse";

export default interface IPoolManager {
  swap(command: SwapCommand): Promise<SwapResponse>;
}
