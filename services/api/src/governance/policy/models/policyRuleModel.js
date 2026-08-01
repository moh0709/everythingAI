export function createPolicyRuleModel({
  policyId,
  priority = 100,
  eligibilitySignal,
  expectedValue,
  outcome = 'shadow_eligible',
  explanation = 'Policy evaluated in shadow eligibility mode.',
  createdAt = new Date().toISOString(),
  governanceVersion = '5.3'
} = {}) {
  return Object.freeze({
    policyId,
    priority,
    eligibilitySignal,
    expectedValue,
    outcome,
    explanation,
    createdAt,
    governanceVersion,
    mode: 'shadow',
    enforcementLevel: 'L0',
    eligibilityOnly: true,
    enforced: false,
    runtimeBlocking: false,
    lifecycleMutation: false
  });
}
