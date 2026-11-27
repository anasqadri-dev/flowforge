export function renderBuilder() {
  return `
    <div class="builder-container">
      <aside class="box-menu">
        <h3>Box Library</h3>
        <input type="text" id="search-box" placeholder="Search boxes..." class="search-input">
        
        <div class="box-category">
          <h4>Start</h4>
          <div class="box-item" draggable="true" data-node-type="Manual Start"><span class="icon"><i data-lucide="play" aria-hidden="true"></i></span> Manual Start</div>
          <div class="box-item" draggable="true" data-node-type="Timer"><span class="icon"><i data-lucide="clock" aria-hidden="true"></i></span> Timer (Schedule)</div>
        </div>

        <div class="box-category">
          <h4>Actions</h4>
          <div class="box-item" draggable="true" data-node-type="HTTP Request"><span class="icon"><i data-lucide="globe" aria-hidden="true"></i></span> HTTP Request</div>
          <div class="box-item" draggable="true" data-node-type="Transform Data"><span class="icon"><i data-lucide="sliders-horizontal" aria-hidden="true"></i></span> Transform Data</div>
          <div class="box-item" draggable="true" data-node-type="Set Variable"><span class="icon"><i data-lucide="variable" aria-hidden="true"></i></span> Set Variable</div>
          <div class="box-item" draggable="true" data-node-type="Wait"><span class="icon"><i data-lucide="timer" aria-hidden="true"></i></span> Wait</div>
        </div>

        <div class="box-category">
          <h4>Decisions</h4>
          <div class="box-item" draggable="true" data-node-type="Condition"><span class="icon"><i data-lucide="git-branch" aria-hidden="true"></i></span> Condition</div>
          <div class="box-item" draggable="true" data-node-type="Loop"><span class="icon"><i data-lucide="repeat" aria-hidden="true"></i></span> Loop</div>
        </div>

        <div class="box-category">
          <h4>Outputs</h4>
          <div class="box-item" draggable="true" data-node-type="Send Notification"><span class="icon"><i data-lucide="bell" aria-hidden="true"></i></span> Send Notification</div>
          <div class="box-item" draggable="true" data-node-type="Write to Log"><span class="icon"><i data-lucide="file-text" aria-hidden="true"></i></span> Write to Log</div>
        </div>
      </aside>

      <main class="canvas-area" id="drawflow-container" style="position: relative; width: 100%; height: 100%;"></main>

      <div id="settings-container" style="display: none;"></div>
    </div>
  `;
}