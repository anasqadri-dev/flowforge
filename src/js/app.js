const themeToggle = document.getElementById("theme-toggle");
const notification = document.getElementById("notification");

function initializeTheme() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.body.classList.add("dark");
    }
}

function toggleTheme() {
    document.body.classList.toggle("dark");
    const currentTheme = document.body.classList.contains("dark") ? "dark" : "light";
    localStorage.setItem("theme", currentTheme);
    showNotification("Theme changed successfully.");
}

let notificationTimeout;

function showNotification(message) {
    notification.textContent = message;
    notification.style.display = "block";
    clearTimeout(notificationTimeout);
    notificationTimeout = setTimeout(() => {
      notification.style.display = "none";
    }, 3000);
}

function initializeNavigation() {
    const upcomingLinks = document.querySelectorAll("[data-coming-soon]");
    upcomingLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        showNotification("This module is coming soon!");
      });
    });
}

function initializeApp() {
    initializeTheme();
    initializeNavigation();
    themeToggle.addEventListener("click", toggleTheme);
    console.log("FlowForge application initialized.");
}

document.addEventListener("DOMContentLoaded", initializeApp);