export function AutomatedReviewAdvisoryCard() {
  return (
    <article className="wiki-diagnostics-card">
      <div className="wiki-diagnostics-card-title">
        <strong>Automated Review Advisory</strong>
        <span>Planned support layer</span>
      </div>
      <div className="wiki-diagnostics-mini-grid">
        <div><span>Status</span><strong className="wiki-quality-grade wiki-quality-warning">not started</strong></div>
        <div><span>Role</span><strong>advisory</strong></div>
        <div><span>Weight</span><strong>secondary</strong></div>
        <div><span>Storage</span><strong>not enabled</strong></div>
      </div>
      <div className="wiki-diagnostics-detail wiki-diagnostics-detail-static">
        <p><b>Why it matters:</b> this planned layer will help review support quality, citation strength, contradiction risk, and unclear claims while keeping operator review as the stronger signal.</p>
        <ul className="wiki-diagnostics-reasons">
          <li>No automated review runs in this phase.</li>
          <li>No review records are stored yet.</li>
          <li>Current quality scores remain deterministic.</li>
          <li>Operator review remains the stronger validation signal.</li>
        </ul>
      </div>
    </article>
  );
}
