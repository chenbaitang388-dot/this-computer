const invalidName = /[<>:"/\\|?*\u0000-\u001F]/u;
const reservedName = /^(CON|PRN|AUX|NUL|COM[1-9¹²³]|LPT[1-9¹²³]) *(?:\.|$)/iu;

function compareName(name) {
  return name.toLowerCase();
}

function checkName(name) {
  if (typeof name !== 'string' || !name.trim() || name.length > 255 || invalidName.test(name) || /[. ]$/u.test(name) || reservedName.test(name)) {
    throw new Error('请输入有效的文件名。');
  }
}

function checkContent(content) {
  if (typeof content !== 'string') throw new Error('文件内容必须是文本。');
}

export function createVfs(seed, saved) {
  const nodes = new Map();
  for (const node of structuredClone(saved ?? seed)) {
    if (nodes.has(node.id)) throw new Error('文件记录的编号重复。');
    nodes.set(node.id, node);
  }

  function find(id) {
    const node = nodes.get(id);
    if (!node) throw new Error('找不到指定的文件或文件夹。');
    return node;
  }

  function lineage(node) {
    const chain = [];
    const seen = new Set();
    while (node) {
      if (seen.has(node.id)) throw new Error('文件夹路径存在循环。');
      seen.add(node.id);
      chain.push(node);
      if (node.parent == null) break;
      node = find(node.parent);
    }
    return chain;
  }

  for (const node of nodes.values()) {
    if (node.parent != null && find(node.parent).kind !== 'dir') {
      throw new Error('文件必须位于磁盘或文件夹中。');
    }
    lineage(node);
  }

  function isRecycled(node) {
    return lineage(node).some((entry) => entry.trash);
  }

  function active(id) {
    const node = find(id);
    if (isRecycled(node)) throw new Error('请先从回收站还原此项目。');
    return node;
  }

  function editable(id) {
    const node = active(id);
    if (node.parent == null) throw new Error('无法修改磁盘根目录。');
    return node;
  }

  function directory(id) {
    const node = active(id);
    if (node.kind !== 'dir') throw new Error('请选择一个文件夹。');
    return node;
  }

  function children(parent) {
    return [...nodes.values()].filter((node) => node.parent === parent && !node.trash);
  }

  function occupied(parent, name, except) {
    return children(parent).some((node) => node.id !== except && compareName(node.name) === compareName(name));
  }

  function availableName(node, parent, label) {
    if (!occupied(parent, node.name, node.id)) return node.name;
    const dot = node.kind === 'file' ? node.name.lastIndexOf('.') : -1;
    const stem = dot > 0 ? node.name.slice(0, dot) : node.name;
    const extension = dot > 0 ? node.name.slice(dot) : '';
    for (let index = 1; ; index += 1) {
      const suffix = index === 1 ? label : `${label} ${index}`;
      const name = `${stem} (${suffix})${extension}`;
      if (!occupied(parent, name, node.id)) return name;
    }
  }

  function checkDestination(node, parent) {
    const destination = directory(parent);
    if (lineage(destination).some((entry) => entry.id === node.id)) {
      throw new Error('无法将文件夹放入自身或其子文件夹。');
    }
  }

  let copyNumber = 0;
  function nextId() {
    do {
      copyNumber += 1;
    } while (nodes.has(`copy-${copyNumber}`));
    return `copy-${copyNumber}`;
  }

  let fileNumber = 0;
  function createNode(parent, name, fields) {
    directory(parent);
    checkName(name);
    if (occupied(parent, name)) throw new Error('此位置已有同名项目。');
    let id;
    do {
      fileNumber += 1;
      id = `user-file-${fileNumber}`;
    } while (nodes.has(id));
    const now = new Date().toISOString();
    const node = { id, parent, name, created: now, modified: now, ...fields };
    nodes.set(id, node);
    return structuredClone(node);
  }

  return {
    list(parent, { showHidden = false } = {}) {
      if (parent != null) directory(parent);
      return structuredClone(children(parent).filter((node) => showHidden || !node.hidden));
    },

    get(id) {
      return structuredClone(nodes.get(id));
    },

    path(id) {
      const [root, ...entries] = lineage(find(id)).reverse();
      const drive = `${root.id.toUpperCase()}:`;
      return `${drive}\\${entries.map((node) => node.name).join('\\')}`;
    },

    trashList() {
      return structuredClone([...nodes.values()].filter((node) => node.trash));
    },

    remove(id) {
      const node = editable(id);
      node.trash = true;
      node.trashedAt = new Date().toISOString();
      return structuredClone(node);
    },

    restore(id) {
      const node = find(id);
      if (!node.trash) throw new Error('此项目不在回收站中。');
      const originalParent = find(node.parent);
      const destination = isRecycled(originalParent) ? lineage(originalParent).at(-1) : originalParent;
      node.name = availableName(node, destination.id, '还原');
      node.parent = destination.id;
      delete node.trash;
      delete node.trashedAt;
      return structuredClone(node);
    },

    rename(id, name) {
      const node = editable(id);
      checkName(name);
      if (occupied(node.parent, name, id)) throw new Error('此位置已有同名项目。');
      node.name = name;
      return structuredClone(node);
    },

    createFile(parent, name, content = '') {
      checkContent(content);
      return createNode(parent, name, { kind: 'file', content });
    },

    createFolder(parent, name) {
      return createNode(parent, name, { kind: 'dir' });
    },

    write(id, content) {
      const node = editable(id);
      if (node.kind !== 'file') throw new Error('请选择一个文件。');
      checkContent(content);
      node.content = content;
      node.modified = new Date().toISOString();
      return structuredClone(node);
    },

    setHidden(id, hidden) {
      const node = editable(id);
      if (typeof hidden !== 'boolean') throw new Error('请选择是否隐藏此项目。');
      node.hidden = hidden;
      return structuredClone(node);
    },

    search(query, { showHidden = false } = {}) {
      const needle = compareName(query.trim());
      if (!needle) return [];
      const results = [...nodes.values()].filter((node) => {
        if (node.parent == null || !compareName(node.name).includes(needle)) return false;
        return !lineage(node).some((entry) => entry.trash || (!showHidden && entry.hidden));
      });
      return structuredClone(results);
    },

    move(id, parent) {
      const node = editable(id);
      checkDestination(node, parent);
      if (occupied(parent, node.name, id)) throw new Error('目标文件夹已有同名项目。');
      node.parent = parent;
      return structuredClone(node);
    },

    copy(id, parent) {
      const node = editable(id);
      checkDestination(node, parent);
      const now = new Date().toISOString();

      function duplicate(source, destination, name) {
        const copy = structuredClone(source);
        Object.assign(copy, { id: nextId(), parent: destination, name, created: now });
        nodes.set(copy.id, copy);
        for (const child of children(source.id)) duplicate(child, copy.id, child.name);
        return copy;
      }

      const name = availableName({ ...node, id: undefined }, parent, '副本');
      return structuredClone(duplicate(node, parent, name));
    },

    serialize() {
      return structuredClone([...nodes.values()]);
    },
  };
}
