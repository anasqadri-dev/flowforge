const lessons = [
 ['Create your first workflow','Open Builder, drag Manual Start onto the canvas, add an action, and connect the nodes.'],
 ['Configure nodes','Double-click a node to open its settings. Use {{variableName}} to reference values from earlier steps.'],
 ['Run and inspect','Run the workflow and watch the live execution panel. Pause, step, resume, or cancel execution with the debugger.'],
 ['Work with files','Choose an input file in Builder, use Read File or CSV Parse, then use Create File or CSV Generate to prepare output.'],
 ['Protect your data','Open Settings and download a complete application backup. Restore only a validated backup after reviewing its contents.'],
 ['Reuse and schedule','Duplicate workflows, use sub-workflow nodes, save versions, and schedule local runs while the app remains open.']
];
export function renderTutorials() {
 const done = JSON.parse(localStorage.getItem('flowforge-tutorial-progress') || '[]');
 return '<section class="page-container tutorials-page"><div class="page-heading"><div><h1>Guided Tutorials</h1><p>Learn FlowForge with short, practical lessons.</p></div><span class="run-status success">' + done.length + ' / ' + lessons.length + ' completed</span></div><div class="tutorial-list">' +
 lessons.map((lesson,index) => '<article class="settings-card tutorial-card"><label><input type="checkbox" data-lesson="' + index + '" ' + (done.includes(index) ? 'checked' : '') + '> <strong>' + (index+1) + '. ' + lesson[0] + '</strong></label><p>' + lesson[1] + '</p></article>').join('') +
 '</div><a class="btn-primary" href="#builder">Start building</a></section>';
}
export function initTutorials(container) {
 container.querySelectorAll('[data-lesson]').forEach(input => input.addEventListener('change', () => {
  const progress = [...container.querySelectorAll('[data-lesson]:checked')].map(item => Number(item.dataset.lesson));
  localStorage.setItem('flowforge-tutorial-progress', JSON.stringify(progress));
  const badge = container.querySelector('.run-status'); if (badge) badge.textContent = progress.length + ' / ' + lessons.length + ' completed';
 }));
}
