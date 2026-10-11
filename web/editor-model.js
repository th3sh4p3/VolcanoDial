export function orderedGraphNodes(graph) {
  const byId = new Map(graph.nodes.map((item) => [item.id, item]));
  const outgoing = new Map(graph.edges.map((edge) => [edge.source, edge.target]));
  const start = graph.nodes.find((item) => item.type === 'start');
  const result = []; const seen = new Set(); let current = start;
  while (current && !seen.has(current.id)) {
    result.push(current); seen.add(current.id); current = byId.get(outgoing.get(current.id));
  }
  return result.length === graph.nodes.length
    ? result
    : [...graph.nodes].sort((a, b) => (a.position?.x || 0) - (b.position?.x || 0));
}

export function rebuildLinearEdges(graph, order, createId = () => crypto.randomUUID()) {
  graph.edges = order.slice(0, -1).map((item, index) => ({ id: createId(), source: item.id, target: order[index + 1].id }));
  return graph;
}

export function insertLinearNode(graph, node, beforeId, createId) {
  const order = orderedGraphNodes(graph); const target = order.findIndex(({ id }) => id === beforeId);
  if (target < 1) throw new Error('A workflow step must be inserted after Start and before an existing step');
  graph.nodes.push(node); order.splice(target, 0, node); rebuildLinearEdges(graph, order, createId); return order;
}

export function linearInsertionTargetAtX(graph, x, nodeWidth = 180) {
  const order = orderedGraphNodes(graph);
  if (order.length < 2 || !Number.isFinite(x)) return null;
  let closest = null;
  for (let index = 1; index < order.length; index += 1) {
    const previousX = order[index - 1].position?.x || 0;
    const targetX = order[index].position?.x || 0;
    const gapX = (previousX + nodeWidth + targetX) / 2;
    const distance = Math.abs(x - gapX);
    if (!closest || distance < closest.distance) closest = { beforeId: order[index].id, distance };
  }
  return closest?.beforeId || null;
}

export function moveLinearNode(graph, nodeId, beforeId, createId) {
  const order = orderedGraphNodes(graph); const node = order.find(({ id }) => id === nodeId);
  if (!node || ['start', 'end'].includes(node.type) || nodeId === beforeId) return { changed: false, order };
  const remaining = order.filter(({ id }) => id !== nodeId); const target = remaining.findIndex(({ id }) => id === beforeId);
  if (target < 1) return { changed: false, order };
  remaining.splice(target, 0, node);
  if (remaining.every((item, index) => item.id === order[index].id)) return { changed: false, order };
  rebuildLinearEdges(graph, remaining, createId); return { changed: true, order: remaining };
}

export function removeLinearNode(graph, nodeId, createId) {
  const order = orderedGraphNodes(graph); const index = order.findIndex(({ id }) => id === nodeId); const node = order[index];
  if (!node || ['start', 'end'].includes(node.type)) return { removed: null, focusId: null, order };
  const focusId = order[index + 1]?.id || order[index - 1]?.id; const remaining = order.filter(({ id }) => id !== nodeId);
  graph.nodes = graph.nodes.filter(({ id }) => id !== nodeId); rebuildLinearEdges(graph, remaining, createId);
  return { removed: node, focusId, order: remaining };
}
