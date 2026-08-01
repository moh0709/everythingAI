import { validateApprovalLifecycle } from './approvalLifecycleValidator.js';
import { validateApprovalDeterminism } from './approvalDeterminismValidator.js';
import { validateApprovalObservability } from './approvalObservabilityValidator.js';
import { validateApprovalInvariants } from './approvalInvariantValidator.js';

const approvalValidationRegistry = Object.freeze({
  validateApprovalLifecycle,
  validateApprovalDeterminism,
  validateApprovalObservability,
  validateApprovalInvariants
});

export default approvalValidationRegistry;
