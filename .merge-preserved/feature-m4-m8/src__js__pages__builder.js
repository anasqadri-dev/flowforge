export function renderBuilder() {
  return `
    <div class="builder-container">
      <!-- Left: Box Menu (Complete M3) -->
      <aside class="box-menu">
        <h3>Box Library</h3>
        <input type="text" id="search-box" placeholder="Search boxes..." class="search-input">
        
        <div class="box-category">
          <h4>Start</h4>
          <div class="box-item" draggable="true"><span class="icon"><i data-lucide="play" aria-hidden="true"></i></span> Manual Start</div>
          <div class="box-item" draggable="true"><span class="icon"><i data-lucide="clock" aria-hidden="true"></i></span> Timer (Schedule)</div>
        </div>

        <div class="box-category">
          <h4>Actions</h4>
          <div class="box-item" draggable="true"><span class="icon"><i data-lucide="globe" aria-hidden="true"></i></span> HTTP Request</div>
          <div class="box-item" draggable="true"><span class="icon"><i data-lucide="sliders-horizontal" aria-hidden="true"></i></span> Transform Data</div>
          <div class="box-item" draggable="true"><span class="icon"><i data-lucide="variable" aria-hidden="true"></i></span> Set Variable</div>
          <div class="box-item" draggable="true"><span class="icon"><i data-lucide="timer" aria-hidden="true"></i></span> Wait</div>
        </div>

        <div class="box-category">
          <h4>Decisions</h4>
          <div class="box-item" draggable="true"><span class="icon"><i data-lucide="git-branch" aria-hidden="true"></i></span> Condition</div>
          <div class="box-item" draggable="true"><span class="icon"><i data-lucide="repeat" aria-hidden="true"></i></span> Loop</div>
        </div>

        <div class="box-category">
          <h4>Outputs</h4>
          <div class="box-item" draggable="true"><span class="icon"><i data-lucide="bell" aria-hidden="true"></i></span> Send Notification</div>
          <div class="box-item" draggable="true"><span class="icon"><i data-lucide="file-text" aria-hidden="true"></i></span> Write to Log</div>
        </div>
      </aside>

      <!-- Center: Canvas (M2) -->
      <main class="canvas-area" id="canvas">
      <div class="workflow-toolbar">
    <input
        type="text"
        id="workflow-name"
        placeholder="Workflow name"
        value="Untitled Workflow"
        aria-label="Workflow name"
    >

    <button type="button" id="save-workflow">
        Save
    </button>

    <button type="button" id="export-workflow">
        Export JSON
    </button>

    <button type="button" id="import-workflow">
        Import JSON
    </button>

    <input
        type="file"
        id="workflow-file"
        accept=".json,application/json"
        hidden
    >
</div>
      <button
  type="button"
  id="run-workflow"
  class="btn-primary run-workflow-btn"
>
  <i data-lucide="play" aria-hidden="true"></i> Run Workflow
</button>
       <svg id="svg-layer" width="100%" height="100%" style="position: absolute; top: 0; left: 0; pointer-events: none; z-index: 50;">
    <defs>
        <!-- arrowhead ko box ke upar dikhane ke liye refX set kiya hai -->
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#4f46e5" />
        </marker>
    </defs>
</svg>
        <p class="canvas-hint">Drag boxes here to build your workflow</p>
      </main>

      <!-- Right: Settings Panel (Hidden by default) -->
      <div id="settings-container" style="display: none;">
        <!-- Form yahan aayega -->
      </div>
    </div>
  `;
}
