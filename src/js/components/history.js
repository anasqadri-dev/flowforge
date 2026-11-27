export class WorkflowHistoryManager {
  constructor(maxHistory = 50) {
    this._history = [];
    this._historyIndex = -1;
    this._locked = false;
    this._maxHistory = maxHistory;
  }

  push(editor) {
    if (this._locked || !editor) return;
    const snapshot = JSON.stringify(editor.export());
    if (this._history.length > 0 && this._history[this._historyIndex] === snapshot) return;
    this._history = this._history.slice(0, this._historyIndex + 1);
    this._history.push(snapshot);
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
    this._historyIndex = this._history.length - 1;
  }

  undo(editor) {
    if (this._historyIndex <= 0) return false;
    this._historyIndex--;
    this._restore(editor);
    return true;
  }

  redo(editor) {
    if (this._historyIndex >= this._history.length - 1) return false;
    this._historyIndex++;
    this._restore(editor);
    return true;
  }

  _restore(editor) {
    this._locked = true;
    try {
      const data = JSON.parse(this._history[this._historyIndex]);
      editor.import(data);
    } finally {
      this._locked = false;
    }
  }

  bindKeyboard(editor) {
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea, select')) return;
      const isCtrl = e.ctrlKey || e.metaKey;
      if (!isCtrl) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo(editor);
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        this.redo(editor);
      }
    });
  }
}