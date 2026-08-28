const fs = require('fs');

function write(path, transform) {
  const before = fs.readFileSync(path, 'utf8');
  const after = transform(before);
  if (after !== before) fs.writeFileSync(path, after);
}

write('AI_BOOTSTRAP.md', (input) => {
  let text = input;
  text = text.replace('`)  ; Enterprise Readiness Foundation', '`); Enterprise Readiness Foundation');
  text = text.replace(
    /Latest release decision: `docs\/GOVERNED_ACTION_REVIEW_CONTEXT_ORIENTATION_TRUST_RELEASE_DECISION_2026-08-28\.md`  \nLatest handover: `docs\/HANDOVER_2026-08-28_GOVERNED_ACTION_REVIEW_CONTEXT_ORIENTATION_TRUST_RELEASE\.json`\n\nThe Review Context Orientation Trust dispatch is authoritative through #286\/#287\. Its release candidate and changed final decision head both passed the complete fifteen-workflow focused baseline, and final release review found no unresolved Critical or Important findings or review threads\. Issue #288 synchronizes that dispatch into canonical governance state and does not itself authorize another runtime feature\.\n\n/,
    'Prior Review Context Orientation Trust release authority remains valid historical evidence through #286/#287; its release decision and handover remain preserved, but it is no longer the latest release authority.\n\n'
  );
  text = text.replace(
    /Every accepted milestone remains independently reversible by its recorded merge\. #288 is documentation-only and can be reverted independently\./,
    'Every accepted milestone remains independently reversible by its recorded merge. The #304 Enterprise Readiness Foundation release/canonical synchronization is documentation/governance-only and is independently reversible from the Phase 3 runtime implementation merges.'
  );
  return text;
});

write('docs/ROADMAP.md', (input) => {
  let text = input;
  text = text.replace(
    /## CEO-gated directions\n\nRequire explicit CEO approval before authentication\/tenancy, cloud deployment, DB migration\/object storage, privileged-host\/systemd work, production-platform architecture execution, new routing architecture, automatic action\/recovery\/rebuild behavior, material connector\/runtime expansion, new backend\/API\/schema\/persistence expansion, or new semantic\/provider architecture with material runtime\/cost\/trust implications\./,
    '## CEO-gated directions\n\nER-1 through ER-5 are already approved and implemented at the bounded application-foundation level. Explicit CEO approval is still required before material production-platform execution beyond that foundation, including privileged-host/root/sudo/SSH/systemd work, real production secrets or identity-provider provisioning, destructive database/object migration or cutover, external penetration/compliance/certification commitments, production load/capacity qualification, provider-specific cloud lock-in decisions beyond the approved neutral architecture, automatic action/recovery scope expansion, material connector/runtime expansion, or commercial SLA/SLO commitments.'
  );
  text = text.replace(
    /## Rollback\n\n#288 synchronization is documentation-only and independently reversible\./,
    '## Rollback\n\nThe #304 Enterprise Readiness Foundation release/canonical synchronization is documentation/governance-only and independently reversible from the Phase 3 runtime implementation merges.'
  );
  return text;
});

write('PROJECT_STATE.md', (input) => {
  let text = input;
  text = text.replace(
    /Every accepted milestone remains independently reversible by its recorded merge\. #288 is documentation-only and can be reverted independently\./,
    'Every accepted milestone remains independently reversible by its recorded merge. The #304 Enterprise Readiness Foundation release/canonical synchronization is documentation/governance-only and independently reversible from the Phase 3 runtime implementation merges.'
  );
  return text;
});

console.log('Post-Phase 3 governance corrections applied.');
