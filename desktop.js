const shortcuts = [
  ['explorer', '此电脑', 'computer'],
  ['trash', '回收站', 'trash'],
  ['notepad', '记事本', 'paper'],
  ['events', '事件查看器', 'events'],
  ['network', '网上邻居', 'network'],
  ['handover', '交接记录', 'folder'],
];

const icons = {
  computer: '<rect x="5" y="4" width="26" height="21" rx="3" fill="#dfe5e8" stroke="#364866"/><rect x="8" y="7" width="20" height="14" rx="1" fill="#398ad5"/><path d="M9 20 26 8h2v3L14 21Z" fill="#7fd4f3"/><path d="M15 25h7v5h5v3H10v-3h5Z" fill="#aab8c4" stroke="#364866"/>',
  trash: '<path d="M8 10h20l-2 21q-8 5-16 0Z" fill="#d7e9eb" stroke="#476571"/><ellipse cx="18" cy="10" rx="10" ry="4" fill="#a0b9c4" stroke="#476571"/><path d="M14 18l3-4 3 4m3 1 2 4-5 1m-2 3-5-1 1-5" fill="none" stroke="#31934c" stroke-width="2"/>',
  paper: '<path d="M9 3h14l6 6v24H9Z" fill="#f7fbff" stroke="#4d74a0"/><path d="M23 3v7h6M12 15h13m-13 4h13m-13 4h13m-13 4h10" fill="none" stroke="#5a9ac8"/>',
  events: '<rect x="5" y="5" width="26" height="26" rx="3" fill="#e0e8f1" stroke="#4a6590"/><path d="M5 7h26v5H5Z" fill="#286bd0"/><circle cx="11" cy="17" r="2" fill="#31a456"/><circle cx="11" cy="23" r="2" fill="#e4a322"/><path d="M16 17h11m-11 6h11m-11 4h8" stroke="#6385a4"/>',
  network: '<circle cx="15" cy="16" r="11" fill="#63b4e9" stroke="#305794"/><path d="M6 12h18M5 20h20M15 5q-9 11 0 22 9-11 0-22Z" fill="none" stroke="#d1f4fb"/><rect x="18" y="19" width="14" height="11" rx="1" fill="#dce7ed" stroke="#374f68"/><path d="M20 21h10v6H20Z" fill="#3675b5"/><path d="M22 32h6" stroke="#cbdde6" stroke-width="2"/>',
  folder: '<path d="M4 9h12l3 4h13v17H4Z" fill="#e6ad36" stroke="#9f671e"/><path d="M6 15h27l-4 15H4Z" fill="#ffda77" stroke="#a87820"/><path d="M8 17h21" stroke="#fff1a6"/>',
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
  const clock = element('span', 'retro-clock');
  const startMenu = element('div', 'retro-start-menu');
  const context = element('div', 'retro-context');
  const notices = element('div', 'retro-notices');
  const selection = element('div', 'retro-selection');
  const windows = new Map();
  let active;
  let sequence = 0;
  let nextZ = 0;

  start.innerHTML = '<span aria-hidden="true" class="retro-start-mark"><i></i><i></i><i></i><i></i></span>开始';
  start.setAttribute('aria-expanded', 'false');
  startMenu.hidden = context.hidden = selection.hidden = true;
  notices.setAttribute('aria-live', 'polite');
  surface.append(shortcutsArea, windowLayer, selection);
  taskbar.append(start, tasks, clock);
  root.append(surface, taskbar, startMenu, context, notices);

  function updateClock() {
    clock.textContent = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
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

  function showContext(event, items) {
    event.preventDefault();
    event.stopPropagation();
    dismissMenus();
    context.replaceChildren(...items.map(([label, action]) => {
      const button = element('button', '', label);
      button.onclick = () => {
        dismissMenus();
        action();
      };
      return button;
    }));
    context.hidden = false;
    const bounds = root.getBoundingClientRect();
    context.style.left = Math.max(0, Math.min(event.clientX - bounds.left, bounds.width - context.offsetWidth)) + 'px';
    context.style.top = Math.max(0, Math.min(event.clientY - bounds.top, bounds.height - context.offsetHeight)) + 'px';
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

  function focusNext() {
    const remaining = [...windows.values()].filter(record => !record.window.hidden);
    remaining.sort((a, b) => Number(b.window.style.zIndex) - Number(a.window.style.zIndex));
    focusWindow(remaining[0]);
  }

  function minimize(record) {
    record.window.hidden = true;
    if (active === record) focusNext();
  }

  function maximize(record) {
    const isMaximized = record.window.classList.toggle('is-maximized');
    record.maximizeButton.textContent = isMaximized ? '❐' : '□';
    record.maximizeButton.title = isMaximized ? '还原' : '最大化';
    record.maximizeButton.setAttribute('aria-label', record.maximizeButton.title);
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

  function open(app, payload) {
    dismissMenus();
    const [, appTitle, glyph] = shortcuts.find(([key]) => key === app) ?? [app, app, 'paper'];
    const title = app === 'notepad' ? payload?.title ?? appTitle : appTitle;
    const windowKey = app === 'notepad' && payload?.id != null ? app + ':' + payload.id : app;
    const existing = windows.get(windowKey);
    if (existing) {
      if (payload !== undefined) {
        existing.body.replaceChildren();
        api.renderApp(app, payload, existing.body);
      }
      focusWindow(existing);
      api.onOpen?.(app, payload);
      return existing.body;
    }
    const window = element('section', 'retro-window');
    window.setAttribute('aria-label', title);
    const bar = element('header', 'retro-titlebar');
    const caption = element('span', 'retro-caption');
    caption.innerHTML = icon(glyph);
    caption.append(document.createTextNode(title));
    const controls = element('div', 'retro-window-controls');
    const body = element('div', 'retro-window-body');
    const resize = element('div', 'retro-resize');
    const task = element('button', 'retro-task');
    task.innerHTML = icon(glyph);
    task.append(document.createTextNode(title));
    const record = { window, task, body };
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
    control('关闭', '×', () => {
      windows.delete(windowKey);
      window.remove();
      task.remove();
      if (active === record) focusNext();
    }, 'retro-close');
    bar.append(caption, controls);
    window.append(bar, body, resize);
    windowLayer.append(window);
    tasks.append(task);
    windows.set(windowKey, record);

    window.addEventListener('pointerdown', () => {
      if (active !== record) focusWindow(record);
    }, true);
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
    api.renderApp(app, payload, body);
    api.onOpen?.(app, payload);
    return body;
  }

  function dialog({ title, text, buttons = [{ label: '确定' }] }) {
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
    const dismiss = () => {
      shade.remove();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
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

  function notify(text) {
    const notice = element('button', 'retro-notice', text);
    notice.onclick = () => notice.remove();
    notices.append(notice);
    setTimeout(() => notice.remove(), 5500);
  }

  function openShortcut(app) {
    return open(app, app === 'explorer' ? { id: null, title: '此电脑' } : undefined);
  }

  const menuHeader = element('div', 'retro-menu-header', '值班终端');
  startMenu.append(menuHeader);
  shortcuts.forEach(([app, title, glyph]) => {
    const shortcut = element('button', 'retro-shortcut');
    shortcut.innerHTML = icon(glyph);
    shortcut.append(element('span', '', title));
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
    const entry = element('button', 'retro-menu-entry');
    entry.innerHTML = icon(glyph);
    entry.append(document.createTextNode(title));
    entry.onclick = () => openShortcut(app);
    startMenu.append(entry);
  });
  const footer = element('div', 'retro-menu-footer');
  [['全屏', () => api.onFullscreen?.()], ['关机', () => api.onPower?.()]].forEach(([title, action]) => {
    const button = element('button', '', title);
    button.onclick = () => {
      dismissMenus();
      action();
    };
    footer.append(button);
  });
  startMenu.append(footer);
  start.onclick = () => {
    const openMenu = startMenu.hidden;
    dismissMenus();
    startMenu.hidden = !openMenu;
    start.setAttribute('aria-expanded', String(openMenu));
  };
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
      ['打开此电脑', () => openShortcut('explorer')],
      ['刷新', () => select()],
      ['全屏', () => api.onFullscreen?.()],
    ]);
  });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') dismissMenus();
  });

  return { open, dialog, notify };
}
