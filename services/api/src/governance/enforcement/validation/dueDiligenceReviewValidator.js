export function validateDueDiligenceReview(review = {}) {
  const valid = review.acceptanceMatrixComplete === true
    && review.risksReviewed === true
    && review.validationEvidencePresent === true
    && review.noSecretsExposed === true
    && review.noDependentTasksReleased === true;

  return Object.freeze({
    valid,
    severity: valid ? 'ENF-0' : 'ENF-4',
    validatedAt: new Date().toISOString(),
  });
}
