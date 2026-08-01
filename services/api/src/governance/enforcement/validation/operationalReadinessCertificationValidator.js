export function validateOperationalReadinessCertification(certification = {}) {
  const valid = certification.certified === true
    && certification.operationalReadinessCertified === true
    && Array.isArray(certification.evidenceIds)
    && certification.evidenceIds.length > 0
    && certification.hiddenEscalation === false;

  return Object.freeze({
    valid,
    severity: valid ? 'ENF-0' : 'ENF-4',
    validatedAt: new Date().toISOString(),
  });
}
