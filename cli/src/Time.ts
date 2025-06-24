export type Units =
  | "milliseconds"
  | "seconds"
  | "minutes"
  | "hours"
  | "days"
  | "weeks"
  | "months"
  | "years";

export default class Time {
  /**
   * Waits for a specified duration before resolving the promise.
   *
   * @param {Object} params - The parameters for the wait function.
   * @param {number} params.duration - The duration to wait.
   * @param {Units} [params.unit="seconds"] - The unit of time for the duration.
   * @returns {Promise<void>} A promise that resolves after the specified duration.
   */
  public static wait({
    duration,
    unit = "seconds",
  }: {
    duration: number;
    unit?: Units;
  }): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, duration * this.getMultiplier({ unit }));
    });
  }

  /**
   * Returns the current time in the specified unit.
   *
   * @param {Object} params - The parameters for the method.
   * @param {Units} params.unit - The unit of time to return.
   * @returns {number} The current time in the specified unit.
   * @throws {Error} If the unit is invalid.
   */
  public static now({ unit = "seconds" }: { unit?: Units } = {}): number {
    const time = Date.now();
    const multiplier = this.getMultiplier({ unit });
    return Math.floor(time / multiplier);
  }

  /**
   * Returns the multiplier for the given time unit to convert it to milliseconds.
   *
   * @param {Object} param - The parameter object.
   * @param {Units} param.unit - The unit of time to get the multiplier for.
   * @returns {number} The multiplier to convert the given unit to milliseconds.
   * @throws {Error} If the provided unit is invalid.
   */
  private static getMultiplier({ unit }: { unit: Units }): number {
    switch (unit) {
      case "milliseconds":
        return 1;
      case "seconds":
        return 1000;
      case "minutes":
        return 1000 * 60;
      case "hours":
        return 1000 * 60 * 60;
      case "days":
        return 1000 * 60 * 60 * 24;
      case "weeks":
        return 1000 * 60 * 60 * 24 * 7;
      case "months":
        return 1000 * 60 * 60 * 24 * 30;
      case "years":
        return 1000 * 60 * 60 * 24 * 365;
      default:
        throw new Error(`Invalid unit: ${unit}`);
    }
  }
}
