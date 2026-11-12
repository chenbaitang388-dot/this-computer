const shortcuts = [
  ['explorer', '此电脑', 'computer'],
  ['trash', '回收站', 'trash'],
  ['notepad', '记事本', 'paper'],
  ['events', '事件查看器', 'events'],
  ['network', '网上邻居', 'network'],
  ['handover', '交接记录', 'folder'],
  ['messenger', '本机消息', 'messenger'],
  ['search', '搜索', 'search'],
  ['manager', '任务管理器', 'events'],
  ['control', '控制面板', 'control'],
  ['run', '运行', 'run'],
  ['display', '显示属性', 'computer'],
];

const desktopApps = ['explorer', 'trash', 'notepad', 'events', 'network', 'handover', 'messenger', 'search', 'manager'];
const startPrograms = ['notepad', 'messenger', 'events', 'handover', 'trash'];
const startPlaces = ['explorer', 'network', 'control', 'manager', 'search', 'run'];

const icons = {
  computer: '<rect x="5" y="4" width="26" height="21" rx="3" fill="#dfe5e8" stroke="#364866"/><rect x="8" y="7" width="20" height="14" rx="1" fill="#398ad5"/><path d="M9 20 26 8h2v3L14 21Z" fill="#7fd4f3"/><path d="M15 25h7v5h5v3H10v-3h5Z" fill="#aab8c4" stroke="#364866"/>',
  trash: '<path d="M8 10h20l-2 21q-8 5-16 0Z" fill="#d7e9eb" stroke="#476571"/><ellipse cx="18" cy="10" rx="10" ry="4" fill="#a0b9c4" stroke="#476571"/><path d="M14 18l3-4 3 4m3 1 2 4-5 1m-2 3-5-1 1-5" fill="none" stroke="#31934c" stroke-width="2"/>',
  paper: '<path d="M9 3h14l6 6v24H9Z" fill="#f7fbff" stroke="#4d74a0"/><path d="M23 3v7h6M12 15h13m-13 4h13m-13 4h13m-13 4h10" fill="none" stroke="#5a9ac8"/>',
  events: '<rect x="5" y="5" width="26" height="26" rx="3" fill="#e0e8f1" stroke="#4a6590"/><path d="M5 7h26v5H5Z" fill="#286bd0"/><circle cx="11" cy="17" r="2" fill="#31a456"/><circle cx="11" cy="23" r="2" fill="#e4a322"/><path d="M16 17h11m-11 6h11m-11 4h8" stroke="#6385a4"/>',
  network: '<circle cx="15" cy="16" r="11" fill="#63b4e9" stroke="#305794"/><path d="M6 12h18M5 20h20M15 5q-9 11 0 22 9-11 0-22Z" fill="none" stroke="#d1f4fb"/><rect x="18" y="19" width="14" height="11" rx="1" fill="#dce7ed" stroke="#374f68"/><path d="M20 21h10v6H20Z" fill="#3675b5"/><path d="M22 32h6" stroke="#cbdde6" stroke-width="2"/>',
  folder: '<path d="M4 9h12l3 4h13v17H4Z" fill="#e6ad36" stroke="#9f671e"/><path d="M6 15h27l-4 15H4Z" fill="#ffda77" stroke="#a87820"/><path d="M8 17h21" stroke="#fff1a6"/>',
  messenger: '<path d="M5 6h26v18H15l-7 6v-6H5Z" fill="#fff7d2" stroke="#755d2a" stroke-width="2"/><path d="M9 11h18m-18 5h14m-14 4h9" stroke="#7694ba" stroke-width="2"/>',
  search: '<circle cx="15" cy="14" r="9" fill="#a9d5f4" stroke="#315780" stroke-width="3"/><path d="m22 21 10 10" stroke="#42383b" stroke-width="5"/><path d="m23 22 8 8" stroke="#be9e7c" stroke-width="2"/>',
  control: '<rect x="4" y="6" width="28" height="23" rx="2" fill="#deebf6" stroke="#41658e"/><path d="M5 8h26v4H5Z" fill="#2f72cb"/><path d="M8 16h20M8 21h20m-20 5h20" stroke="#607c9e"/><path d="M12 14v4m11 1v4m-6 1v4" stroke="#407fbd" stroke-width="3"/>',
  run: '<rect x="7" y="8" width="26" height="20" rx="2" fill="#e7eef9" stroke="#41658e"/><path d="M8 9h24v5H8Z" fill="#2f72cb"/><path d="m12 17 4 3-4 3m7 0h8M2 13h5m-4 6h4m-6 5h6" fill="none" stroke="#41658e" stroke-width="1.5"/>',
};

function icon(name) {
  return '<svg viewBox="0 0 36 36" aria-hidden="true">' + icons[name] + '</svg>';
}

function element(tag, className, label) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (label !== undefined) node.textContent = label;
  if (tag === 'button') node.type = 'button';
  return node;
}

export function mountDesktop(root, api) {
  root.classList.add('retro-desktop');
  const surface = element('div', 'retro-surface');
  const shortcutsArea = element('div', 'retro-shortcuts');
  const windowLayer = element('div', 'retro-windows');
  const taskbar = element('div', 'retro-taskbar');
  const start = element('button', 'retro-start');
  const tasks = element('div', 'retro-tasks');
  const tray = element('div', 'retro-tray');
  const clock = element('button', 'retro-clock');
  const startMenu = element('div', 'retro-start-menu');
  const context = element('div', 'retro-context');
  const notices = element('div', 'retro-notices');
  const selection = element('div', 'retro-selection');
  const windows = new Map();
  let active;
  let sequence = 0;
  let nextZ = 0;
  let wallpaper = 'hills';
  let compactIcons = false;
  let wallpaperCentered = false;
  const feedback = kind => api.onFeedback?.(kind);

  start.innerHTML = '<span aria-hidden="true" class="retro-start-mark"><i></i><i></i><i></i><i></i></span>开始';
  start.setAttribute('aria-expanded', 'false');
  startMenu.hidden = context.hidden = selection.hidden = true;
  notices.setAttribute('aria-live', 'polite');
  surface.append(shortcutsArea, windowLayer, selection);
  taskbar.append(start, tasks, tray);
  root.append(surface, taskbar, startMenu, context, notices);

  function updateClock() {
    const now = new Date();
    clock.textContent = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
    clock.title = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'full' }).format(now);
  }
  updateClock();
  setInterval(updateClock, 15000);

  function dismissMenus() {
    startMenu.hidden = context.hidden = true;
    start.setAttribute('aria-expanded', 'false');
  }

  function select(...selected) {
    for (const shortcut of shortcutsArea.children) {
      shortcut.classList.toggle('is-selected', selected.includes(shortcut));
    }
  }

  function contextItems(items) {
    return items.map(([label, action]) => {
      if (!label) return element('hr', 'retro-context-divider');
      const button = element('button', '', label);
      if (!Array.isArray(action)) {
        button.onclick = () => {
          dismissMenus();
          action();
        };
        return button;
      }
      const group = element('div', 'retro-context-group');
      const submenu = element('div', 'retro-context retro-context-submenu');
      button.append(element('span', 'retro-context-arrow', '▶'));
      button.setAttribute('aria-expanded', 'false');
      submenu.append(...contextItems(action));
      button.onclick = () => {
        const expanded = group.classList.toggle('is-expanded');
        button.setAttribute('aria-expanded', String(expanded));
      };
      group.append(button, submenu);
      return group;
    });
  }

  function showContext(event, items) {
    event.preventDefault();
    event.stopPropagation();
    dismissMenus();
    context.replaceChildren(...contextItems(items));
    context.hidden = false;
    const bounds = root.getBoundingClientRect();
    const left = Math.max(0, Math.min(event.clientX - bounds.left, bounds.width - context.offsetWidth));
    const top = Math.max(0, Math.min(event.clientY - bounds.top, bounds.height - context.offsetHeight));
    context.style.left = left + 'px';
    context.style.top = top + 'px';
    context.classList.toggle('opens-left', left + context.offsetWidth + 160 > bounds.width);
    context.classList.toggle('opens-up', top + context.offsetHeight + 110 > bounds.height);
    feedback('menu');
  }

  function focusWindow(record) {
    active?.window.classList.remove('is-active');
    active?.task.classList.remove('is-active');
    active = record;
    if (!record) return;
    record.window.hidden = false;
    record.window.style.zIndex = ++nextZ;
    record.window.classList.add('is-active');
    record.task.classList.add('is-active');
  }

  function focusWindowElement(record) {
    if (!root.querySelector('.retro-dialog-shade')) record.window.focus();
  }

  function focusNext() {
    const remaining = [...windows.values()].filter(record => !record.window.hidden);
    remaining.sort((a, b) => Number(b.window.style.zIndex) - Number(a.window.style.zIndex));
    focusWindow(remaining[0]);
  }

  function minimize(record) {
    record.window.hidden = true;
    if (active === record) focusNext();
    feedback('minimize');
  }

  function maximize(record) {
    const isMaximized = record.window.classList.toggle('is-maximized');
    record.maximizeButton.textContent = isMaximized ? '❐' : '□';
    record.maximizeButton.title = isMaximized ? '还原' : '最大化';
    record.maximizeButton.setAttribute('aria-label', record.maximizeButton.title);
    feedback('open');
  }

  function trackPointer(event, target, move, finish) {
    if (event.button !== 0) return;
    event.preventDefault();
    const x = event.clientX;
    const y = event.clientY;
    target.setPointerCapture(event.pointerId);
    const drag = next => move(next.clientX - x, next.clientY - y);
    const end = () => {
      target.removeEventListener('pointermove', drag);
      target.removeEventListener('lostpointercapture', end);
      finish?.();
    };
    target.addEventListener('pointermove', drag);
    target.addEventListener('lostpointercapture', end);
  }

  function listWindows() {
    return [...windows].map(([id, { title }]) => ({ id, title }));
  }

  function closeWindow(id) {
    const record = windows.get(id);
    if (!record) return;
    windows.delete(id);
    record.window.remove();
    record.task.remove();
    if (active === record) focusNext();
    feedback('close');
  }

  function open(app, payload) {
    dismissMenus();
    const [, appTitle, glyph] = shortcuts.find(([key]) => key === app) ?? [app, app, 'paper'];
    const title = app === 'notepad' ? payload?.title ?? appTitle : appTitle;
    const windowKey = app === 'notepad' && payload?.id != null ? app + ':' + payload.id : app;
    const existing = windows.get(windowKey);
    if (existing) {
      if (payload !== undefined || app === 'manager') {
        existing.body.replaceChildren();
        api.renderApp(app, payload, existing.body);
      }
      focusWindow(existing);
      focusWindowElement(existing);
      feedback('open');
      api.onOpen?.(app, payload);
      return existing.body;
    }
    const window = element('section', 'retro-window');
    window.setAttribute('aria-label', title);
    window.tabIndex = -1;
    const bar = element('header', 'retro-titlebar');
    const caption = element('span', 'retro-caption');
    caption.innerHTML = icon(glyph);
    caption.append(document.createTextNode(title));
    const controls = element('div', 'retro-window-controls');
    const body = element('div', 'retro-window-body');
    const resize = element('div', 'retro-resize');
    const task = element('button', 'retro-task');
    task.innerHTML = icon(glyph);
    task.append(element('span', '', title));
    task.title = title;
    const record = { window, task, body, title };
    const offset = (sequence++ % 6) * 24;
    const width = Math.min(app === 'explorer' ? 720 : 580, surface.clientWidth - 12);
    const height = Math.min(app === 'explorer' ? 460 : 385, surface.clientHeight - 12);
    const left = Math.min(134 + offset, Math.max(6, surface.clientWidth - width - 6));
    const top = Math.min(43 + offset, Math.max(6, surface.clientHeight - height - 6));
    Object.assign(window.style, { left: left + 'px', top: top + 'px', width: width + 'px', height: height + 'px' });

    function control(label, glyph, action, className) {
      const button = element('button', className, glyph);
      button.title = label;
      button.setAttribute('aria-label', label);
      button.onclick = action;
      controls.append(button);
      return button;
    }

    control('最小化', '−', () => minimize(record));
    record.maximizeButton = control('最大化', '□', () => maximize(record));
    control('关闭', '×', () => closeWindow(windowKey), 'retro-close');
    bar.append(caption, controls);
    window.append(bar, body, resize);
    windowLayer.append(window);
    tasks.append(task);
    windows.set(windowKey, record);

    window.addEventListener('pointerdown', () => {
      if (active !== record) focusWindow(record);
    }, true);
    window.addEventListener('focusin', () => {
      if (active !== record) focusWindow(record);
    });
    bar.onpointerdown = event => {
      if (event.target.closest('button') || window.classList.contains('is-maximized')) return;
      const startLeft = window.offsetLeft;
      const startTop = window.offsetTop;
      trackPointer(event, bar, (dx, dy) => {
        window.style.left = Math.max(0, Math.min(surface.clientWidth - 85, startLeft + dx)) + 'px';
        window.style.top = Math.max(0, Math.min(surface.clientHeight - 30, startTop + dy)) + 'px';
      });
    };
    bar.ondblclick = event => {
      if (!event.target.closest('button')) maximize(record);
    };
    bar.oncontextmenu = event => {
      showContext(event, [
        [window.classList.contains('is-maximized') ? '还原' : '最大化', () => maximize(record)],
        ['最小化', () => minimize(record)],
        [],
        ['关闭', () => closeWindow(windowKey)],
      ]);
    };
    resize.onpointerdown = event => {
      const width = window.offsetWidth;
      const height = window.offsetHeight;
      trackPointer(event, resize, (dx, dy) => {
        window.style.width = Math.min(surface.clientWidth - window.offsetLeft, Math.max(280, width + dx)) + 'px';
        window.style.height = Math.min(surface.clientHeight - window.offsetTop, Math.max(170, height + dy)) + 'px';
      });
    };
    task.onclick = () => {
      if (active === record) minimize(record);
      else focusWindow(record);
    };

    focusWindow(record);
    focusWindowElement(record);
    if (app === 'display') renderDisplay(body);
    else api.renderApp(app, payload, body);
    feedback('open');
    if (app !== 'display') api.onOpen?.(app, payload);
    return body;
  }

  function dialog({ title, text, buttons = [{ label: '确定' }] }) {
    dismissMenus();
    feedback('warning');
    const shade = element('div', 'retro-dialog-shade');
    const panel = element('section', 'retro-dialog');
    const header = element('header', 'retro-titlebar');
    const caption = element('span', 'retro-caption', title);
    const close = element('button', 'retro-close', '×');
    const body = element('div', 'retro-dialog-body');
    const mark = element('span', 'retro-warning', '!');
    const message = element('div', 'retro-dialog-message', text);
    const actions = element('div', 'retro-dialog-actions');
    const previousFocus = document.activeElement;
    const previousWindow = active;
    const dismiss = () => {
      shade.remove();
      if (active && active !== previousWindow) focusWindowElement(active);
      else if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', title);
    close.setAttribute('aria-label', '关闭');
    close.onclick = dismiss;
    buttons.forEach(({ label, action }) => {
      const button = element('button', '', label);
      button.onclick = () => {
        dismiss();
        action?.();
      };
      actions.append(button);
    });
    panel.onkeydown = event => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        dismiss();
      }
      if (event.key !== 'Tab') return;
      const focusable = [...panel.querySelectorAll('button')];
      const destination = event.shiftKey ? focusable.at(-1) : focusable[0];
      const boundary = event.shiftKey ? focusable[0] : focusable.at(-1);
      if (document.activeElement === boundary) {
        event.preventDefault();
        destination.focus();
      }
    };
    header.append(caption, close);
    body.append(mark, message);
    panel.append(header, body, actions);
    shade.append(panel);
    root.append(shade);
    (actions.firstElementChild ?? close).focus();
  }

  function notify(text, onClick) {
    const notice = element('button', 'retro-notice', text);
    notice.onclick = () => {
      notice.remove();
      onClick?.();
    };
    notices.append(notice);
    feedback('notify');
    setTimeout(() => notice.remove(), 5500);
  }

  function renderDisplay(body) {
    const panel = element('form', 'retro-display-panel');
    const preview = element('div', 'retro-display-preview');
    const wallField = element('label', 'retro-display-field', '背景');
    const wallSelect = element('select');
    for (const [value, label] of [['hills', '山丘'], ['plain', '纯色'], ['night', '深夜']]) {
      const option = element('option', '', label);
      option.value = value;
      wallSelect.append(option);
    }
    wallSelect.value = wallpaper;
    const positionField = element('label', 'retro-display-field', '位置');
    const position = element('select');
    for (const [value, label] of [['fill', '拉伸'], ['center', '居中']]) {
      const option = element('option', '', label);
      option.value = value;
      position.append(option);
    }
    position.value = wallpaperCentered ? 'center' : 'fill';
    function updatePreview() {
      preview.dataset.wallpaper = wallSelect.value;
      preview.classList.toggle('wallpaper-centered', position.value === 'center');
    }
    wallSelect.onchange = position.onchange = updatePreview;
    updatePreview();
    const iconField = element('label', 'retro-display-check');
    const iconSize = element('input');
    iconSize.type = 'checkbox';
    iconSize.checked = compactIcons;
    iconField.append(iconSize, document.createTextNode('使用小图标'));
    wallField.append(wallSelect);
    positionField.append(position);
    const actions = element('div', 'retro-display-actions');
    const apply = element('button', '', '应用');
    const confirm = element('button', '', '确定');
    const cancel = element('button', '', '取消');
    apply.onclick = () => {
      wallpaper = wallSelect.value;
      wallpaperCentered = position.value === 'center';
      compactIcons = iconSize.checked;
      surface.dataset.wallpaper = wallpaper;
      surface.classList.toggle('wallpaper-centered', wallpaperCentered);
      shortcutsArea.classList.toggle('uses-small-icons', compactIcons);
      feedback('refresh');
    };
    confirm.onclick = () => {
      apply.onclick();
      closeWindow('display');
    };
    cancel.onclick = () => closeWindow('display');
    actions.append(confirm, cancel, apply);
    panel.onsubmit = event => event.preventDefault();
    panel.append(preview, wallField, positionField, iconField, actions);
    body.append(panel);
  }

  function openShortcut(app) {
    return open(app, app === 'explorer' ? { id: null, title: '此电脑' } : undefined);
  }

  const menuHeader = element('div', 'retro-menu-header');
  const avatar = element('span', 'retro-user-avatar');
  avatar.innerHTML = icon('computer');
  menuHeader.append(avatar, element('span', '', '值班员'));
  const menuColumns = element('div', 'retro-menu-columns');
  const programs = element('div', 'retro-menu-programs');
  const places = element('div', 'retro-menu-places');
  menuColumns.append(programs, places);
  startMenu.append(menuHeader, menuColumns);
  const desktopButtons = new Map();
  desktopApps.forEach(app => {
    const [, title, glyph] = shortcuts.find(([key]) => key === app);
    const shortcut = element('button', 'retro-shortcut');
    shortcut.innerHTML = icon(glyph);
    shortcut.append(element('span', '', title));
    desktopButtons.set(app, shortcut);
    shortcut.onclick = () => select(shortcut);
    shortcut.ondblclick = () => openShortcut(app);
    shortcut.onkeydown = event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openShortcut(app);
      }
    };
    shortcut.oncontextmenu = event => {
      select(shortcut);
      showContext(event, [['打开', () => openShortcut(app)]]);
    };
    shortcutsArea.append(shortcut);
  });
  function menuEntry(app) {
    const [, title, glyph] = shortcuts.find(([key]) => key === app);
    const entry = element('button', 'retro-menu-entry');
    entry.innerHTML = icon(glyph);
    entry.append(document.createTextNode(title));
    entry.onclick = () => openShortcut(app);
    return entry;
  }
  programs.append(...startPrograms.map(menuEntry));
  places.append(...startPlaces.map(menuEntry));
  const footer = element('div', 'retro-menu-footer');
  [['全屏', () => api.onFullscreen?.()], ['关机', () => api.onPower?.()]].forEach(([title, action]) => {
    const button = element('button', '', title);
    const symbol = element('span', 'retro-footer-icon', title === '关机' ? '⏻' : '□');
    symbol.setAttribute('aria-hidden', 'true');
    button.prepend(symbol);
    button.onclick = () => {
      dismissMenus();
      action();
    };
    footer.append(button);
  });
  startMenu.append(footer);
  function toggleStart() {
    const openMenu = startMenu.hidden;
    dismissMenus();
    startMenu.hidden = !openMenu;
    start.setAttribute('aria-expanded', String(openMenu));
    if (openMenu) feedback('menu');
  }
  start.onclick = toggleStart;

  for (const [app, label, glyph] of [['network', '本地连接', 'network'], ['messenger', '本机消息', 'messenger']]) {
    const button = element('button', 'retro-tray-item');
    button.innerHTML = icon(glyph);
    button.title = label;
    button.setAttribute('aria-label', '托盘 · ' + label);
    button.onclick = () => openShortcut(app);
    tray.append(button);
  }
  clock.setAttribute('aria-label', '日期和时间');
  clock.ondblclick = () => dialog({ title: '日期和时间', text: clock.title });
  tray.append(clock);
  tray.oncontextmenu = event => showContext(event, [
    ['任务管理器', () => openShortcut('manager')],
    ['日期和时间', () => dialog({ title: '日期和时间', text: clock.title })],
  ]);

  function arrange(by) {
    const order = [...desktopApps];
    if (by === 'name') {
      order.sort((first, second) => desktopButtons.get(first).textContent.localeCompare(desktopButtons.get(second).textContent, 'zh-CN'));
    }
    if (by === 'type') {
      order.sort((first, second) => {
        const type = app => shortcuts.find(([key]) => key === app)[2];
        return type(first).localeCompare(type(second));
      });
    }
    shortcutsArea.append(...order.map(app => desktopButtons.get(app)));
    feedback('refresh');
  }

  function refreshDesktop() {
    select();
    shortcutsArea.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: 160 });
    feedback('refresh');
  }
  root.addEventListener('pointerdown', event => {
    if (!event.target.closest('.retro-context, .retro-start-menu, .retro-start')) dismissMenus();
  });
  surface.addEventListener('pointerdown', event => {
    if (event.target.closest('button, .retro-window')) return;
    if (event.button !== 0) return;
    select();
    const bounds = surface.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    trackPointer(event, surface, (dx, dy) => {
      selection.hidden = false;
      Object.assign(selection.style, {
        left: x + Math.min(0, dx) + 'px', top: y + Math.min(0, dy) + 'px',
        width: Math.abs(dx) + 'px', height: Math.abs(dy) + 'px',
      });
      const area = selection.getBoundingClientRect();
      const matches = [...shortcutsArea.children].filter(shortcut => {
        const box = shortcut.getBoundingClientRect();
        return area.left < box.right && area.right > box.left && area.top < box.bottom && area.bottom > box.top;
      });
      select(...matches);
    }, () => { selection.hidden = true; });
  });
  surface.addEventListener('contextmenu', event => {
    if (event.target.closest('.retro-window')) return;
    showContext(event, [
      ['排列图标', [
        ['名称', () => arrange('name')],
        ['类型', () => arrange('type')],
        ['默认顺序', () => arrange('default')],
      ]],
      ['刷新', refreshDesktop],
      [],
      ['全屏', () => api.onFullscreen?.()],
      ['属性', () => open('display')],
    ]);
  });
  document.addEventListener('keydown', event => {
    if (!root.isConnected || root.getClientRects().length === 0 || event.defaultPrevented) return;
    if (event.key === 'Escape') {
      dismissMenus();
      return;
    }
    if (root.querySelector('.retro-dialog-shade')) return;
    if (event.ctrlKey && event.key === 'Escape') {
      event.preventDefault();
      toggleStart();
      if (!startMenu.hidden) programs.querySelector('button')?.focus();
      return;
    }
    const key = event.key.toLowerCase();
    const desktopFocused = !event.target.closest?.('.retro-window, .retro-start-menu, .retro-context');
    if (key === 'f5' && desktopFocused) {
      event.preventDefault();
      refreshDesktop();
      return;
    }
    const bindings = { e: 'explorer', f: 'search', r: 'run', m: 'messenger', t: 'manager' };
    if ((event.metaKey || (event.ctrlKey && event.altKey)) && bindings[key]) {
      event.preventDefault();
      openShortcut(bindings[key]);
    }
  });

  return { open, dialog, notify, listWindows, closeWindow };
}
