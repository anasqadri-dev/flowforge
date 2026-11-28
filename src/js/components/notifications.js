const notificationElement = document.getElementById("notification");
let notificationTimeout = null;

export function showNotification(message, duration = 3000) {
    if (!notificationElement) {
        console.error("Notification element was not found.");
        return;
    }

    notificationElement.textContent = message;
    notificationElement.classList.add("show");

    clearTimeout(notificationTimeout);

    notificationTimeout = setTimeout(() => {
        notificationElement.classList.remove("show");
        notificationTimeout = null;
    }, duration);
}

// The template validator imports this module in Node.js with a minimal DOM stub.
// Register the browser event listener only when the DOM API is available.
if (typeof document.addEventListener === "function") {
    document.addEventListener("flowforge:notify", event => {
        const message = event.detail?.message;
        if (typeof message === "string" && message.trim()) showNotification(message, 5000);
    });
}
