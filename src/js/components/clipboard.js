import { getNodePortCounts, createDrawflowNodeHtml } from './editor.js';
let clipboard = null;

export function copySelectedNode(editor) {
    if (!editor?.node_selected) return false;
    const id = editor.node_selected.id;
    const node = editor.getNodeFromId(id);
    if (!node?.data) return false;
    clipboard = {
        type: node.data.nodeType || node.name,
        config: structuredClone(node.data.config || {}),
        x: Number(node.pos_x) || 0,
        y: Number(node.pos_y) || 0
    };
    return true;
}

export function pasteNode(editor, offset = 40) {
    if (!clipboard || !editor) return null;
    const ports = getNodePortCounts(clipboard.type);
    const id = editor.addNode(
        clipboard.type, ports.inputs, ports.outputs,
        clipboard.x + offset, clipboard.y + offset,
        clipboard.type.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        { nodeType: clipboard.type, config: structuredClone(clipboard.config) },
        createDrawflowNodeHtml(clipboard.type, clipboard.config)
    );
    clipboard.x += offset;
    clipboard.y += offset;
    return id;
}
