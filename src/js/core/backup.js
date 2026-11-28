import { getWorkflows, getRuns, getSetting, saveWorkflow, saveRun, saveSetting, deleteWorkflow, clearRuns } from './database.js';

const BACKUP_VERSION = 1;
const SETTINGS_KEYS = ['theme', 'preferences', 'globalVariables', 'environmentProfiles', 'workflowVersions', 'schedules'];

function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function createApplicationBackup() {
    const [workflows, runs] = await Promise.all([getWorkflows(), getRuns()]);
    const settings = {};
    for (const key of SETTINGS_KEYS) {
        const value = await getSetting(key);
        if (value !== undefined) settings[key] = value;
    }
    return {
        application: 'FlowForge',
        backupVersion: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        contents: {
            workflows,
            runs,
            settings
        }
    };
}

export async function downloadApplicationBackup() {
    const backup = await createApplicationBackup();
    const date = new Date().toISOString().replace(/[:.]/g, '-');
    downloadJSON(backup, `flowforge-backup-${date}.json`);
    return {
        workflowCount: backup.contents.workflows.length,
        runCount: backup.contents.runs.length,
        settingsCount: Object.keys(backup.contents.settings).length
    };
}

function validateBackup(data) {
    if (!data || data.application !== 'FlowForge' || data.backupVersion !== BACKUP_VERSION ||
        !data.contents || !Array.isArray(data.contents.workflows) ||
        !Array.isArray(data.contents.runs) || !data.contents.settings ||
        typeof data.contents.settings !== 'object' || Array.isArray(data.contents.settings)) {
        throw new Error('This file is not a supported FlowForge application backup.');
    }
    const workflowIds = new Set();
    for (const workflow of data.contents.workflows) {
        if (!workflow || typeof workflow.id !== 'string' ||
            !Array.isArray(workflow.nodes) || !Array.isArray(workflow.connections) ||
            workflowIds.has(workflow.id)) {
            throw new Error('The backup contains an invalid or duplicate workflow record.');
        }
        workflowIds.add(workflow.id);
    }
    const runIds = new Set();
    for (const run of data.contents.runs) {
        if (!run || typeof run.id !== 'string' || !Array.isArray(run.steps) || runIds.has(run.id)) {
            throw new Error('The backup contains an invalid or duplicate execution record.');
        }
        runIds.add(run.id);
    }
    return data;
}

export async function restoreApplicationBackup(file) {
    if (!file || file.size > 25 * 1024 * 1024) {
        throw new Error('Choose a backup file smaller than 25 MB.');
    }
    const backup = validateBackup(JSON.parse(await file.text()));
    const { workflows, runs, settings } = backup.contents;
    const summary = [
        `Workflows: ${workflows.length}`,
        `Execution records: ${runs.length}`,
        `Settings groups: ${Object.keys(settings).length}`
    ].join('\n');
    if (!window.confirm(`Restore this FlowForge backup?\n\n${summary}\n\nCurrent workflows and execution history will be replaced. Built-in and custom templates are not part of this backup and will not be changed.`)) {
        return { cancelled: true };
    }

    // Create a safety copy before replacing the current browser data.
    const safetyBackup = await createApplicationBackup();
    downloadJSON(safetyBackup, `flowforge-before-restore-${Date.now()}.json`);

    const current = await getWorkflows();
    for (const workflow of current) await deleteWorkflow(workflow.id);
    await clearRuns();
    for (const workflow of workflows) await saveWorkflow(workflow);
    for (const run of runs) await saveRun(run);
    for (const [key, value] of Object.entries(settings)) {
        if (SETTINGS_KEYS.includes(key)) await saveSetting(key, value);
    }

    const active = workflows[0]?.id || '';
    try {
        if (active) localStorage.setItem('flowforge-active-workflow', active);
        else localStorage.removeItem('flowforge-active-workflow');
    } catch { /* IndexedDB remains authoritative if Local Storage is disabled. */ }

    document.dispatchEvent(new CustomEvent('flowforge:application-restored', {
        detail: { workflowCount: workflows.length, runCount: runs.length }
    }));
    return { cancelled: false, workflowCount: workflows.length, runCount: runs.length };
}
