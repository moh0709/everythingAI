# Forge and Atlas Delegation Protocol

Forge may delegate only a bounded child issue with `pm:approved-delegation` and `atlas:ready`. The child must name its parent Forge issue, starting SHA, final SHA, exact allowed files, forbidden files, validation commands, and reporting destination.

Atlas may inspect and modify only the explicitly allowed child scope. Atlas must not modify the parent issue labels, accept or close the parent, release another task, or touch Forge-owned files. Atlas reports its result to Forge and Hermes/Telegram.

Forge re-reads the child result, reviews the diff and tests, integrates it on `main`, and owns all final evidence. Forge rejects overlapping scope, missing SHA evidence, stale results, secret-bearing output, or a child that attempts to change the parent lifecycle.

The parent remains `forge:working` while delegation is active. Only Forge performs the parent transition to `forge:done + pm:review` or `forge:blocked + pm:review`.
