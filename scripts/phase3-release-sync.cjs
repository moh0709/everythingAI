const fs = require('fs');

function mustReplace(text, pattern, replacement, label) {
  const next = text.replace(pattern, replacement);
  if (next === text) throw new Error(`Expected governance sync target not found: ${label}`);
  return next;
}

function write(path, transform) {
  const before = fs.readFileSync(path, 'utf8');
  const after = transform(before);
  if (after !== before) fs.writeFileSync(path, after);
}

write('PROJECT_STATE.md', (input) => {
  let text = input;
  text = mustReplace(
    text,
    /Date: 2026-08-28  \nAuthority: accepted repository state after Governed-Action Review Context Orientation Trust dispatch  \nCurrent governance issue: #288/,
    'Date: 2026-08-29  \nAuthority: accepted repository state through Phase 3.6 plus dependency-security remediation; Enterprise Readiness Foundation dispatch  \nCurrent governance issue: #304',
    'PROJECT_STATE metadata'
  );
  if (!text.includes('ENTERPRISE_READINESS_FOUNDATION_PASS')) {
    text = mustReplace(
      text,
      '## Current program stage\n\n',
      '## Current program stage\n\n**Phase 3 — Enterprise Readiness Foundation is COMPLETE AND DISPATCHED (`ENTERPRISE_READINESS_FOUNDATION_PASS`).**\n\nAccepted Enterprise Readiness Foundation release evidence is recorded in `docs/ENTERPRISE_READINESS_FOUNDATION_RELEASE_DECISION_2026-08-29.md` and `docs/HANDOVER_2026-08-29_ENTERPRISE_READINESS_FOUNDATION_RELEASE.json`. Phase 3.1–3.6 are accepted through #292–#303, and the dependency-security release blocker is closed through #305 / PR #306 merge `d69af031bc4bfd82441ebb22b17040879cfdd93f`. Final dependency-remediation head `5cc3ffe0f8842ea2250ddb986d9cb86444e3df2a` passed CI Smoke #836, all fifteen inherited focused workflows, all six Phase 3 enterprise workflows, and Dependency Security Audit #8 with a clean exact-lock audit.\n\n',
      'PROJECT_STATE current program stage'
    );
  }
  text = text.replace(
    /Issue #288 is documentation-only synchronization after the accepted #286\/#287 dispatch\.[\s\S]*?\n\n## Authority order/,
    'Issue #304 is the accepted Phase 3 Enterprise Readiness Foundation release/canonical synchronization gate. It records the bounded `ENTERPRISE_READINESS_FOUNDATION_PASS` without claiming production deployment readiness. Production secrets, privileged-host provisioning, destructive migration/cutover, external penetration testing/certification, production load qualification, and commercial SLA commitments remain separate CEO-gated work.\n\n## Authority order'
  );
  if (!text.includes('## Phase 3 enterprise regression baseline')) {
    text = text.replace(
      '## Accepted safety contract',
      '## Phase 3 enterprise regression baseline\n\nPhase 3 release validation inherits the complete product baseline plus: Enterprise Isolation; Object Storage; Object Metadata Migration Planning; Enterprise Runtime Health; Enterprise Backup Restore Validation; Enterprise Capacity & Security; and the read-only exact-lock Dependency Security Audit. Backend dependency-lock changes must trigger the applicable enterprise validation gates. Historical green evidence never substitutes for validating a changed candidate.\n\n## Accepted safety contract'
    );
  }
  text = text.replace(
    /## Current governance gate[\s\S]*?(?=\n## )/,
    '## Current governance gate\n\n`ENTERPRISE_READINESS_FOUNDATION_PASS` is dispatched through #304 after accepted Phase 3.1–3.6 and #305/#306 dependency-security remediation. The application-level enterprise foundation is accepted; this is not a production-deployment, certification, destructive-cutover, production-load, or SLA claim. The next dependency must come from the synchronized five-track roadmap, and material production-platform execution remains CEO-gated.\n'
  );
  return text;
});

write('AI_BOOTSTRAP.md', (input) => {
  let text = input;
  text = mustReplace(text, /^Date: 2026-08-28  $/m, 'Date: 2026-08-29  ', 'AI_BOOTSTRAP date');
  text = mustReplace(
    text,
    /^Current accepted state: (.*)$/m,
    (match, state) => state.includes('ENTERPRISE_READINESS_FOUNDATION_PASS') ? match : `Current accepted state: ${state}; Enterprise Readiness Foundation dispatched (\`ENTERPRISE_READINESS_FOUNDATION_PASS\`)`,
    'AI_BOOTSTRAP accepted state'
  );
  text = mustReplace(
    text,
    /^Current gate: issue #288 canonical synchronization and next five-track decision gate$/m,
    'Current gate: #304 Enterprise Readiness Foundation dispatch complete; select next dependency from synchronized five-track roadmap',
    'AI_BOOTSTRAP current gate'
  );
  if (!text.includes('### Phase 3 Enterprise Readiness Foundation')) {
    text = text.replace(
      '## Current release authority evidence\n\n',
      '## Current release authority evidence\n\n### Phase 3 Enterprise Readiness Foundation\n\nLatest release decision: `docs/ENTERPRISE_READINESS_FOUNDATION_RELEASE_DECISION_2026-08-29.md`  \nLatest handover: `docs/HANDOVER_2026-08-29_ENTERPRISE_READINESS_FOUNDATION_RELEASE.json`\n\n`ENTERPRISE_READINESS_FOUNDATION_PASS` is authoritative for the bounded application-level foundation through Phase 3.1–3.6 plus #305/#306 dependency-security remediation. It does not claim production deployment, destructive cutover, production secret provisioning, external certification, production-load qualification, or commercial SLA readiness.\n\n'
    );
  }
  text = text.replace(
    /## Current governance gate[\s\S]*?(?=\n## CEO-gated directions)/,
    '## Current governance gate\n\nPhase 3 Enterprise Readiness Foundation is dispatched as `ENTERPRISE_READINESS_FOUNDATION_PASS` through #304. Final dependency-remediation head `5cc3ffe0f8842ea2250ddb986d9cb86444e3df2a` passed CI Smoke #836, all fifteen inherited focused workflows, all six Phase 3 enterprise workflows, and Dependency Security Audit #8. Select the next bounded dependency from the synchronized five-track roadmap.\n\n'
  );
  text = text.replace(
    /## CEO-gated directions[\s\S]*?(?=\n## Issue #69)/,
    '## CEO-gated directions\n\nER-1 through ER-5 are approved architecture authority. Additional CEO approval remains required before material production-platform execution beyond the accepted foundation, including privileged-host/root/sudo/SSH/systemd work, real production secrets or identity-provider provisioning, destructive database/object migration or cutover, external penetration/compliance/certification commitments, production load/capacity qualification, cloud-provider lock-in decisions beyond the provider-neutral architecture, or commercial SLA/SLO commitments.\n\n'
  );
  return text;
});

write('docs/ROADMAP.md', (input) => {
  let text = input;
  text = mustReplace(text, /^Date: 2026-08-28  $/m, 'Date: 2026-08-29  ', 'ROADMAP date');
  if (!text.includes('Enterprise Readiness Foundation: **complete and dispatched')) {
    text = text.replace(
      'Governed-Action Review Context Orientation Trust: **complete and dispatched (`GOVERNED_ACTION_REVIEW_CONTEXT_ORIENTATION_TRUST_PASS`)**',
      'Governed-Action Review Context Orientation Trust: **complete and dispatched (`GOVERNED_ACTION_REVIEW_CONTEXT_ORIENTATION_TRUST_PASS`)**  \nEnterprise Readiness Foundation: **complete and dispatched (`ENTERPRISE_READINESS_FOUNDATION_PASS`)**'
    );
  }
  if (!text.includes('### Phase 3 — Enterprise Readiness Foundation')) {
    text = text.replace(
      '## Current five-track position',
      '### Phase 3 — Enterprise Readiness Foundation\nAccepted and dispatched as `ENTERPRISE_READINESS_FOUNDATION_PASS` through #304 after Phase 3.1–3.6 (#292–#303) and dependency-security remediation #305/#306. The accepted foundation covers application-level identity/tenancy isolation, PostgreSQL RLS foundations, provider-neutral object storage, durable object metadata and dry-run migration planning, runtime health, isolated backup/restore validation, bounded capacity/security validation, and exact-lock dependency security. It explicitly does not claim production deployment readiness.\n\n## Current five-track position'
    );
  }
  text = text.replace(
    /## Current five-track position[\s\S]*?(?=\n## Mandatory inherited release discipline)/,
    `## Current five-track position\n\n| Track | Accepted position | Next gate |\n|---|---|---|\n| Product and UX | Phase 2/Product Depth and Review Context trust surfaces remain accepted and local-first | Choose only distinct user-value work that preserves existing trust and governed-action semantics |\n| Knowledge and Safe Action | Source-backed reading, explicit approval, truthful evidence semantics and exact-target review behavior remain accepted | Continue only bounded improvements backed by authoritative or genuinely loaded/local evidence |\n| Enterprise Platform | Application-level Enterprise Readiness Foundation dispatched as \`ENTERPRISE_READINESS_FOUNDATION_PASS\` | CEO-gated production execution: real infrastructure/secrets, destructive cutover, external certification/load qualification, SLA commitments |\n| Engineering Operations | CI/release discipline now includes exact-lock dependency audit and dependency-sensitive enterprise gates | Production/privileged-host operations require explicit authority and environment access |\n| Governance and Autonomous Delivery | Phase 3.1–3.6 + dependency remediation completed through merge \`d69af031bc4bfd82441ebb22b17040879cfdd93f\` and #304 dispatch | Select one bounded dependency at a time; preserve unchanged-head validation, review and rollback evidence |\n\n## Active dependency sequence\n\n\`\`\`text\nPhase 3.1–3.6 accepted (#292–#303)\n  -> dependency-security blocker #305 / PR #306 accepted\n    -> #304 canonical Enterprise Readiness Foundation release\n      -> ENTERPRISE_READINESS_FOUNDATION_PASS\n        -> select next five-track dependency\n          -> material production-platform execution remains CEO-gated\n\`\`\`\n\n## Next five-track decision criteria\n\n- **Product & UX:** pursue distinct user-visible value, not recursive restatement of already trusted review-context facts.\n- **Knowledge & Safe Action:** preserve backend authority, explicit approval, truthful unknown-state handling, audit/undo and filesystem safety.\n- **Enterprise Platform:** the application-level foundation is accepted; production secrets, privileged-host execution, destructive migration/cutover, external certification and production-load/SLA commitments remain separate gates.\n- **Engineering Operations:** keep dependency/security and enterprise validation wired to changes that can affect them; privileged production operations require explicit authority.\n- **Governance & Autonomous Delivery:** release only bounded, dependency-safe, reversible work with unchanged-head validation and independent final review.\n\n`
  );
  return text;
});

console.log('Phase 3 release governance synchronization applied.');
