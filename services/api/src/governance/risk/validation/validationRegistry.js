import { validateRiskClassificationDeterminism } from './riskClassificationDeterminismValidator.js';
import { validateRiskGovernanceTaxonomy } from './riskGovernanceTaxonomyValidator.js';
import { validateRiskObservabilitySynchronization } from './riskObservabilityValidator.js';
import { validateRiskRuntimeSovereignty } from './riskRuntimeSovereigntyValidator.js';

const riskValidationRegistry = Object.freeze({
  riskClassificationDeterminismValidator: Object.freeze({
    purpose: 'deterministic operational risk classification',
    validate: validateRiskClassificationDeterminism
  }),
  riskGovernanceTaxonomyValidator: Object.freeze({
    purpose: 'risk governance event taxonomy alignment',
    validate: validateRiskGovernanceTaxonomy
  }),
  riskObservabilityValidator: Object.freeze({
    purpose: 'risk telemetry and snapshot synchronization',
    validate: validateRiskObservabilitySynchronization
  }),
  riskRuntimeSovereigntyValidator: Object.freeze({
    purpose: 'advisory risk governance without runtime blocking or mutation',
    validate: validateRiskRuntimeSovereignty
  })
});

export default riskValidationRegistry;
