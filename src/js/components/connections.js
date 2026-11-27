export function setupConnectionGuard(editor) {
  editor.on('connectionCreated', (conn) => {
    const { output_id, input_id, output_class, input_class } = conn;
    const currentModule = editor.getModule ? editor.getModule() : 'Home';
    const data = editor.export().drawflow[currentModule].data;

    let duplicateCount = 0;

    for (const nodeId in data) {
      const node = data[nodeId];
      const outputs = node.outputs || {};
      for (const outKey in outputs) {
        const connections = outputs[outKey].connections || [];
        for (const c of connections) {
          if (c.node == input_id && c.output == input_class) {
            duplicateCount++;
          }
        }
      }
    }

    if (duplicateCount > 1) {
      editor.removeSingleConnection(output_id, input_id, output_class, input_class);
      console.warn('Duplicate connection prevented');
    }
  });
}