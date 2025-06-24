import type { Address } from "viem";

export default interface ICircle {
  checkCompliance({
    address,
    idempotencyKey,
  }: ComplianceCheckParams): Promise<ComplianceCheckResponse>;
}

export enum ComplianceStatus {
  APPROVED = "APPROVED",
  DENIED = "DENIED",
}

export interface CircleConstructorParams {
  apiComplianceEnabled: boolean;
  apiKey: string | undefined;
  apiComplianceScreeningUrl: string;
  apiComplianceScreeningChain: string;
}

export interface ComplianceCheckParams {
  address: Address;
  idempotencyKey?: string;
}

export interface ComplianceCheckResponse {
  complianceStatus: ComplianceStatus;
  completeResponse: RawResponse;
}

export interface RawResponse {
  result: ComplianceStatus;
  decision: {
    ruleName: string;
    actions: ("APPROVE" | "REVIEW" | "FREEZE_WALLET" | "DENY")[];
    screeningDate: string; // ISO-8601 UTC format
    reasons: Array<{
      source: "ADDRESS" | "BLOCKCHAIN" | "ASSET";
      sourceValue: string;
      riskScore: "UNKNOWN" | "LOW" | "MEDIUM" | "HIGH" | "SEVERE" | "BLOCKLIST";
      riskCategories: (
        | "SANCTIONS"
        | "CSAM"
        | "ILLICIT_BEHAVIOR"
        | "GAMBLING"
        | "TERRORIST_FINANCING"
        | "UNSUPPORTED"
        | "FROZEN"
        | "OTHER"
        | "HIGH_RISK_INDUSTRY"
        | "PEP"
        | "TRUSTED"
        | "HACKING"
        | "HUMAN_TRAFFICKING"
        | "SPECIAL_MEASURES"
      )[];
      type: "OWNERSHIP" | "COUNTERPARTY" | "INDIRECT";
      signalSource: {
        rowId: object; // Opaque object, definition unknown
        pointer: string; // JSON pointer string
      };
    }>;
  };
  id: object; // Opaque object, definition unknown
  address: string;
  chain:
    | "ETH"
    | "ETH-SEPOLIA"
    | "AVAX"
    | "AVAX-FUJI"
    | "MATIC"
    | "MATIC-AMOY"
    | "ALGO"
    | "ATOM"
    | "ARB"
    | "ARB-SEPOLIA"
    | "HBAR"
    | "SOL"
    | "SOL-DEVNET"
    | "UNI"
    | "UNI-SEPOLIA"
    | "TRX"
    | "XLM"
    | "BCH"
    | "BTC"
    | "BSV"
    | "ETC"
    | "LTC"
    | "XMR"
    | "XRP"
    | "ZRX"
    | "OP"
    | "DOT";
  details: Array<{
    id: string;
    vendor: string;
    response: object; // Opaque vendor-specific data
    createDate: string; // ISO-8601 UTC format
  }>;
  alertId: object; // Opaque object, definition unknown
}
