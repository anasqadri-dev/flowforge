// Validate the built-in workflow library without opening a browser.
globalThis.document = { getElementById: () => null };

const { BUILT_IN_TEMPLATES } = await import('../src/js/pages/templates.js');
const { validateWorkflow } = await import('../src/js/core/persistence.js');

if (BUILT_IN_TEMPLATES.length < 13) {
  throw new Error(`Expected at least 13 built-in templates; found ${BUILT_IN_TEMPLATES.length}.`);
}

const templateIds = new Set();
for (const template of BUILT_IN_TEMPLATES) {
  if (templateIds.has(template.id)) throw new Error(`Duplicate template ID: ${template.id}`);
  templateIds.add(template.id);

  validateWorkflow(template, { requireStart: true, strictConnections: true });

  const nodeIds = new Set(template.nodes.map(node => node.id));
  const adjacency = new Map(template.nodes.map(node => [node.id, []]));
  for (const edge of template.connections) adjacency.get(edge.from).push(edge.to);

  const start = template.nodes.find(node => ['Manual Start', 'Timer (Schedule)'].includes(node.type));
  const visited = new Set();
  const pending = [start.id];
  while (pending.length) {
    const id = pending.pop();
    if (visited.has(id)) continue;
    visited.add(id);
    pending.push(...adjacency.get(id));
  }
  if (visited.size !== template.nodes.length) {
    throw new Error(`Template "${template.name}" contains unreachable nodes.`);
  }

  for (const node of template.nodes) {
    const text = JSON.stringify(node.config || {});
    for (const match of text.matchAll(/\\{\\{\\s*(n\\d+)\\./g)) {
      if (!nodeIds.has(match[1])) {
        throw new Error(`Template "${template.name}" references missing node ${match[1]}.`);
      }
    }
  }
}

console.log(`Validated ${BUILT_IN_TEMPLATES.length} built-in templates: IDs, graph structure, connections, reachability, and node-output references.`);
