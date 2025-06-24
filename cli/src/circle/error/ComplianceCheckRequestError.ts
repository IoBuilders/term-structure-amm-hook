const COMPLIANCE_CHECK_REQUEST_ERROR = [
  "Circle compliance check request failed: ",
];
const ERROR_NAME = "ComplianceCheckRequestError";

export default class ComplianceCheckRequestError extends Error {
  constructor(
    public readonly statusCode?: number,
    public readonly statusText?: string,
  ) {
    super(`${COMPLIANCE_CHECK_REQUEST_ERROR[0]}${statusCode} ${statusText}`);
    this.name = ERROR_NAME;
  }
}
