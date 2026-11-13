export function renderSettingsPanel(boxName) {
  if (!boxName) return '';

  let formFields = '';

  if (boxName.includes('HTTP')) {
    formFields = `
      <div class="form-group"><label>URL</label><input type="text" id="http-url" placeholder="https://api.example.com" required /></div>
      <div class="form-group"><label>Method</label><select id="http-method"><option>GET</option><option>POST</option></select></div>
    `;
  } else if (boxName.includes('Wait')) {
    formFields = `<div class="form-group"><label>Wait Time (s)</label><input type="number" id="wait-time" value="5" required /></div>`;
  } else if (boxName.includes('Condition')) {
     formFields = `<div class="form-group"><label>Condition</label><input type="text" id="condition-logic" placeholder="status == 200" required /></div>`;
  } else {
    formFields = `<p class="no-settings">No settings required.</p>`;
  }

  return `
    <aside class="settings-panel" id="settings-panel">
     <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center;">
    <h3>Configure: ${boxName}</h3>
    <button type="button" id="close-settings" style="background: none; border: none; color: #ff4444; font-size: 18px; cursor: pointer;">✖</button>
</div>
      <form id="settings-form" class="settings-form">
        ${formFields}
        <button type="submit" class="btn-primary" style="width: 100%; margin-top: 20px;">Save Settings</button>
      </form>
    </aside>
  `;
}