function freezeDecisionGraph(graph = {}) {
  return Object.freeze({
    advisoryOnly: true,
    immutable: true,
    ...graph,
    frozenAt: new Date().toISOString()
  });
}

function linkDecisionNodes(nodes = []) {
  return nodes.map((node, index) => ({
    ...node,
    nextNode: nodes[index + 1]?.id || null
  }));
}

function buildDecisionGraph({ nodes = [] } = {}) {
  return freezeDecisionGraph({
    nodes: linkDecisionNodes(nodes),
    generatedAt: new Date().toISOString()
  });
}

function reconstructDecisionGraph(graph = {}) {
  return freezeDecisionGraph({
    ...graph,
    reconstructed: true,
    reconstructedAt: new Date().toISOString()
  });
}

module.exports = {
  freezeDecisionGraph,
  linkDecisionNodes,
  buildDecisionGraph,
  reconstructDecisionGraph
};
