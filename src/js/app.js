// src/js/app.js
import { showNotification } from "./components/notifications.js";
import { initializeSidebar } from "./components/sidebar.js";
import { initializeTheme } from "./core/theme.js";
import { initializeNavigation } from "./core/navigation.js";

function initializeApp() {
  console.log("Initializing FlowForge...");

  try {
    initializeTheme(); 
    console.log("✅ Theme init called");
  } catch (err) {
    console.error("❌ Theme failed:", err);
  }

  try {
    initializeSidebar();
  } catch (err) {
    console.error("❌ Sidebar failed:", err);
  }

  try {
    initializeNavigation(showNotification);
  } catch (err) {
    console.error("❌ Navigation failed:", err);
  }
}

// DOM load hone ka wait karo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}