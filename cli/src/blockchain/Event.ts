import type { WatchContractEventOnLogsFn } from "viem";

export default class Event {
  private _name: string;
  private _function: WatchContractEventOnLogsFn;

  constructor({
    name,
    func,
  }: {
    name: string;
    func: WatchContractEventOnLogsFn;
  }) {
    this._name = name;
    this._function = func;
  }

  get name(): string {
    return this._name;
  }

  get func(): WatchContractEventOnLogsFn {
    return this._function;
  }
}
