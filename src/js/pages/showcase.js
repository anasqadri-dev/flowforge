export function renderShowcase() {
    return `
      <section class="page-container showcase-page">
        <div class="page-heading"><div><h1>Workflow Showcase</h1><p>Explore practical automation patterns and start with a ready-made workflow.</p></div><a class="btn-primary" href="#templates">Browse all templates</a></div>
        <div class="showcase-grid">
          <article class="settings-card"><i data-lucide="user-round-check"></i><h2>Customer onboarding</h2><p>Validate customer details, prepare a welcome message, and record the result.</p><a href="#templates">Find onboarding templates</a></article>
          <article class="settings-card"><i data-lucide="file-spreadsheet"></i><h2>CSV data processing</h2><p>Read a selected file, parse rows, transform records, and generate a downloadable CSV.</p><a href="#builder">Build a CSV workflow</a></article>
          <article class="settings-card"><i data-lucide="shield-alert"></i><h2>Error recovery</h2><p>Retry temporary failures and route unsuccessful steps to a recovery node.</p><a href="#builder">Open workflow builder</a></article>
          <article class="settings-card"><i data-lucide="calendar-clock"></i><h2>Scheduled operations</h2><p>Schedule a saved workflow to run while FlowForge remains open.</p><a href="#settings">Configure local schedules</a></article>
          <article class="settings-card"><i data-lucide="chart-no-axes-combined"></i><h2>Execution analytics</h2><p>Review success rates, failed executions, average duration, and recent activity.</p><a href="#analytics">Open analytics</a></article>
          <article class="settings-card"><i data-lucide="workflow"></i><h2>Reusable automation</h2><p>Break larger processes into smaller workflows and call them as sub-workflows.</p><a href="#builder">Create a reusable workflow</a></article>
        </div>
      </section>`;
}
