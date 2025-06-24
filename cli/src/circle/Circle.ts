import { fetch } from "bun";
import { HttpMethods } from "@configuration";
import eventBus, { CIRCLE_COMPLIANCE_CHECK_PERFORMED } from "@events";
import {
  type ICircle,
  type CircleConstructorParams,
  type ComplianceCheckParams,
  type ComplianceCheckResponse,
  type RawResponse,
  ComplianceStatus,
  ComplianceCheckRequestError,
} from "@circle";

export default class Circle implements ICircle {
  private _apiComplianceEnabled: boolean;
  private _apiKey: string | undefined;
  private _apiComplianceScreeningUrl: string;
  private _apiComplianceScreeningChain: string;

  constructor({
    apiComplianceEnabled,
    apiKey,
    apiComplianceScreeningUrl,
    apiComplianceScreeningChain,
  }: CircleConstructorParams) {
    this._apiComplianceEnabled = apiComplianceEnabled;
    this._apiKey = apiKey;
    this._apiComplianceScreeningUrl = apiComplianceScreeningUrl;
    this._apiComplianceScreeningChain = apiComplianceScreeningChain;
  }

  public async checkCompliance({
    address,
    idempotencyKey = crypto.randomUUID(),
  }: ComplianceCheckParams): Promise<ComplianceCheckResponse> {
    const httpRequestHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this._apiKey}`,
    };
    const body = {
      address,
      chain: this._apiComplianceScreeningChain,
      idempotencyKey,
    };
    const options = {
      method: HttpMethods.POST,
      headers: httpRequestHeaders,
      body: JSON.stringify(body),
    };
    const response = await fetch(this._apiComplianceScreeningUrl, options);
    if (!response.ok) {
      throw new ComplianceCheckRequestError(
        response.status,
        response.statusText,
      );
    }
    const responseData = await response.json();
    const rawResponse = responseData.data as RawResponse;
    const complianceStatus = rawResponse.result as ComplianceStatus;

    // Emit custom event to indicate the compliance check is performed
    eventBus.emit(CIRCLE_COMPLIANCE_CHECK_PERFORMED, {
      address,
      complianceStatus,
    });

    return {
      complianceStatus,
      completeResponse: rawResponse,
    };
  }

  get apiKey(): string | undefined {
    return this._apiKey;
  }

  get apiComplianceScreeningUrl(): string {
    return this._apiComplianceScreeningUrl;
  }

  get apiComplianceScreeningChain(): string {
    return this._apiComplianceScreeningChain;
  }

  get isApiComplianceEnabled(): boolean {
    return this._apiComplianceEnabled;
  }

  set apiKey(apiKey: string) {
    this._apiKey = apiKey;
  }

  set apiComplianceScreeningUrl(apiComplianceScreeningUrl: string) {
    this._apiComplianceScreeningUrl = apiComplianceScreeningUrl;
  }

  set apiComplianceScreeningChain(apiComplianceScreeningChain: string) {
    this._apiComplianceScreeningChain = apiComplianceScreeningChain;
  }

  set apiComplianceEnabled(apiComplianceEnabled: boolean) {
    this._apiComplianceEnabled = apiComplianceEnabled;
  }
}
