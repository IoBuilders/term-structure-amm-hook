import { EventEmitter } from "node:events";

export const CIRCLE_COMPLIANCE_CHECK_PERFORMED =
  "circleComplianceCheckPerformed";

const eventBus = new EventEmitter();

export default eventBus;
