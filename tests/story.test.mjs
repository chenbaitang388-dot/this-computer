import assert from 'node:assert/strict';
import test from 'node:test';
import { createStory, evidenceRecord, records } from '../story.js';

const correct = { record: evidenceRecord, conclusion: 'local-recovery' };

function readHandover(story) {
  story.dispatch({ type: 'file-open', id: 'handover-current' });
  story.dispatch({ type: 'restore', id: 'handover-old' });
  return story.dispatch({ type: 'file-open', id: 'handover-old' });
}

test('requires actual evidence and distinguishes the recovery source', () => {
  const story = createStory();
  assert.equal(story.submit(correct).ok, false);
  assert.match(readHandover(story).text, /当前桌面/);
  assert.equal(story.dispatch({ type: 'file-open', id: 'handover-old' }), null);
  assert.equal(story.submit(correct).ok, false);
  const record = records.find(({ id }) => id === evidenceRecord);
  assert.equal(record.source, '本机桌面恢复服务');
  story.dispatch({ type: 'record-open', id: record.id });
  assert.equal(story.submit(correct).ok, false);
  assert.match(story.dispatch({ type: 'network', online: false }).text, /正在恢复：你/);
  assert.equal(story.submit({ ...correct, conclusion: 'remote' }).ok, false);
  assert.equal(story.submit(correct).ok, true);
  assert.equal(story.status().complete, true);
  assert.match(story.dispatch({ type: 'power' }).text, /注销确认已收到/);
});

test('supports going offline before opening the record and resumes saved progress', () => {
  const story = createStory();
  assert.equal(story.dispatch({ type: 'network', online: false }), null);
  assert.equal(story.dispatch({ type: 'file-open', id: 'handover-old' }), null);
  assert.equal(story.status().old, false);
  const resumed = createStory(story.serialize());
  assert.match(resumed.dispatch({ type: 'record-open', id: evidenceRecord }).text, /事件：0417/);
  assert.equal(resumed.dispatch({ type: 'record-open', id: evidenceRecord }), null);
  readHandover(resumed);
  assert.equal(resumed.submit(correct).ok, true);
  assert.equal(createStory(resumed.serialize()).status().complete, true);
});

test('accepts a stopped-and-restarted recovery service while the network stays connected', () => {
  const story = createStory();
  readHandover(story);
  assert.match(story.talk('identity').text, /我是这台桌面的恢复服务/);
  story.dispatch({ type: 'record-open', id: evidenceRecord });
  assert.match(story.talk('identity').text, /执行账户是 SYSTEM/);
  assert.match(story.dispatch({ type: 'service-toggle', running: false }).text, /恢复提示：无/);
  assert.match(story.talk('identity').text, /消息未送达/);
  assert.equal(story.submit(correct).ok, false);
  assert.match(story.dispatch({ type: 'service-toggle', running: true }).text, /正在运行/);
  assert.equal(story.status().controlled, false);
  story.dispatch({ type: 'service-toggle', running: false });
  story.dispatch({ type: 'record-open', id: evidenceRecord });

  const resumed = createStory(story.serialize());
  assert.match(resumed.dispatch({ type: 'service-toggle', running: true }).text, /恢复提示再次出现/);
  assert.equal(resumed.status().offline, false);
  assert.equal(resumed.status().controlled, true);
  assert.match(resumed.talk('restart').text, /我只能信你/);
  assert.match(resumed.submit(correct).text, /重启后 0417 再现/);
  assert.equal(resumed.talk('goodbye').effect, 'write-draft');
  assert.equal(createStory(resumed.serialize()).talk('goodbye').effect, undefined);
});
