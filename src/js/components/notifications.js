let notificationTimeout = null;
let notificationQueue = [];
let notificationVisible = false;

function displayNextNotification() {
    const element = document.getElementById('notification');
    if (!element || notificationVisible || !notificationQueue.length) return;

    const item = notificationQueue.shift();
    notificationVisible = true;
    element.textContent = item.message;
    element.classList.add('show');
    element.setAttribute('role', 'status');
    element.setAttribute('aria-live', 'polite');

    clearTimeout(notificationTimeout);
    notificationTimeout = setTimeout(() => {
        element.classList.remove('show');
        notificationTimeout = null;
        notificationVisible = false;
        displayNextNotification();
    }, item.duration);
}

export function showNotification(message, duration = 3500) {
    const text = String(message ?? '').trim();
    if (!text) return;
    notificationQueue.push({ message: text, duration: Math.max(1500, Number(duration) || 3500) });
    displayNextNotification();
}

function displayWorkflowNotifications(event) {
    const messages = (event.detail?.steps || [])
        .filter(step => step.type === 'Send Notification' && step.status === 'success')
        .map(step => step.output?.message)
        .filter(message => typeof message === 'string' && message.trim());

    messages.forEach(message => showNotification(message, 6000));
}

// The app-level toast is deliberately shown after execution completes. This
// prevents the Run button's completion summary from immediately replacing it.
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('flowforge:workflow-completed', displayWorkflowNotifications);
}
