let clipboard = null;

export function copySelectedNode(editor) {
  if (!editor.node_selected) return false;
  const nodeId = editor.node_selected.id;
  const node = editor.getNodeFromId(nodeId);
  if (!node) return false;

  clipboard = {
    name: node.name,
    inputs: Object.keys(node.inputs || {}).length,
    outputs: Object.keys(node.outputs || {}).length,
    pos_x: node.pos_x,
    pos_y: node.pos_y,
    class: node.class,
    data: JSON.parse(JSON.stringify(node.data || {})),
    html: node.html
  };
  return true;
}

export function pasteNode(editor, offset = 40) {
  if (!clipboard) return null;

  const newId = editor.addNode(
    clipboard.name,
    clipboard.inputs,
    clipboard.outputs,
    clipboard.pos_x + offset,
    clipboard.pos_y + offset,
    clipboard.class,
    JSON.parse(JSON.stringify(clipboard.data)),
    clipboard.html
  );

  clipboard.pos_x += offset;
  clipboard.pos_y += offset;
  return newId;
}

export function hasClipboard() {
  return clipboard !== null;
}