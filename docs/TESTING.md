# FlowForge Browser Acceptance Tests

Run these checks in a modern desktop browser using the local static server or the deployed GitHub Pages site. Use a fresh browser profile for the first-run checks. Record the browser, date, result, and any console errors when testing for project submission.

## 1. Application shell

- [ ] Open the application and confirm the Dashboard loads without console errors.
- [ ] Navigate between Dashboard, Builder, Runs, Templates, and Settings using the sidebar.
- [ ] Confirm the active navigation item follows the current route.
- [ ] Toggle Light/Dark theme and confirm the selection survives a page refresh.
- [ ] Confirm icons render; if the CDN is unavailable, confirm the rest of the app remains usable.

## 2. Builder and editor

- [ ] Open Builder and confirm the box library, canvas, workflow toolbar, Run button, and settings panel are visible.
- [ ] Search for a node type and confirm unrelated node types are filtered out.
- [ ] Drag each available node type onto the canvas.
- [ ] Move nodes and confirm their positions remain stable after changing routes and returning to Builder.
- [ ] Connect a Manual Start to an action node and confirm the connection is visible.
- [ ] Confirm an ordinary action node cannot create multiple outgoing paths.
- [ ] Connect both Condition output ports and confirm they are represented as separate true/false branches.
- [ ] Confirm duplicate connections, self-connections, and cycles are rejected with feedback.
- [ ] Select a node, edit its settings, save, reopen the settings, and confirm values persist.
- [ ] Copy and paste a node with Ctrl/Cmd+C and Ctrl/Cmd+V.
- [ ] Delete a selected node with Delete/Backspace and confirm its connections are also removed.
- [ ] Undo and redo node creation, movement, configuration, and deletion.
- [ ] Zoom and pan the canvas; confirm the toolbar remains usable.
- [ ] Test a node label/configuration containing characters such as `<`, `>`, `&`, quotes, and an HTML-looking string. It must display as text and must not create HTML elements or execute scripts.

## 3. Workflow execution

- [ ] Run a Manual Start → Write to Log workflow and confirm a successful run record is created.
- [ ] Run a Set Variable → Transform Data workflow using a `{{variableName}}` placeholder and confirm interpolation.
- [ ] Run a Condition workflow with one true and one false path; confirm only the selected path executes.
- [ ] Run a Loop with a connected body path and a small iteration count; confirm each body step executes the expected number of times.
- [ ] Try a Loop with no selected body, disconnected body nodes, and an invalid count; confirm a clear error is shown.
- [ ] Try a workflow with no start node or multiple start nodes; confirm execution is rejected.
- [ ] Run a Wait node and confirm the configured duration is respected.
- [ ] Run an HTTP Request against a CORS-enabled test endpoint; verify method, headers, body, response parsing, timeout, and non-2xx handling.
- [ ] Run Send Notification after granting browser permission; then test denied permission.
- [ ] Confirm a failed step is marked as failed and its error is visible in Run History.

## 4. Persistence and import/export

- [ ] Create and configure a workflow, wait for auto-save, refresh the page, and confirm the workflow restores.
- [ ] Rename a workflow, navigate away, return, and confirm its name persists.
- [ ] Use Save and confirm the saved-workflow notification appears.
- [ ] Export a workflow and confirm the downloaded JSON contains its nodes, positions, configuration, and connections.
- [ ] Import the exported JSON and confirm the workflow is restored under a new saved workflow record.
- [ ] Import malformed JSON, an unsupported node type, duplicate node IDs, invalid connections, a cyclic graph, and a file larger than the allowed limit; confirm each is rejected without replacing the current workflow.
- [ ] Confirm a second browser profile does not automatically see the first profile's IndexedDB data.

## 5. Run history

- [ ] Confirm successful and failed runs appear in Runs.
- [ ] Open a run and inspect status, start time, duration, step outputs, and error details.
- [ ] Delete one run and confirm it disappears.
- [ ] Clear all run history and confirm the list and counters update.
- [ ] Confirm the Dashboard counters and recent-run list match the stored records.

## 6. Templates and settings

- [ ] Load each built-in template and confirm its nodes and connections appear in Builder.
- [ ] Save the current workflow as a custom template, reload Templates, and confirm it remains available.
- [ ] Delete a custom template and confirm it disappears.
- [ ] Change theme and preferences, refresh, and confirm they persist.
- [ ] Clear application data and confirm workflows, runs, and custom templates are removed and the active workflow pointer is cleared.

## 7. Responsive and deployment checks

- [ ] Test the application at desktop, tablet, and narrow mobile widths.
- [ ] Confirm the Builder panels stack without horizontal page overflow on mobile.
- [ ] Open the deployed GitHub Pages URL in a clean browser profile and confirm all modules load.
- [ ] Check the browser console and Network panel for failed module, stylesheet, icon, or Drawflow CDN requests.
- [ ] Confirm the site can be refreshed directly on each hash route.

## Release sign-off

Do not mark the project fully verified until all critical checks pass on the deployed site. GitHub Pages reporting a successful deployment only confirms the static site deployment job completed; it does not prove the application's interactive workflows work correctly.
