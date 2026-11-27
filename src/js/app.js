// src/js/app.js
import { initializePersistence } from "./core/persistence.js";
import { saveRun } from "./core/database.js";
import { showNotification } from "./components/notifications.js";
import { initializeSidebar } from "./components/sidebar.js";
import { initializeTheme } from "./core/theme.js";
import { initializeNavigation } from "./core/navigation.js";

function initializeApp() {
  console.log("Initializing FlowForge...");

  try {
    initializeTheme(); 
    console.log("Theme initialized.");
  } catch (err) {
    console.error("Theme initialization failed:", err);
  }

  try {
    initializeSidebar();
  } catch (err) {
    console.error("Sidebar initialization failed:", err);
  }

  try {
    initializePersistence(showNotification);
    initializeNavigation(showNotification);
  } catch (err) {
    console.error("Application initialization failed:", err);
  }

  document.addEventListener(
  "flowforge:workflow-completed",
  async (event) => {
    try {
      await saveRun(event.detail);
      console.log("Run history saved successfully.");
    } catch (error) {
      console.error("Failed to save run history:", error);
    }
  }
);

}

// Wait until the document is ready.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}