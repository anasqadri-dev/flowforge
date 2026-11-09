import { showNotification } from "./components/notifications.js";
import { initializeSidebar } from "./components/sidebar.js";
import { initializeTheme } from "./core/theme.js";
import { initializeNavigation } from "./core/navigation.js";

function initializeApp() {
  console.log("Initializing FlowForge...");
  const themeToggle = document.getElementById("theme-toggle");
  initializeTheme(themeToggle);
  initializeSidebar();
  initializeNavigation(showNotification);
  console.log("FlowForge initialized successfully.");
}

initializeApp();