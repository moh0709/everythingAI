function freezeApprovalSimulation(simulation = {}) {
  return Object.freeze({
    simulated: true,
    advisoryOnly: true,
    enforced: false,
    ...simulation,
    simulatedAt: new Date().toISOString()
  });
}

function generateApprovalTrace({ approvalPath = [], outcome = 'ALLOW' } = {}) {
  return freezeApprovalSimulation({
    traceType: 'approval',
    approvalPath,
    outcome
  });
}

function simulateApprovalFlow({ approvalsRequired = 1 } = {}) {
  const approvalPath = Array.from({ length: approvalsRequired }, (_, index) => ({
    step: index + 1,
    approver: `approver-${index + 1}`
  }));

  return freezeApprovalSimulation({
    approvalPath,
    trace: generateApprovalTrace({
      approvalPath,
      outcome: 'ALLOW'
    })
  });
}

module.exports = {
  freezeApprovalSimulation,
  generateApprovalTrace,
  simulateApprovalFlow
};
