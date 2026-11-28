# FlowForge Browser Acceptance Tests

Run these checks in a modern desktop browser using the local static server or the deployed GitHub Pages site. Use a fresh browser profile for the first-run checks. Record the browser, date, result, and any console errors when testing for project submission.

## 1. Application shell

- [ ] Open the application and confirm the Dashboard loads without console errors.
- [ ] Navigate between Dashboard, Builder, Runs, Templates, and Settings using the sidebar.
- [ ] Create a new workflow from the Dashboard while another workflow is active; confirm the previous workflow is preserved and the new workflow is empty.
- [ ] Open an older saved workflow from the Dashboard and confirm its nodes, connections, and settings restore.
- [ ] Confirm the active navigation item follows the current route.
- [ ] Toggle Light/Dark theme and confirm the selection survives a page refresh.
- [ ] Confirm icons render; if the CDN is unavailable, confirm the rest of the app remains usable.

## 2. Builder and editor

- [ ] Open Builder and confirm the box library, canvas, workflow toolbar, Run button, and settings panel are visible.
- [ ] Search for a node type and confirm unrelated node types are filtered out.
- [ ] Drag each available node type onto the canvas.
- [ ] Confirm the Box Library has 28 node types grouped into Triggers, HTTP & API, Data & JSON, Arrays & Collections, Text, Math & Utilities, and Flow Control.
- [ ] Run JSON Parse, JSON Stringify, Merge Data, and Validate JSON with valid and invalid input.
- [ ] Run Filter Array and Array Length with JSON arrays; verify property matching and empty-array behavior.
- [ ] Run Format Text, Replace Text, Split Text, and Join Text with normal text and interpolated values.
- [ ] Run Math Operation with each operator; confirm division by zero and invalid operands produce clear errors.
- [ ] Run Random Number with a fixed minimum/maximum, Generate UUID, and Current Date & Time.
- [ ] Run URL Encode/Decode and Base64 Encode/Decode, including Unicode text.
- [ ] Move nodes and confirm their positions remain stable after changing routes and returning to Builder.
- [ ] Connect a Manual Start to an action node and confirm the connection is visible.
- [ ] Confirm an ordinary action node cannot create multiple outgoing paths.
- [ ] Connect both Condition output ports and confirm they are represented as separate true/false branches.
- [ ] Click a connection line to select it, then press Delete/Backspace; confirm only that connection disappears and the workflow state is updated.
- [ ] Delete a connection from each Condition output branch and confirm the other branch remains intact.
- [ ] Confirm deleting a selected connection does not delete either connected node.
- [ ] Confirm duplicate connections, self-connections, and cycles are rejected with feedback.
- [ ] Single-click a node and confirm it is selected without opening the settings panel.
- [ ] Double-click a node and confirm its settings panel opens; edit settings, save, double-click again, and confirm values persist.
- [ ] Copy and paste a node with Ctrl/Cmd+C and Ctrl/Cmd+V.
- [ ] Delete a selected node with Delete/Backspace and confirm its connections are also removed.
- [ ] Undo and redo node creation, movement, configuration, and deletion.
- [ ] Zoom and pan the canvas; confirm the toolbar remains usable.
- [ ] Test a node label/configuration containing characters such as `<`, `>`, `&`, quotes, and an HTML-looking string. It must display as text and must not create HTML elements or execute scripts.

## 3. Workflow execution

- [ ] Run a Manual Start → Write to Log workflow and confirm a successful run record is created.
- [ ] While a workflow runs, confirm the Builder's Live Execution panel updates for every step without opening DevTools or Run History.
- [ ] Confirm each step displays RUNNING followed by SUCCESS/ERROR and shows its output or error message.
- [ ] Confirm the progress bar, final status, duration, and expandable final workflow data update after completion.
- [ ] Run a Loop and confirm repeated body steps appear separately with their iteration numbers.
- [ ] Run a failing workflow and confirm the failed step and its error are visible immediately in the Builder.
- [ ] Run a Set Variable → Transform Data workflow using a `{{variableName}}` placeholder and confirm interpolation.
- [ ] Run a Condition workflow with one true and one false path; confirm only the selected path executes.
- [ ] Run a Loop with a connected body path and a small iteration count; confirm each body step executes the expected number of times.
- [ ] Try a Loop with no selected body, disconnected body nodes, and an invalid count; confirm a clear error is shown.
- [ ] Try a workflow with no start node, multiple start nodes, or disconnected nodes; confirm execution is rejected.
- [ ] Run a Wait node and confirm the configured duration is respected.
- [ ] Start a long-running workflow, switch to another workflow before it finishes, and confirm the run is recorded against the workflow that actually ran.
- [ ] Run an HTTP Request against a CORS-enabled test endpoint; verify method, headers, body, response parsing, timeout, and non-2xx handling.
- [ ] Run Send Notification with browser permission granted; confirm both the in-app toast and browser notification appear.
- [ ] Run Send Notification with browser permission denied or unavailable; confirm the in-app toast still displays the interpolated message and the workflow completes successfully.
- [ ] Run Customer Welcome Notification and confirm the displayed message includes the configured customer name.
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

- [ ] Confirm the Templates page lists 16 built-in templates plus any saved custom templates.
- [ ] Load every built-in template and confirm all nodes, connections, positions, and node configurations appear in Builder.
- [ ] Load API Record Lookup and API Response Summary; confirm `{{nodeId.field}}` references still resolve after the template is cloned.
- [ ] Load API Status Checker, Support Ticket Triage, and Required Field Validation; confirm both Condition output branches are visible and only the matching branch executes.
- [ ] Load Send JSON to Webhook and Create Demo API Record; confirm HTTP methods, headers, request bodies, and response logs are populated correctly.
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


## Builder workspace scrolling and sizing
- [ ] Confirm the Builder page can scroll vertically when the workspace exceeds the viewport height.
- [ ] Confirm the workspace can scroll horizontally when the canvas and settings panel do not fit the viewport width.
- [ ] Confirm the Box Library has its own vertical scrollbar and remains usable while the canvas is large.
- [ ] Confirm the canvas is at least 1050 × 900 on desktop and supports placing and connecting more than five nodes without running out of visible workspace.
- [ ] Confirm the node settings panel has its own vertical scrollbar when its form is taller than the viewport.
- [ ] Repeat the checks at tablet and mobile widths; confirm the canvas remains horizontally scrollable rather than shrinking to an unusable size.


## Builder layout at normal browser zoom
- [ ] At 100% browser zoom on a 1366 × 768 or larger desktop, confirm the Box Library and canvas fit side by side without horizontal page overflow.
- [ ] Confirm the Run Workflow button remains fully visible at the top-right of the canvas.
- [ ] Confirm the workflow-name field is wide enough to read and edit a typical workflow name.
- [ ] Confirm the canvas fills the available width beside the Box Library and does not force a fixed 1050px horizontal overflow.
- [ ] Confirm the Builder uses the available viewport height without a large empty border around the library and canvas.
- [ ] Confirm the Box Library scrolls independently and the canvas remains stationary while browsing box types.
- [ ] Repeat at 67%, 80%, 100%, and 125% browser zoom; confirm the desktop layout remains usable at each zoom.
- [ ] Open node settings and confirm the settings panel takes space from the canvas without pushing the Run Workflow button off-screen.
- [ ] Confirm tablet/mobile layouts remain scrollable and usable.
