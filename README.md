# FlowForge

### Build workflows. Connect actions. Automate everything.

**FlowForge** is a browser-based visual workflow automation platform that lets users create, configure, and execute automated workflows without writing application code.

Users add workflow boxes to a Drawflow-powered canvas, connect them to define execution paths, configure each action, and run the workflow through a built-in JavaScript execution engine. Drawflow handles visual editing and JSON import/export; FlowForge's internal state remains the source of truth, while IndexedDB stores workflows, execution records, and application settings.

The application runs entirely in the browser. It does not require a backend server, external database, frontend framework, Node.js, or npm. Timer-based workflows execute only while the application tab remains open. HTTP Request nodes are subject to browser networking rules, including CORS restrictions.

---

## Project information

| Detail | Information |
| --- | --- |
| University | Sukkur IBA University |
| Department | Department of Computer Science |
| Course | Web Engineering Theory |
| Course level | BS-V Software Engineering |
| Section | A |
| Semester | Fall 2026 |
| Instructor | Sir Nisar Ahmed Siddiqui |
| Project type | Academic final project |

## Team members

| Name | Role |
| --- | --- |
| Muhammad Anas Qadri | Project Developer |
| Pirha Mahar | Project Developer |

## Features

- Visual workflow builder with drag-and-drop nodes, connections, zoom, and pan.
- 28 built-in workflow boxes across triggers, HTTP/API, data/JSON, arrays, text, math/utilities, and flow control.
- Dynamic configuration forms and executable handlers for JSON parsing/validation, array filtering, text processing, math, date/time, UUID, URL, and Base64 operations.
- Live in-app execution monitor showing each step as it starts and finishes, with readable outputs, errors, progress, and final workflow data.
- In-app notification delivery after workflow completion; native browser notifications are an optional enhancement.
- Write to Log results are displayed in the execution monitor rather than relying on the browser console.
- Workflow execution with sequential steps, conditions, and bounded loop bodies.
- Variable interpolation between workflow steps.
- Execution history with step-level inputs, outputs, and errors.
- Create multiple workflows, reopen saved workflows from the Dashboard, and automatically save through IndexedDB.
- JSON workflow import and export.
- 16 built-in, practical workflow templates and user-created templates.
- Light and dark themes.
- Responsive application layout.
- Text-only FlowForge sidebar wordmark and a custom SVG browser favicon.

## Box library

The Builder includes 28 draggable box types: Manual Start, Timer (Schedule), HTTP Request, Transform Data, Set Variable, Wait, Condition, Loop, Send Notification, Write to Log, JSON Parse, JSON Stringify, Merge Data, Validate JSON, Filter Array, Array Length, Format Text, Replace Text, Split Text, Join Text, Math Operation, Random Number, Generate UUID, Current Date & Time, URL Encode, URL Decode, Base64 Encode, and Base64 Decode.

All new actions have matching settings forms and execution handlers. JSON inputs are parsed and validated, array operations require JSON arrays, math rejects invalid operands and division by zero, and Base64 helpers support Unicode text.

## Live execution experience

When a workflow runs, the Builder displays a live execution panel directly over the canvas. Each action appears as it starts, then changes to success or failure and shows its returned data or error. The panel includes overall progress, elapsed run summary, and expandable final workflow context. This is implemented with the existing browser JavaScript and CSS stack; no additional UI library or backend is required.

## Technology stack

| Technology | Purpose |
| --- | --- |
| HTML5 | Application structure |
| CSS3 | Styling and responsive layout |
| Vanilla JavaScript (ES modules) | Application logic |
| Drawflow 0.0.60 | Visual node editor |
| Lucide 0.468.0 | Interface icons |
| IndexedDB | Local application persistence |
| Local Storage | Small active-workflow and theme preferences |
| HTML Drag and Drop API | Adding nodes from the box library |
| Git and GitHub | Version control and collaboration |
| GitHub Pages | Static hosting |

**Development restriction:** The project uses vanilla HTML, CSS, and JavaScript. It intentionally has no frontend framework or backend service.

## Core modules

| Module | Description |
| --- | --- |
| M1 — App Shell | Navigation, responsive layout, themes, and notifications |
| M2 — Builder Screen | Interactive canvas, draggable boxes, connections, undo/redo, zoom, and pan |
| M3 — Box Menu | Searchable and categorized workflow box library |
| M4 — Settings Form | Dynamic configuration, input validation, and variable interpolation |
| M5 — Workflow Engine | Execution order, graph validation, cycle detection, and error handling |
| M6 — Run History | Execution records, step timelines, outputs, and errors |
| M7 — Persistence | IndexedDB storage, automatic saving, and JSON import/export |
| M8 — Templates and Settings | Pre-built workflows and application preferences |

## Project structure

```text
.
├── .github/
│   └── workflows/
│       └── validate.yml
├── favicon.svg
├── index.html
├── src/
│   ├── css/
│   │   ├── app-shell.css
│   │   ├── components.css
│   │   ├── layout.css
│   │   ├── reset.css
│   │   ├── responsive.css
│   │   └── variables.css
│   └── js/
│       ├── app.js
│       ├── components/
│       │   ├── clipboard.js
│       │   ├── editor.js
│       │   ├── nodes.js
│       │   ├── notifications.js
│       │   ├── settings-panel.js
│       │   └── sidebar.js
│       ├── core/
│       │   ├── database.js
│       │   ├── engine.js
│       │   ├── handlers.js
│       │   ├── icons.js
│       │   ├── navigation.js
│       │   ├── persistence.js
│       │   ├── state.js
│       │   └── theme.js
│       └── pages/
│           ├── builder.js
│           ├── runs.js
│           ├── settings.js
│           └── templates.js
├── docs/
│   ├── FlowForge_Muhammad-Anas-Qadri_053-24-0016.pdf
│   └── TESTING.md
├── scripts/
│   ├── validate-box-library.mjs
│   ├── validate-notifications.mjs
│   └── validate-templates.mjs
├── LICENSE
└── README.md
```

## Getting started

### Prerequisites

- A modern browser with IndexedDB support.
- Git.
- Visual Studio Code or another code editor.
- A local static development server.

### Run locally

Clone the repository:

```bash
git clone https://github.com/anasqadri-dev/flowforge.git
cd flowforge
```

Start a local server from the project root. For example:

```bash
python -m http.server 5500
```

Open [http://localhost:5500](http://localhost:5500) in your browser. VS Code Live Server can also be used.

Opening `index.html` directly with a `file://` URL is not recommended because the application uses JavaScript modules and browser storage APIs.

## Testing and known limitations

The repository includes automated JavaScript syntax/import checks, built-in template validation, and box-handler/notification regression checks. Full browser acceptance and end-to-end testing remain manual; verify the scenarios in [docs/TESTING.md](docs/TESTING.md). Before release, verify the scenarios in [docs/TESTING.md](docs/TESTING.md).

- Workflow data is local to the browser profile and is not synchronized across devices.
- Timer-based workflows require the application tab to remain open.
- HTTP requests may fail when a target service does not allow cross-origin browser requests.
- A workflow must contain exactly one start node before it can execute.
- Ordinary action nodes support one outgoing connection; Condition nodes provide two decision branches.
- Loop bodies are bounded and must be configured as a single connected path.

## Deployment

FlowForge is deployed as a static site through GitHub Pages. Application data remains in the user's browser; no application backend is involved.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

**FlowForge — A Web Engineering Final Project**

Developed at Sukkur IBA University, Department of Computer Science.
