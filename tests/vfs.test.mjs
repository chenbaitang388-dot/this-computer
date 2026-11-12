import assert from 'node:assert/strict';
import test from 'node:test';
import { createVfs } from '../vfs.js';

const seed = [
  { id: 'd', parent: null, kind: 'dir', name: 'Data' },
  { id: 'handover', parent: 'd', kind: 'dir', name: '交接' },
  { id: 'archive', parent: 'd', kind: 'dir', name: '备份' },
  { id: 'subfolder', parent: 'handover', kind: 'dir', name: '记录' },
  { id: 'current', parent: 'handover', kind: 'file', name: '值班.txt', content: 'current' },
  { id: 'old', parent: 'handover', kind: 'file', name: '值班.txt', content: 'previous', trash: true },
  { id: 'hidden', parent: 'subfolder', kind: 'file', name: 'shadow.txt', hidden: true },
];

test('restores a deleted revision beside its live replacement and persists both', () => {
  const files = createVfs(seed);
  assert.deepEqual(files.trashList().map(({ id }) => id), ['old']);
  assert.deepEqual(files.list('handover').map(({ id }) => id), ['subfolder', 'current']);
  const restored = files.restore('old');
  assert.equal(restored.content, 'previous');
  assert.equal(restored.name, '值班 (还原).txt');
  assert.equal(files.path(restored.id), 'D:\\交接\\值班 (还原).txt');
  assert.equal(files.get('current').content, 'current');
  assert.deepEqual(createVfs(seed, files.serialize()).serialize(), files.serialize());
  assert.equal(seed.find(({ id }) => id === 'old').trash, true);
});

test('copies nested folders, preserves hidden flags and keeps copies independent', () => {
  const files = createVfs(seed);
  const copy = files.copy('handover', 'archive');
  const copiedChildren = files.list(copy.id);
  assert.deepEqual(copiedChildren.map(({ name }) => name), ['记录', '值班.txt']);
  const copiedFolder = copiedChildren.find(({ kind }) => kind === 'dir');
  assert.deepEqual(files.list(copiedFolder.id), []);
  assert.equal(files.list(copiedFolder.id, { showHidden: true })[0].name, 'shadow.txt');
  files.rename(copy.id, '副本');
  assert.equal(files.get('handover').name, '交接');
  assert.throws(() => files.move('handover', 'subfolder'));
  assert.equal(files.get('handover').parent, 'd');
});

test('keeps a trashed directory intact and rejects duplicate Windows names', () => {
  const files = createVfs(seed);
  assert.throws(() => files.rename('archive', '交接'));
  assert.throws(() => files.rename('archive', 'AUX.txt'));
  files.remove('handover');
  assert.deepEqual(files.list('d').map(({ id }) => id), ['archive']);
  assert.throws(() => files.list('handover'));
  assert.throws(() => files.remove('current'));
  files.restore('handover');
  assert.equal(files.get('current').content, 'current');
  assert.equal(files.path('hidden'), 'D:\\交接\\记录\\shadow.txt');
});
