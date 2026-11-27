

import { renderSettingsPanel } from '../components/settings-panel.js';

export function renderBuilder() {
  return `
    <div class="builder-container">
      <!-- Left: Box Menu (Complete M3) -->
      <aside class="box-menu">
        <h3>Box Library</h3>
        <input type="text" id="search-box" placeholder="Search boxes..." class="search-input">
        
        <div class="box-category">
          <h4>Start</h4>
          <div class="box-item" draggable="true"><span class="icon">▶</span> Manual Start</div>
          <div class="box-item" draggable="true"><span class="icon">⏱</span> Timer (Schedule)</div>
        </div>

        <div class="box-category">
          <h4>Actions</h4>
          <div class="box-item" draggable="true"><span class="icon">🌐</span> HTTP Request</div>
          <div class="box-item" draggable="true"><span class="icon">⚙</span> Transform Data</div>
          <div class="box-item" draggable="true"><span class="icon">📝</span> Set Variable</div>
          <div class="box-item" draggable="true"><span class="icon">⏳</span> Wait</div>
        </div>

        <div class="box-category">
          <h4>Decisions</h4>
          <div class="box-item" draggable="true"><span class="icon">🔀</span> Condition</div>
          <div class="box-item" draggable="true"><span class="icon">🔁</span> Loop</div>
        </div>

        <div class="box-category">
          <h4>Outputs</h4>
          <div class="box-item" draggable="true"><span class="icon">🔔</span> Send Notification</div>
          <div class="box-item" draggable="true"><span class="icon">📄</span> Write to Log</div>
        </div>
      </aside>

      <!-- Center: Canvas (M2) -->
      <main class="canvas-area" id="canvas">
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