import { initializePersistence } from './core/persistence.js';
import { saveRun } from './core/database.js';
import { showNotification } from './components/notifications.js';
import { initializeSidebar } from './components/sidebar.js';
import { initializeTheme } from './core/theme.js';
import { initializeNavigation } from './core/navigation.js';
import { state, initializeHistory } from './core/state.js';
import { startLocalScheduler } from './core/advanced.js';

function initializeApp() {
    console.info('Initializing FlowForge.');
    initializeHistory();

    initializeTheme().catch(error => console.error('Theme initialization failed:', error));

    try {
        initializeSidebar();
        initializePersistence(showNotification);
        initializeNavigation(showNotification);
        startLocalScheduler();
    } catch (error) {
        console.error('Application initialization failed:', error);
        showNotification('FlowForge could not initialize correctly.');
    }

    document.addEventListener('flowforge:workflow-completed', async event => {
        try {
            const run = {
                ...event.detail,
                workflowId: event.detail.workflowId ?? state.workflowId,
                workflowName: event.detail.workflowName || state.workflowName || 'Untitled Workflow'
            };
            await saveRun(run);
            document.dispatchEvent(new CustomEvent('flowforge:run-saved', { detail: run }));
        } catch (error) {
            console.error('Failed to save run history:', error);
            showNotification('The workflow ran, but its history could not be saved.');
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp, { once: true });
} else {
    initializeApp();
}