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

      <!-- Center: Canvas (M2) - Rete.js container -->
      <main class="canvas-area" id="canvas">
        <div id="rete-container" style="width: 100%; height: 100%;"></div>
        <p class="canvas-hint" style="pointer-events: none; position: absolute; z-index: 10;">Drag boxes here to build your workflow</p>
      </main>

      <!-- Right: Settings Panel (Hidden by default) -->
      <div id="settings-container" style="display: none;">
        <!-- Form yahan aayega -->
      </div>
    </div>
  `;
}