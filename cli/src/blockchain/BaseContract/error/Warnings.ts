export default class Warnings {
  public static readonly fetchingTransactionReceipt = (
    tryCount: number,
    maxRetries: number,
  ) =>
    `🔶 fetching transaction receipt... (try ${tryCount} of ${maxRetries}) (Polling receipt)`;
}
