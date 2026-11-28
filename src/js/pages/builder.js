export function renderBuilder() {
  const item = (type, icon, label = type) => `<div class="box-item" draggable="true" data-node-type="${type}"><span class="icon"><i data-lucide="${icon}" aria-hidden="true"></i></span> ${label}</div>`;
  return `
    <div class="builder-container">
      <aside class="box-menu">
        <h3>Box Library</h3>
        <input type="text" id="search-box" placeholder="Search boxes..." class="search-input" aria-label="Search workflow boxes">
        <div class="box-category"><h4>Triggers</h4>
          ${item('Manual Start','play')}${item('Timer (Schedule)','clock')}
        </div>
        <div class="box-category"><h4>HTTP & API</h4>
          ${item('HTTP Request','globe')}${item('Send Notification','bell')}${item('Write to Log','file-text')}
        </div>
        <div class="box-category"><h4>Data & JSON</h4>
          ${item('Transform Data','sliders-horizontal')}${item('Set Variable','variable')}${item('JSON Parse','braces')}${item('JSON Stringify','code')}${item('Merge Data','combine')}${item('Validate JSON','shield-check')}
        </div>
        <div class="box-category"><h4>Arrays & Collections</h4>
          ${item('Filter Array','list-filter')}${item('Array Length','list-ordered')}
        </div>
        <div class="box-category"><h4>Text</h4>
          ${item('Format Text','text')}${item('Replace Text','replace')}${item('Split Text','scissors')}${item('Join Text','list')}
        </div>
        <div class="box-category"><h4>Math & Utilities</h4>
          ${item('Math Operation','calculator')}${item('Random Number','shuffle')}${item('Generate UUID','fingerprint')}${item('Current Date & Time','calendar-clock')}${item('URL Encode','link')}${item('URL Decode','unlink')}${item('Base64 Encode','lock')}${item('Base64 Decode','unlock')}
        </div>
        <div class="box-category"><h4>Flow Control</h4>
          ${item('Condition','git-branch')}${item('Loop','repeat')}${item('Wait','timer')}
        </div>
        <p class="box-library-count">28 available boxes</p>
      </aside>
      <main class="canvas-area">
        <div id="drawflow-container" aria-label="Workflow canvas"></div>
        <div class="workflow-toolbar">
          <input type="text" id="workflow-name" placeholder="Workflow name" value="Untitled Workflow" aria-label="Workflow name">
          <button type="button" id="save-workflow">Save</button>
          <button type="button" id="export-workflow">Export JSON</button>
          <button type="button" id="import-workflow">Import JSON</button>
          <input type="file" id="workflow-file" accept=".json,application/json" hidden>
        </div>
        <button type="button" id="run-workflow" class="btn-primary run-workflow-btn"><i data-lucide="play" aria-hidden="true"></i> Run Workflow</button>
        <section id="execution-monitor" class="execution-monitor" aria-live="polite" aria-label="Live workflow execution">
          <div class="execution-monitor-heading"><div><h3>Live Execution</h3><p id="execution-summary">Run your workflow to watch each step and its output here.</p></div><span id="execution-status" class="run-status idle">IDLE</span></div>
          <div class="execution-progress"><span id="execution-progress-bar"></span></div>
          <ol id="execution-steps" class="execution-steps"><li class="execution-empty">No execution yet. Press Run Workflow to begin.</li></ol>
          <details class="execution-context"><summary>Final workflow data</summary><pre id="execution-final-context">No data yet.</pre></details>
        </section>
      </main>
      <div id="settings-container" style="display: none;"></div>
    </div>
  `;
}
