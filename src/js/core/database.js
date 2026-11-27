
const DB_NAME = 'flowforge-db';
const DB_VERSION = 1;

let databasePromise;

export function openDatabase() {
    if (databasePromise) return databasePromise;

    databasePromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;

            if (!db.objectStoreNames.contains('workflows')) {
                db.createObjectStore('workflows', {
                    keyPath: 'id'
                });
            }

            if (!db.objectStoreNames.contains('runs')) {
                db.createObjectStore('runs', {
                    keyPath: 'id'
                });
            }

            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', {
                    keyPath: 'key'
                });
            }
        };

        request.onsuccess = () => {
            const db = request.result;

            db.onversionchange = () => {
                db.close();
                databasePromise = null;
            };

            resolve(db);
        };

        request.onerror = () => {
            databasePromise = null;
            reject(request.error);
        };
    });

    return databasePromise;
}

async function executeStore(storeName, mode, operation) {
    const db = await openDatabase();
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);

    const result = await operation(store);

    return result;
}

function requestResult(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ===============================
// RUN HISTORY - M6
// ===============================

export async function saveRun(run) {
    return executeStore('runs', 'readwrite', store =>
        requestResult(store.put(run))
    );
}

export async function getRuns() {
    const runs = await executeStore('runs', 'readonly', store =>
        requestResult(store.getAll())
    );

    return runs.sort((a, b) => b.startedAt - a.startedAt);
}

export async function getRun(id) {
    return executeStore('runs', 'readonly', store =>
        requestResult(store.get(id))
    );
}

export async function deleteRun(id) {
    return executeStore('runs', 'readwrite', store =>
        requestResult(store.delete(id))
    );
}

export async function clearRuns() {
    return executeStore('runs', 'readwrite', store =>
        requestResult(store.clear())
    );
}

// ===============================
// WORKFLOW STORAGE - M7
// ===============================

export async function saveWorkflow(workflow) {
    const record = {
        ...workflow,
        updatedAt: Date.now()
    };

    return executeStore('workflows', 'readwrite', store =>
        requestResult(store.put(record))
    );
}

export async function getWorkflow(id) {
    return executeStore('workflows', 'readonly', store =>
        requestResult(store.get(id))
    );
}

export async function getWorkflows() {
    const workflows = await executeStore(
        'workflows',
        'readonly',
        store => requestResult(store.getAll())
    );

    return workflows.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteWorkflow(id) {
    return executeStore('workflows', 'readwrite', store =>
        requestResult(store.delete(id))
    );
}

// ===============================
// APPLICATION SETTINGS - M8
// ===============================

export async function saveSetting(key, value) {
    return executeStore('settings', 'readwrite', store =>
        requestResult(store.put({ key, value }))
    );
}

export async function getSetting(key) {
    const result = await executeStore(
        'settings',
        'readonly',
        store => requestResult(store.get(key))
    );

    return result?.value;
}
