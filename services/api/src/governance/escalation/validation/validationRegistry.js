import { validateEscalationRouting } from './escalationRoutingValidator.js';
import { validateEscalationDeterminism } from './escalationDeterminismValidator.js';
import { validateEscalationObservability } from './escalationObservabilityValidator.js';
import { validateEscalationContract } from './escalationContractValidator.js';

const escalationValidationRegistry = Object.freeze({
  validateEscalationRouting,
  validateEscalationDeterminism,
  validateEscalationObservability,
  validateEscalationContract
});

export default escalationValidationRegistry;
