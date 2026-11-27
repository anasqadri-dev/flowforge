const DB_NAME = 'flowforge-db';
const DB_VERSION = 1;

let databasePromise;

export function openDatabase() {
    if (databasePromise) return databasePromise;

    if (!('indexedDB' in window)) {
        return Promise.reject(new Error('IndexedDB is not supported by this browser.'));
    }

    databasePromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;

            for (const storeName of ['workflows', 'runs', 'settings']) {
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, {
                        keyPath: storeName === 'settings' ? 'key' : 'id'
                    });
                }
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
            reject(request.error || new Error('Unable to open the application database.'));
        };

        request.onblocked = () => {
            console.warn('The FlowForge database upgrade is blocked by another open tab.');
        };
    });

    return databasePromise;
}

function requestResult(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Database request failed.'));
    });
}

async function executeStore(storeName, mode, operation) {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        let transaction;
        let result;
        let operationError = null;

        try {
            transaction = db.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);

            transaction.oncomplete = () => resolve(result);
            transaction.onerror = () => reject(
                transaction.error || operationError || new Error('Database transaction failed.')
            );
            transaction.onabort = () => reject(
                transaction.error || operationError || new Error('Database transaction was aborted.')
            );

            Promise.resolve(operation(store)).then(value => {
                result = value;
            }).catch(error => {
                operationError = error;
                try { transaction.abort(); } catch { reject(error); }
            });
        } catch (error) {
            reject(error);
        }
    });
}

export async function saveRun(run) {
    return executeStore('runs', 'readwrite', store => requestResult(store.put(run)));
}

export async function getRuns() {
    const runs = await executeStore('runs', 'readonly', store => requestResult(store.getAll()));
    return runs.sort((a, b) => Number(b.startedAt) - Number(a.startedAt));
}

export async function getRun(id) {
    return executeStore('runs', 'readonly', store => requestResult(store.get(id)));
}

export async function deleteRun(id) {
    return executeStore('runs', 'readwrite', store => requestResult(store.delete(id)));
}

export async function clearRuns() {
    return executeStore('runs', 'readwrite', store => requestResult(store.clear()));
}

export async function saveWorkflow(workflow) {
    const record = { ...workflow, updatedAt: Date.now() };
    return executeStore('workflows', 'readwrite', store => requestResult(store.put(record)));
}

export async function getWorkflow(id) {
    return executeStore('workflows', 'readonly', store => requestResult(store.get(id)));
}

export async function getWorkflows() {
    const workflows = await executeStore('workflows', 'readonly', store => requestResult(store.getAll()));
    return workflows.sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt));
}

export async function deleteWorkflow(id) {
    return executeStore('workflows', 'readwrite', store => requestResult(store.delete(id)));
}

export async function clearWorkflows() {
    return executeStore('workflows', 'readwrite', store => requestResult(store.clear()));
}

export async function saveSetting(key, value) {
    return executeStore('settings', 'readwrite', store => requestResult(store.put({ key, value })));
}

export async function getSetting(key) {
    const result = await executeStore('settings', 'readonly', store => requestResult(store.get(key)));
    return result?.value;
}

export async function clearCustomData() {
    return executeStore(['workflows', 'runs'], 'readwrite', stores => {
        const workflowStore = Array.isArray(stores) ? stores[0] : null;
        return workflowStore;
    });
}
