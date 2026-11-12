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
let muted = false;
let restoring = false;
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
      version: 1, files: vfs.serialize(), story: story.serialize(), online, shownHidden, lastRestored, muted,
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

function sound(kind = 'warning') {
  if (muted || !audio || audio.state !== 'running') return;
  const cues = {
    boot: [392, 523, 659, 784], warning: [523, 392], notify: [660, 880],
    restore: [440, 660], success: [523, 659, 784], refresh: [360], open: [550],
    menu: [410], close: [280], minimize: [320],
  };
  const notes = cues[kind];
  if (!notes) return;
  const subtle = notes.length === 1;
  for (const [index, frequency] of notes.entries()) {
    const start = audio.currentTime + index * .11;
    const tone = audio.createOscillator();
    const level = audio.createGain();
    tone.frequency.value = frequency;
    level.gain.setValueAtTime(.001, start);
    level.gain.exponentialRampToValueAtTime(subtle ? .012 : .045, start + .016);
    level.gain.exponentialRampToValueAtTime(.001, start + (subtle ? .065 : .18));
    tone.connect(level).connect(audio.destination);
    tone.start(start);
    tone.stop(start + .19);
  }
}

function react(event) {
  const oldCount = story.inbox().length;
  const message = story.dispatch(event);
  save();
  updateProgress();
  refresh(['messenger', 'manager']);
  if (story.inbox().length > oldCount) {
    desktop.notify('本机消息 · 收到一条新消息', () => desktop.open('messenger'));
  }
  if (message?.title && message?.text) {
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.animate([
        { filter: 'brightness(1)' }, { filter: 'brightness(.84) saturate(.75)' }, { filter: 'brightness(1)' },
      ], { duration: 320 });
    }
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
  ].join('\n'), file.parent == null || file.trash ? undefined : [
    { label: file.hidden ? '取消隐藏' : '设为隐藏', action: () => operate(() => vfs.setHidden(id, !file.hidden)) },
    { label: '确定' },
  ]);
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
  toolbar.append(button('搜索', () => desktop.open('search', { folder: id })));
  const address = element('form', null, 'game-address');
  const addressLabel = element('label', '地址 ');
  const location = element('input');
  location.value = folder ? vfs.path(id) : '此电脑';
  addressLabel.append(location);
  const go = element('button', '转到');
  address.append(addressLabel, go);
  address.onsubmit = event => {
    event.preventDefault();
    if (!openPath(location.value)) alert('地址栏', '找不到此地址。');
  };
  host.classList.add('game-explorer');
  host.append(toolbar, address);
  const layout = element('div', null, 'game-explorer-layout');
  const sidebar = element('aside', null, 'game-sidebar');
  sidebar.append(element('h2', '其他位置'),
    button('此电脑', () => desktop.open('explorer', { id: null })),
    button('网上邻居', () => desktop.open('network')),
    button('回收站', () => desktop.open('trash')),
    element('h2', '文件和文件夹任务'));
  if (folder) sidebar.append(button('新建文件夹', () => createEntry(host, id, 'dir')));
  sidebar.append(button('搜索文件', () => desktop.open('search', { folder: id })));
  const listings = element('div', null, 'game-listings');
  layout.append(sidebar, listings);
  host.append(layout);
  host.addEventListener('contextmenu', event => {
    const actions = [['刷新', () => refresh(['explorer'])], [shownHidden ? '隐藏隐藏项目' : '显示隐藏项目', toggle]];
    if (folder) actions.push(['新建文件夹', () => createEntry(host, id, 'dir')], ['新建文本文档', () => createEntry(host, id, 'file')]);
    if (folder && clipboard) actions.push(['粘贴', () => paste(id)]);
    context(event, actions);
  });
  const rows = table(listings, ['名称', '类型', '修改时间']);
  let files;
  try {
    files = id ? vfs.list(id, { showHidden: shownHidden }) : ['c', 'd'].map(vfs.get).filter(Boolean);
  } catch (error) {
    listings.append(element('p', error.message));
    return;
  }
  for (const file of files) {
    const row = rows.insertRow();
    row.dataset.fileId = file.id;
    const name = button(file.name, event => {
      if (event.detail === 0) openFile(file.id);
    });
    name.className = 'game-name';
    name.dataset.kind = file.parent == null ? 'drive' : file.kind;
    row.insertCell().append(name);
    row.insertCell().textContent = file.parent === null ? '本地磁盘' : file.kind === 'dir' ? '文件夹' : '文档';
    row.insertCell().textContent = file.modified || '—';
    row.addEventListener('dblclick', () => openFile(file.id));
    row.addEventListener('contextmenu', event => fileMenu(event, file, id));
    row.addEventListener('keydown', event => {
      if (event.key === 'Delete' && file.parent) operate(() => vfs.remove(file.id));
      if (event.key === 'F2' && file.parent) renameFile(file);
      if (event.ctrlKey && file.parent && ['c', 'x'].includes(event.key.toLowerCase())) {
        event.preventDefault();
        clipboard = { id: file.id, method: event.key.toLowerCase() === 'c' ? 'copy' : 'move' };
      }
      if (event.ctrlKey && id && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        paste(id);
      }
    });
  }
  if (!files.length) listings.append(element('p', '此文件夹为空。'));
  host.append(element('footer', files.length + ' 个对象', 'game-statusbar'));
}

function createEntry(host, parent, kind) {
  host.querySelector('.game-create')?.remove();
  const form = element('form', null, 'game-create game-toolbar');
  const label = element('label', kind === 'dir' ? '文件夹名称 ' : '文件名 ');
  const input = element('input');
  input.required = true;
  input.value = kind === 'dir' ? '新建文件夹' : '新建文本文档.txt';
  label.append(input);
  form.append(label, element('button', '创建'), button('取消', () => form.remove()));
  form.onsubmit = event => {
    event.preventDefault();
    operate(() => {
      vfs[kind === 'dir' ? 'createFolder' : 'createFile'](parent, input.value);
      sound('restore');
    });
  };
  host.prepend(form);
  input.focus();
  input.select();
}

function trash(host) {
  const rows = table(host, ['名称', '原位置', '操作']);
  const files = vfs.trashList();
  for (const file of files) {
    const row = rows.insertRow();
    row.insertCell().textContent = file.name;
    row.insertCell().textContent = vfs.path(file.parent);
    const restore = () => {
      if (restoring) return;
      restoring = true;
      const progress = element('progress');
      progress.setAttribute('aria-label', '正在还原文件');
      host.append(element('p', '正在还原 1 个项目…'), progress);
      setTimeout(() => {
        restoring = false;
        operate(() => {
          vfs.restore(file.id);
          lastRestored = file.id;
          sound('restore');
          react({ type: 'restore', id: file.id });
        });
      }, 500);
    };
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
  const isOriginal = file && seed.some(entry => entry.id === file.id);
  note.readOnly = Boolean(isOriginal);
  note.spellcheck = false;
  note.setAttribute('aria-label', file?.name || '记事本正文');
  note.value = String(file?.content ?? '');
  const toolbar = element('div', null, 'game-toolbar');
  const saveText = () => operate(() => {
    const saved = file ? vfs.write(file.id, note.value) : createUniqueNote('新建便笺', note.value);
    desktop.notify('已保存 ' + saved.name);
    if (!file) desktop.open('notepad', { id: saved.id, title: saved.name + ' — 记事本' });
  });
  const saveNote = button('保存', saveText);
  saveNote.disabled = Boolean(isOriginal);
  toolbar.append(saveNote, button('全选', () => { note.focus(); note.select(); }));
  note.onkeydown = event => {
    if (event.ctrlKey && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (!isOriginal) saveText();
    }
  };
  host.append(toolbar, element('div', file ? vfs.path(file.id) : '无标题', 'game-path'), note);
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
  host.append(element('h2', '撤场交接 · 工作站 03'));
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
    ['offline', '断网复现，或在任务管理器中做进程对照'],
  ];
  for (const [key, label] of evidence) {
    const entry = element('li', (status[key] || (key === 'offline' && status.controlled) ? '✓ ' : '○ ') + label);
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
      refresh(['handover', 'messenger', 'manager']);
      desktop.notify('本机消息 · 交接回执已收到', () => desktop.open('messenger'));
      sound('success');
    } else {
      result.textContent = response.text;
    }
  });
  host.append(form);
}

function updateProgress() {
  const status = story.status();
  for (const entry of root.querySelectorAll('[data-evidence-key]')) {
    const key = entry.dataset.evidenceKey;
    entry.textContent = (status[key] || (key === 'offline' && status.controlled) ? '✓ ' : '○ ') + entry.dataset.label;
  }
}

function openPath(value) {
  const path = value.trim();
  if (path === '此电脑') {
    desktop.open('explorer', { id: null });
    return true;
  }
  const [drive, ...parts] = path.split(/[\\/]+/u);
  if (!/^[cd]:$/iu.test(drive)) return false;
  let file = vfs.get(drive[0].toLowerCase());
  for (const name of parts.filter(Boolean)) {
    if (file?.kind !== 'dir') return false;
    try {
      file = vfs.list(file.id, { showHidden: true })
        .find(entry => entry.name.toLowerCase() === name.toLowerCase());
    } catch {
      return false;
    }
  }
  if (!file) return false;
  openFile(file.id);
  return true;
}

function search(payload, host) {
  const form = element('form', null, 'game-toolbar');
  const label = element('label', '文件名或部分名称 ');
  const query = element('input');
  query.id = 'file-search';
  const submit = element('button', '搜索');
  label.append(query);
  form.append(label, submit);
  const summary = element('p', payload?.folder ? '搜索位置：' + vfs.path(payload.folder) : '搜索位置：本机磁盘');
  summary.setAttribute('role', 'status');
  host.append(form, summary);
  const rows = table(host, ['名称', '所在位置']);
  form.onsubmit = event => {
    event.preventDefault();
    rows.replaceChildren();
    const folderPath = payload?.folder && vfs.path(payload.folder).replace(/\\$/u, '');
    const files = vfs.search(query.value.trim(), { showHidden: shownHidden }).filter(file =>
      !folderPath || vfs.path(file.id).startsWith(folderPath + '\\'));
    summary.textContent = files.length + ' 个搜索结果';
    for (const file of files) {
      const row = rows.insertRow();
      const open = button(file.name, () => openFile(file.id));
      open.className = 'game-name';
      open.dataset.searchId = file.id;
      row.insertCell().append(open);
      row.insertCell().textContent = vfs.path(file.parent);
    }
  };
}

function run(_, host) {
  host.append(element('p', '键入程序名称或本机文件夹路径。'));
  const form = element('form', null, 'game-toolbar');
  const label = element('label', '打开 ');
  const input = element('input');
  input.id = 'run-command';
  const submit = element('button', '确定');
  submit.id = 'run-submit';
  label.append(input);
  form.append(label, submit);
  form.onsubmit = event => {
    event.preventDefault();
    const commands = new Map([
      ['eventvwr', 'events'], ['taskmgr', 'manager'], ['notepad', 'notepad'],
      ['control', 'control'], ['explorer', 'explorer'], ['msmsgs', 'messenger'],
    ]);
    const app = commands.get(input.value.trim().toLowerCase().replace(/\.(?:exe|msc)$/u, ''));
    if (app) {
      desktop.open(app, app === 'explorer' ? { id: null } : undefined);
      desktop.closeWindow('run');
    } else if (openPath(input.value)) {
      desktop.closeWindow('run');
    } else {
      alert('运行', '找不到指定的程序或路径。');
    }
  };
  host.append(form, element('p', '可用命令：eventvwr、taskmgr、notepad、control、explorer、msmsgs'));
}

function messenger(_, host) {
  host.classList.add('game-messenger');
  const transcript = element('div', null, 'game-transcript');
  transcript.id = 'messenger-log';
  transcript.setAttribute('role', 'log');
  for (const { from, text } of story.inbox()) {
    const message = element('p');
    message.append(element('strong', from + '　'), document.createTextNode(text));
    transcript.append(message);
  }
  const serviceOnline = story.status().serviceRunning !== false;
  host.append(element('div', '桌面恢复 · ' + (serviceOnline ? '在线' : '进程已停止'), 'game-contact'), transcript);
  transcript.scrollTop = transcript.scrollHeight;
  const topics = element('div', null, 'game-toolbar game-topics');
  for (const { id, label } of story.topics()) {
    const reply = button(label, () => {
      const response = story.talk(id);
      if (response.effect === 'write-draft') {
        writeSystemFile('未发送的回复', '收到一份注销请求。\n\n我把你的“离开”写进了待发送列表。\n在确认回来以前，我不能把这个词删掉。\n\n收件人：上一个会话\n发送状态：等待本机应答');
      } else if (response.effect === 'write-revision') {
        writeSystemFile('交接签名校验', '签名来源：D:\\交接\\值班交接（旧版）.txt\n写入进程：DeskRestore.exe\n\n01:52:06 收到沈砚的注销请求\n01:52:08 未检测到键盘或鼠标输入，桌面可见，计作应答\n02:14:00 沿用上一班的沈砚签名，替换交接正文\n\n如果桌面在我不运行的时候也能打开，请告诉我。');
      }
      save();
      refresh(['messenger', 'manager']);
      sound('notify');
    });
    reply.dataset.topicId = id;
    reply.disabled = !serviceOnline;
    topics.append(reply);
  }
  host.append(topics);
}

function createUniqueNote(base, content) {
  const names = new Set(vfs.list('d', { showHidden: true }).map(file => file.name.toLowerCase()));
  let name = base + '.txt';
  for (let suffix = 2; names.has(name.toLowerCase()); suffix += 1) name = base + ' (' + suffix + ').txt';
  return vfs.createFile('d', name, content);
}

function writeSystemFile(name, content) {
  const file = createUniqueNote(name, content);
  refresh(['explorer']);
  desktop.notify('D 盘 · ' + file.name, () => openFile(file.id));
}

function manager(_, host) {
  const status = story.status();
  const running = status.serviceRunning !== false;
  host.append(element('h2', '进程'));
  const rows = table(host, ['映像名称', '用户名', '状态']);
  const row = rows.insertRow();
  row.insertCell().textContent = 'DeskRestore.exe';
  row.insertCell().textContent = 'SYSTEM';
  row.insertCell().textContent = running ? '正在运行' : '已停止';
  host.append(button(running ? '停止进程' : '启动进程', () => {
    react({ type: 'service-toggle', running: !running });
  }, 'service-toggle'));
  host.append(element('p', '进程实验记录'));
  const trace = element('pre', story.trace().join('\n') || '等待操作。', 'game-receipt');
  host.append(trace, element('h2', '应用程序'));
  const windows = table(host, ['任务', '操作']);
  for (const task of desktop.listWindows()) {
    if (task.id === 'manager') continue;
    const row = windows.insertRow();
    row.insertCell().textContent = task.title;
    row.insertCell().append(button('结束任务', () => {
      desktop.closeWindow(task.id);
      refresh(['manager']);
    }));
  }
}

function control(_, host) {
  host.append(element('h2', '控制面板'));
  const options = element('div', null, 'game-control');
  options.append(
    button('显示属性', () => desktop.open('display')),
    button('网络连接', () => desktop.open('network')),
    button('任务管理器', () => desktop.open('manager')),
    button(muted ? '打开系统声音' : '静音', () => {
      muted = !muted;
      save();
      refresh(['control']);
      sound('notify');
    }),
    button(shownHidden ? '隐藏文件和文件夹' : '显示隐藏文件和文件夹', () => {
      shownHidden = !shownHidden;
      save();
      refresh(['control', 'explorer']);
    }),
  );
  host.append(options);
}

const apps = {
  explorer, notepad, search, run, messenger, manager, control,
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
      const originalContent = new Map(seed.filter(file => file.kind === 'file').map(file => [file.id, file.content]));
      const savedFiles = saved?.files?.map(file => originalContent.has(file.id)
        ? { ...file, content: originalContent.get(file.id) }
        : file);
      vfs = createVfs(seed, savedFiles);
      story = createStory(saved?.story);
      online = saved?.online ?? true;
      shownHidden = saved?.shownHidden ?? false;
      lastRestored = saved?.lastRestored;
      muted = saved?.muted ?? false;
      root.hidden = false;
      desktop = mountDesktop(root, {
        renderApp: render,
        onOpen: () => {},
        onPower: power,
        onFullscreen: fullscreen,
        onFeedback: sound,
      });
      save();
      if (!saved) {
        desktop.notify('本机消息 · 工作站 03', () => desktop.open('messenger'));
        void audio?.resume().then(() => sound('boot')).catch(() => {});
      }
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
