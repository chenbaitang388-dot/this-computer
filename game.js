import { mountDesktop } from './desktop.js';
import { createVfs } from './vfs.js';
import { seed, records, createStory } from './story.js';

const saveKey = 'this-computer.save.v1';
const root = document.querySelector('#desktop');
const startup = document.querySelector('#startup');
const boot = document.querySelector('#boot');
const restart = document.querySelector('#restart');
const startupError = document.querySelector('#startup-error');
let desktop;
let vfs;
let story;
let online;
let shownHidden;
let clipboard;
let lastRestored;
const views = new Map();

function readSave() {
  try {
    const data = JSON.parse(localStorage.getItem(saveKey));
    return data?.version === 1 ? data : null;
  } catch {
    return null;
  }
}

function save() {
  try {
    localStorage.setItem(saveKey, JSON.stringify({
      version: 1, files: vfs.serialize(), story: story.serialize(), online, shownHidden, lastRestored,
    }));
    return true;
  } catch {
    desktop?.notify('无法写入本地存档，请保持此窗口开启。');
    return false;
  }
}

async function fullscreen() {
  if (document.fullscreenElement) return;
  try {
    await document.documentElement.requestFullscreen();
  } catch {
    desktop?.notify('浏览器未进入全屏，可在开始菜单中重试。');
  }
}

function sound() {
  if (!audio || audio.state !== 'running') return;
  const tone = audio.createOscillator();
  const level = audio.createGain();
  tone.type = 'sine';
  tone.frequency.setValueAtTime(480, audio.currentTime);
  tone.frequency.setValueAtTime(370, audio.currentTime + .09);
  level.gain.setValueAtTime(.035, audio.currentTime);
  level.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .22);
  tone.connect(level).connect(audio.destination);
  tone.start();
  tone.stop(audio.currentTime + .23);
}

function react(event) {
  const message = story.dispatch(event);
  save();
  updateProgress();
  if (message?.title && message?.text) {
    sound();
    desktop.dialog(message);
  }
}

function element(tag, value, className) {
  const node = document.createElement(tag);
  if (value != null) node.textContent = value;
  if (className) node.className = className;
  return node;
}

function button(label, handler, id) {
  const node = element('button', label);
  node.type = 'button';
  if (id) node.id = id;
  node.addEventListener('click', handler);
  return node;
}

function table(host, headings) {
  const grid = element('table', null, 'game-list');
  const header = grid.createTHead().insertRow();
  for (const heading of headings) header.append(element('th', heading));
  host.append(grid);
  return grid.createTBody();
}

function alert(title, text, buttons) {
  desktop.dialog({ title, text, buttons });
}

function operate(action) {
  try {
    action();
    save();
    refresh(['explorer', 'trash']);
  } catch (error) {
    alert('文件操作', error.message);
  }
}

function properties(id) {
  const file = vfs.get(id);
  alert(file.name + ' 属性', [
    '位置  ' + vfs.path(id),
    '类型  ' + (file.kind === 'dir' ? '文件夹' : '文件'),
    '创建时间  ' + (file.created || '—'),
    '修改时间  ' + (file.modified || '—'),
    '属性  ' + (file.hidden ? '隐藏' : '普通'),
  ].join('\n'));
}

let menu;
function closeMenu() {
  menu?.remove();
  menu = null;
}
function context(event, actions) {
  event.preventDefault();
  event.stopPropagation();
  closeMenu();
  menu = element('div', null, 'game-menu');
  menu.setAttribute('role', 'menu');
  for (const [label, action] of actions) menu.append(button(label, () => {
    closeMenu();
    action();
  }));
  root.append(menu);
  menu.style.left = Math.max(0, Math.min(event.clientX, innerWidth - menu.offsetWidth)) + 'px';
  menu.style.top = Math.max(0, Math.min(event.clientY, innerHeight - menu.offsetHeight)) + 'px';
  menu.firstElementChild?.focus();
}
document.addEventListener('pointerdown', event => {
  if (!menu?.contains(event.target)) closeMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeMenu();
});

function openFile(id) {
  const file = vfs.get(id);
  if (!file) return;
  if (file.kind === 'dir') return desktop.open('explorer', { id, title: file.name });
  react({ type: 'file-open', id });
  desktop.open('notepad', { id, title: file.name + ' — 记事本' });
}

function fileMenu(event, file, parent) {
  const actions = [['打开', () => openFile(file.id)], ['属性', () => properties(file.id)]];
  if (file.parent != null) {
    actions.splice(1, 0,
      ['复制', () => { clipboard = { id: file.id, method: 'copy' }; }],
      ['剪切', () => { clipboard = { id: file.id, method: 'move' }; }],
      ['重命名', () => renameFile(file)],
      ['删除', () => operate(() => vfs.remove(file.id))]);
  }
  if (parent && clipboard) actions.push(['粘贴', () => paste(parent)]);
  context(event, actions);
}

function renameFile(file) {
  const view = [...views.values()].find(candidate => candidate.app === 'explorer' &&
    candidate.container.querySelector('[data-file-id="' + CSS.escape(file.id) + '"]')?.getClientRects().length);
  const row = view?.container.querySelector('[data-file-id="' + CSS.escape(file.id) + '"]');
  const label = row?.querySelector('.game-name');
  if (!label) return;
  const input = element('input');
  input.setAttribute('aria-label', '新文件名');
  input.value = file.name;
  label.replaceWith(input);
  input.focus();
  input.select();
  input.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.key === 'Enter') operate(() => vfs.rename(file.id, input.value));
    if (event.key === 'Escape') input.replaceWith(label);
  });
  input.addEventListener('blur', () => input.replaceWith(label), { once: true });
}

function paste(parent) {
  if (!clipboard) return;
  operate(() => {
    vfs[clipboard.method](clipboard.id, parent);
    if (clipboard.method === 'move') clipboard = null;
  });
}

function explorer(payload, host) {
  const id = payload?.id;
  const folder = id ? vfs.get(id) : null;
  const toolbar = element('div', null, 'game-toolbar');
  const toggle = () => { shownHidden = !shownHidden; save(); refresh(['explorer']); };
  toolbar.append(
    button('向上', () => {
      const parent = folder?.parent ? vfs.get(folder.parent) : null;
      desktop.open('explorer', parent ? { id: parent.id, title: parent.name } : { id: null, title: '此电脑' });
    }),
    button('刷新', () => refresh(['explorer'])),
    button(shownHidden ? '隐藏隐藏项目' : '显示隐藏项目', toggle),
  );
  if (folder) toolbar.append(button('粘贴', () => paste(id)));
  host.append(toolbar, element('div', folder ? vfs.path(id) : '此电脑', 'game-path'));
  host.addEventListener('contextmenu', event => {
    const actions = [['刷新', () => refresh(['explorer'])], [shownHidden ? '隐藏隐藏项目' : '显示隐藏项目', toggle]];
    if (folder && clipboard) actions.push(['粘贴', () => paste(id)]);
    context(event, actions);
  });
  const rows = table(host, ['名称', '类型', '修改时间']);
  let files;
  try {
    files = id ? vfs.list(id, { showHidden: shownHidden }) : ['c', 'd'].map(vfs.get).filter(Boolean);
  } catch (error) {
    host.append(element('p', error.message));
    return;
  }
  for (const file of files) {
    const row = rows.insertRow();
    row.dataset.fileId = file.id;
    const name = button(file.name, event => {
      if (event.detail === 0) openFile(file.id);
    });
    name.className = 'game-name';
    row.insertCell().append(name);
    row.insertCell().textContent = file.parent === null ? '本地磁盘' : file.kind === 'dir' ? '文件夹' : '文档';
    row.insertCell().textContent = file.modified || '—';
    row.addEventListener('dblclick', () => openFile(file.id));
    row.addEventListener('contextmenu', event => fileMenu(event, file, id));
    row.addEventListener('keydown', event => {
      if (event.key === 'Delete' && file.parent) operate(() => vfs.remove(file.id));
      if (event.key === 'F2' && file.parent) renameFile(file);
    });
  }
  if (!files.length) host.append(element('p', '此文件夹为空。'));
}

function trash(host) {
  const rows = table(host, ['名称', '原位置', '操作']);
  const files = vfs.trashList();
  for (const file of files) {
    const row = rows.insertRow();
    row.insertCell().textContent = file.name;
    row.insertCell().textContent = vfs.path(file.parent);
    const restore = () => operate(() => {
      vfs.restore(file.id);
      lastRestored = file.id;
      react({ type: 'restore', id: file.id });
    });
    const restoreButton = button('还原', restore);
    restoreButton.dataset.restoreId = file.id;
    row.insertCell().append(restoreButton);
    row.addEventListener('contextmenu', event => context(event, [['还原', restore], ['属性', () => properties(file.id)]]));
  }
  if (!files.length) host.append(element('p', '回收站为空。'));
  const restored = lastRestored && vfs.get(lastRestored);
  if (restored && !restored.trash) {
    const link = button('打开刚还原的文件 · ' + restored.name, () => openFile(restored.id));
    link.dataset.openRestored = restored.id;
    host.append(link);
  }
  const archive = vfs.get('handover-current');
  if (archive?.trash) {
    host.append(button('打开交接工作区', () => desktop.open('handover')));
  }
}

function notepad(payload, host) {
  const file = vfs.get(payload?.id);
  const note = element('textarea', null, 'game-note');
  note.readOnly = true;
  note.spellcheck = false;
  note.setAttribute('aria-label', file?.name || '记事本正文');
  note.value = String(file?.content ?? '');
  host.append(element('div', file ? vfs.path(file.id) : '无标题', 'game-path'), note);
}

function eventViewer(host) {
  const details = element('pre', '选择一条记录查看详细信息。', 'game-note game-log');
  details.setAttribute('aria-live', 'polite');
  const rows = table(host, ['事件编号', '时间', '来源']);
  for (const record of records) {
    const row = rows.insertRow();
    const entry = button(record.id, () => {
      details.textContent = record.text;
      react({ type: 'record-open', id: record.id });
    });
    entry.className = 'game-name';
    entry.dataset.recordId = record.id;
    row.insertCell().append(entry);
    row.insertCell().textContent = record.time;
    row.insertCell().textContent = record.source;
  }
  host.append(details);
}

function network(host) {
  host.append(element('h2', '本地连接'), element('p', online ? '状态：已连接' : '状态：已断开'));
  host.append(button(online ? '断开连接' : '重新连接', () => {
    online = !online;
    refresh(['network']);
    react({ type: 'network', online });
  }, 'network-toggle'));
}

function handover(host) {
  const status = story.status();
  host.append(element('h2', '撤场交接 · 工作站 04'));
  if (status.complete) {
    const result = element('p', '第一份证据已提交。交接记录已封存。序章结束。', 'game-success');
    result.id = 'evidence-result';
    const receipt = story.submit({});
    host.append(result, element('pre', receipt.text, 'game-receipt'), button('关机', power));
    return;
  }
  const progress = element('ul');
  progress.className = 'evidence-progress';
  const evidence = [
    ['current', '查阅当前交接记录'],
    ['old', '还原并阅读交接记录旧版'],
    ['record', '查看旧版指向的系统事件'],
    ['offline', '断开本地连接，验证警告来源'],
  ];
  for (const [key, label] of evidence) {
    const entry = element('li', (status[key] ? '✓ ' : '○ ') + label);
    entry.dataset.evidenceKey = key;
    entry.dataset.label = label;
    progress.append(entry);
  }
  host.append(progress);
  const form = element('form', null, 'game-form');
  const recordLabel = element('label', '事件编号');
  const record = element('input');
  record.id = 'evidence-record';
  record.autocomplete = 'off';
  record.required = true;
  record.inputMode = 'numeric';
  recordLabel.append(record);
  const conclusionLabel = element('label', '警告的来源');
  const conclusion = element('select');
  conclusion.id = 'evidence-conclusion';
  conclusion.required = true;
  for (const [value, label] of [
    ['', '选择一项'], ['remote', '远程操作员'],
    ['local-recovery', '本机恢复服务'], ['corruption', '交接文档自身'],
  ]) {
    const option = element('option', label);
    option.value = value;
    conclusion.append(option);
  }
  conclusionLabel.append(conclusion);
  const submit = element('button', '提交证据');
  submit.id = 'evidence-submit';
  const result = element('p', '', 'game-error');
  result.id = 'evidence-result';
  result.setAttribute('role', 'status');
  form.append(recordLabel, conclusionLabel, submit, result);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const response = story.submit({ record: record.value.trim(), conclusion: conclusion.value });
    if (response.ok) {
      save();
      refresh(['handover']);
      sound();
    } else {
      result.textContent = response.text;
    }
  });
  host.append(form);
}

function updateProgress() {
  const status = story.status();
  for (const entry of root.querySelectorAll('[data-evidence-key]')) {
    entry.textContent = (status[entry.dataset.evidenceKey] ? '✓ ' : '○ ') + entry.dataset.label;
  }
}

const apps = {
  explorer, notepad,
  trash: (_, host) => trash(host),
  events: (_, host) => eventViewer(host),
  network: (_, host) => network(host),
  handover: (_, host) => handover(host),
};

function render(app, payload, container) {
  views.set(container, { app, payload, container });
  const host = element('section', null, 'game-app');
  container.replaceChildren(host);
  apps[app]?.(payload, host);
}

function refresh(appNames) {
  for (const [container, view] of views) {
    if (!container.isConnected) views.delete(container);
    else if (appNames.includes(view.app)) render(view.app, view.payload, container);
  }
}

function power() {
  const message = story.dispatch({ type: 'power' });
  const label = story.status().complete ? '关机' : '保存并退出';
  alert('关闭计算机', message.text, [
    { label, action: () => {
      if (!save()) return;
      closeMenu();
      root.hidden = true;
      startup.hidden = false;
      syncStartup();
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      boot.focus();
    }},
    { label: '取消', action: () => {} },
  ]);
}

function syncStartup() {
  const hasSave = Boolean(readSave());
  boot.textContent = hasSave ? '继续交接' : '开机';
  restart.hidden = !hasSave;
}

let audio;
boot.addEventListener('click', () => {
  void fullscreen();
  try {
    if (!audio && window.AudioContext) audio = new AudioContext();
    if (audio?.state === 'suspended') void audio.resume().catch(() => {});
    if (!desktop) {
      const saved = readSave();
      vfs = createVfs(seed, saved?.files);
      story = createStory(saved?.story);
      online = saved?.online ?? true;
      shownHidden = saved?.shownHidden ?? false;
      lastRestored = saved?.lastRestored;
      root.hidden = false;
      desktop = mountDesktop(root, {
        renderApp: render,
        onOpen: () => {},
        onPower: power,
        onFullscreen: fullscreen,
      });
      save();
    }
    root.hidden = false;
    startup.hidden = true;
  } catch (error) {
    root.hidden = true;
    startupError.textContent = '工作站无法启动：' + error.message;
    console.error(error);
  }
});
restart.addEventListener('click', () => {
  if (!window.confirm('清除本机的交接进度并重新开始？')) return;
  localStorage.removeItem(saveKey);
  location.reload();
});
syncStartup();
