const STORAGE_KEY = 'flowforge_workflow';

export function saveToLocal(editor) {
  try {
    const data = editor.export();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Save failed:', e);
    return false;
  }
}

export function loadFromLocal(editor) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !data.drawflow) {
      console.warn('Invalid saved data, skipping');
      return false;
    }
    editor.import(data);
    return true;
  } catch (e) {
    console.error('Load failed:', e);
    return false;
  }
}