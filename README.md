# FlowForge

### Build workflows. Connect actions. Automate everything.

**FlowForge** is a browser-based visual workflow automation platform that allows users to create, configure, and execute automated workflows without writing code.

Users can drag workflow boxes onto a visual canvas, connect them to define execution order, configure their behavior, and execute the entire workflow through a built-in JavaScript execution engine.

The application runs entirely in the browser and uses IndexedDB for local data persistence. No backend server, external database, or frontend framework is required.

---

## Project Information

| Detail       | Information                    |
| ------------ | ------------------------------ |
| University   | Sukkur IBA University          |
| Department   | Department of Computer Science |
| Course       | Web Engineering Theory         |
| Course Level | BS-V Software Engineering      |
| Section      | A                              |
| Semester     | Fall 2026                      |
| Instructor   | Sir Nisar Ahmed Siddiqui       |
| Project Name | FlowForge                      |
| Project Type | Academic Final Project         |

## Team Members

| Name                | Role              |
| ------------------- | ----------------- |
| Muhammad Anas Qadri | Project Developer |
| Pirha Mahar         | Project Developer |

## Overview

Traditional workflow automation platforms can be complex, require accounts, depend on cloud infrastructure, or introduce unnecessary overhead for beginners.

FlowForge aims to provide a lightweight alternative that runs directly in the browser.

The platform provides a visual workflow builder where users can:

- Create workflows using drag-and-drop boxes.
- Connect boxes using visual SVG connections.
- Configure individual workflow actions.
- Pass data between boxes using variables.
- Execute workflows using a built-in execution engine.
- View execution history and logs.
- Save workflows locally using IndexedDB.
- Import and export workflows as JSON files.
- Use predefined workflow templates.

## Technology Stack

| Technology                              | Purpose                                   |
| --------------------------------------- | ----------------------------------------- |
| HTML5                                   | Application structure                     |
| CSS3                                    | Styling and responsive interface          |
| Vanilla JavaScript                      | Application logic and interactions        |
| SVG                                     | Workflow connections and visual rendering |
| IndexedDB                               | Local browser persistence                 |
| HTML Drag and Drop API / Pointer Events | Drag-and-drop interactions                |
| Git & GitHub                            | Version control and collaboration         |
| GitHub Pages                            | Application deployment                    |

**Development restriction:** The application is built using vanilla HTML, CSS, and JavaScript without frontend frameworks or backend services.

## Core Modules

| Module                    | Description                                                                |
| ------------------------- | -------------------------------------------------------------------------- |
| M1 — App Shell            | Navigation, responsive layout, themes, and notifications                   |
| M2 — Builder Screen       | Interactive canvas, draggable boxes, connections, undo/redo, zoom, and pan |
| M3 — Box Menu             | Searchable and categorized workflow box library                            |
| M4 — Settings Form        | Dynamic configuration, input validation, and variable interpolation        |
| M5 — Workflow Engine      | Execution order, graph validation, cycle detection, and error handling     |
| M6 — Run History          | Execution records, step timelines, inputs, outputs, and errors             |
| M7 — Persistence          | IndexedDB storage, automatic saving, and JSON import/export                |
| M8 — Templates & Settings | Pre-built workflows and application preferences                            |

## Project Structure

The project follows a modular JavaScript architecture to keep the interface, workflow engine, storage, and individual components separated.

- `src/css/` — Stylesheets and themes.
- `src/js/core/` — Workflow engine and core logic.
- `src/js/components/` — Canvas, nodes, connections, and notifications.
- `src/js/panels/` — Workflow configuration panels.
- `src/js/boxes/` — Workflow box implementations.
- `src/js/storage/` — IndexedDB persistence.
- `src/js/pages/` — Application screens.
- `tests/` — Project tests.
- `docs/` — Technical documentation and diagrams.

## Getting Started

### Prerequisites

- A modern web browser.
- Git.
- A code editor such as Visual Studio Code.
- A local development server.

### Installation

Clone the repository:

```bash
git clone https://github.com/anasqadri-dev/flowforge.git
```

Navigate to the project directory:

```bash
cd flowforge
```

Start a local development server.

For example, using the VS Code Live Server extension, open `index.html` with Live Server.

Alternatively, use Python:

```bash
python -m http.server 5500
```

Then open:

```text
http://localhost:5500
```

## Development Guidelines

To maintain a clean and collaborative codebase:

1. Keep JavaScript modules focused on a single responsibility.
2. Use meaningful variable and function names.
3. Avoid unnecessary dependencies and frameworks.
4. Test features before merging them into the main branch.
5. Use feature branches for new functionality.
6. Submit changes through pull requests.
7. Update documentation when introducing major features.

## Project Goals

- Develop a functional visual workflow editor.
- Implement a browser-based workflow execution engine.
- Support configurable workflow actions and conditions.
- Provide reliable local persistence.
- Maintain a responsive and accessible user interface.
- Demonstrate practical Web Engineering concepts.

## Deployment

FlowForge is designed to be deployed using **GitHub Pages**, allowing users to access the application through a web browser.

All application data remains in the user's browser through IndexedDB. HTTP requests made by user-created workflows may still communicate with external services when configured, subject to browser security and CORS restrictions.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

---

**FlowForge — A Web Engineering Final Project**

Developed at Sukkur IBA University, Department of Computer Science.
