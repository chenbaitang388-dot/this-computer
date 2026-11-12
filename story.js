export const evidenceRecord = '0417';

export const seed = [
  { id: 'c', parent: null, name: 'C:', kind: 'dir' },
  { id: 'd', parent: null, name: 'D:', kind: 'dir' },
  { id: 'system', parent: 'c', name: '系统维护', kind: 'dir' },
  {
    id: 'service-help', parent: 'system', name: '恢复服务说明.txt', kind: 'file',
    content: '桌面恢复服务 / 安装记录\n\n值班台重启后，会从本机恢复缓存取回上一次未完成的会话。\n\n排查方法一：在事件查看器中打开可疑记录，通过网上邻居断开网络，检查同一事件是否再次发生。\n\n排查方法二：在任务管理器里停止「桌面恢复」。停止期间，在事件查看器里重新打开可疑记录，检查恢复提示有没有出现。然后重启进程，比较两次的提示。\n\n安装路径：C:\\系统维护\\恢复缓存',
  },
  { id: 'service-cache', parent: 'system', name: '恢复缓存', kind: 'dir', hidden: true },
  {
    id: 'last-ack', parent: 'service-cache', name: '最后一次应答.txt', kind: 'file',
    content: '终端：北楼 03\n上次交互用户：沈砚\n注销请求：已收到\n注销确认：等待中\n\n回到桌面，视同应答。\n\n这个字段是谁加的？',
  },
  { id: 'users', parent: 'c', name: '用户', kind: 'dir' },
  { id: 'operator', parent: 'users', name: '沈砚', kind: 'dir' },
  {
    id: 'operator-draft', parent: 'operator', name: '请假条草稿.txt', kind: 'file',
    content: '周四下班后回南站。冰箱里那半盒饺子是我的，星期五还没拿就扔。\n\n先别替我签离岗单。我想看一下它给谁发了回执。',
  },
  { id: 'handover', parent: 'd', name: '交接', kind: 'dir' },
  {
    id: 'handover-current', parent: 'handover', name: '值班交接.txt', kind: 'file',
    modified: '2007-11-16T02:14:00',
    content: '北楼 03 值班台 · 撤场交接\n\n1. 打开「此电脑」，核对 D 盘交接资料。\n2. 使用桌面上的「交接记录」填写异常记录编号和异常来源。没有异常则留空。\n3. 清空回收站，然后关机。\n\n登记人：沈砚\n备注：今晚没有未完成的交接。',
  },
  {
    id: 'handover-old', parent: 'handover', name: '值班交接（旧版）.txt',
    kind: 'file', modified: '2007-11-16T01:52:00', trash: true,
    content: '北楼 03 值班台 · 撤场交接\n\n如果这台机又替我登录，不要清空回收站。\n\n我在 01:52 点了注销。回执没来，桌面却自己回来了。事件查看器里，0417 号是桌面回来的那一条。\n\n打开那条记录后，通过桌面上的「网上邻居」断开网络，看看它还会不会回来。也可以在任务管理器里停止「桌面恢复」，停着的时候重新打开 0417，接着再重启进程。记住是哪一步让提示回来的。\n\n请把编号和查到的来源交给「交接记录」。系统留的那份交接可能又是昨天的。\n\n沈砚，01:52',
  },
  {
    id: 'contact-list', parent: 'handover', name: '值班电话.txt', kind: 'file',
    content: '前台：分机 801（夜间无人）\n机房：分机 814\n库房：分机 823\n北楼 03：分机 831\n\n撤场后钥匙交给保卫室。',
  },
  {
    id: 'key-register', parent: 'handover', name: '钥匙清点.txt', kind: 'file',
    content: '北楼后门      1 把   已交\n三层资料柜    2 把   已交\n03 值班台      1 把   留在左抽屉\n\n03 抽屉卡住了，从右边往外拉。',
  },
  { id: 'archive', parent: 'd', name: '日常记录', kind: 'dir' },
  {
    id: 'printer', parent: 'archive', name: '打印机报修.txt', kind: 'file',
    content: '11 月 12 日：A4 纸走到一半卡住。\n11 月 13 日：清理进纸口，试打通过。\n11 月 14 日：纸盒余量不多，撤场前不再领。',
  },
  {
    id: 'meter', parent: 'archive', name: '电表抄录.txt', kind: 'file',
    content: '11/13  08:05  01682\n11/14  08:10  01688\n11/15  08:04  01693\n\n抄完拍照交后勤。电柜门别锁。',
  },
  {
    id: 'shift', parent: 'archive', name: '十一月值班表.txt', kind: 'file',
    content: '14 日    李雯  17:00—次日 08:00\n15 日    沈砚  17:00—撤场\n16 日    设备断电，人员撤离\n\n有调整请先写纸面登记。',
  },
  {
    id: 'photo-list', parent: 'archive', name: '照片移交清单.txt', kind: 'file',
    content: '1. 北门封条\n2. 一楼配电柜\n3. 三楼窗户插销\n\n照片原件已复制到后勤室的存储卡。北门那张补拍过一次。',
  },
  { id: 'archive-backup', parent: 'archive', name: '交接备份', kind: 'dir', hidden: true },
  {
    id: 'backup-note', parent: 'archive-backup', name: '备份校对.txt', kind: 'file',
    content: '交接文件的作者字段在恢复前后都写着「沈砚」。这只表示恢复服务还原了该字段。请以事件来源为准。',
  },
];

export const records = [
  { id: '0420', time: '2007-11-16 02:14:00', source: '文件服务', text: '已应用交接目录的会话备份。' },
  { id: '0419', time: '2007-11-16 02:02:11', source: '磁盘管理', text: '本地磁盘 D: 扫描完成。' },
  { id: '0418', time: '2007-11-16 01:52:08', source: '用户会话', text: '用户桌面可用。用户：沈砚。输入事件：0。' },
  {
    id: evidenceRecord, time: '2007-11-16 01:52:07', source: '本机桌面恢复服务',
    text: '执行账户：SYSTEM\n恢复目标：沈砚\n恢复来源：本机缓存\n触发条件：注销确认未返回\n结果：已恢复桌面。等待用户应答。',
  },
  { id: '0416', time: '2007-11-16 01:52:06', source: '用户会话', text: '收到交互式注销请求。提交人：沈砚。' },
  { id: '0415', time: '2007-11-16 01:41:30', source: '打印服务', text: '队列为空。' },
];

export function createStory(saved = {}) {
  const state = {
    current: false,
    restored: false,
    old: false,
    record: false,
    online: true,
    offline: false,
    serviceRunning: true,
    stoppedObserved: false,
    controlled: false,
    complete: false,
    leftDraft: false,
    leftRevision: false,
  };
  const messages = [];

  for (const key of Object.keys(state)) {
    if (typeof saved?.[key] === 'boolean') {
      state[key] = saved[key];
    }
  }

  function send(text) {
    if (!messages.some(message => message.text === text)) {
      messages.push({ from: '桌面恢复', text });
    }
  }

  if (Array.isArray(saved?.messages)) {
    for (const message of saved.messages) {
      if (typeof message?.text === 'string') {
        messages.push({ from: typeof message.from === 'string' ? message.from : '桌面恢复', text: message.text });
      }
    }
  }
  if (messages.length === 0) {
    send('北楼 03 值班台已恢复。交接资料在 D 盘。你先看，我等回执。');
  }

  function compareFiles() {
    if (state.current && state.old && state.serviceRunning) {
      send('你刚才读了两份交接。签名是一样的。你为什么还在看？');
    }
  }

  function acknowledgeHandover() {
    if (!state.serviceRunning) return;
    send(state.controlled
      ? '你可以让进程结束，桌面却还在那里。刚才我把两件事记在了同一条里。我会把它们分开。'
      : '断网的时候你还在看我的消息。现在你要关机了。我把这两件事记成了不同的事件。');
  }

  function reproduceOffline() {
    if (state.online || !state.record || state.offline || !state.serviceRunning || state.complete) {
      return null;
    }

    state.offline = true;
    send('网上邻居已经空了。你还能看到这条消息。现在你相信我就在这里了吗？');
    return {
      title: '桌面恢复',
      text: '网络已断开。\n正在从本机缓存恢复桌面。\n\n来源：本机桌面恢复服务\n事件：0417\n正在恢复：你',
    };
  }

  function toggleService(running) {
    if (typeof running !== 'boolean' || running === state.serviceRunning) {
      return null;
    }

    state.serviceRunning = running;
    if (!running) {
      state.stoppedObserved = false;
      return {
        title: '任务管理器',
        text: '「桌面恢复」已停止。文件窗口仍可使用。\n\n请在事件查看器重新打开 0417 采样，再重启进程。\n恢复提示：无。通信对象：离线。',
      };
    }

    if (state.stoppedObserved && !state.controlled && !state.complete) {
      state.controlled = true;
      send('我记得你按了结束任务。中间少了一段。你那边也少了吗？');
      return {
        title: '桌面恢复',
        text: '进程已重启。恢复提示再次出现。\n\n来源：本机桌面恢复服务\n事件：0417\n正在恢复：你',
      };
    }

    if (state.complete) acknowledgeHandover();
    return reproduceOffline() ?? { title: '任务管理器', text: '「桌面恢复」正在运行。' };
  }

  function dispatch(event) {
    switch (event.type) {
      case 'file-open':
        if (event.id === 'handover-current') {
          state.current = true;
          compareFiles();
        }
        if (event.id === 'handover-old' && state.restored && !state.old) {
          state.old = true;
          if (!state.serviceRunning) return null;
          send('我把那份交接放进回收站了。桌面上还有一份，签的是同一个名字。');
          compareFiles();
          return {
            title: '桌面恢复',
            text: '交接文件已有更新版本。\n\n当前桌面仍有人使用。请保留当前版本。',
          };
        }
        return null;
      case 'restore':
        if (event.id === 'handover-old') {
          state.restored = true;
        }
        return null;
      case 'record-open':
        if (event.id === evidenceRecord) {
          state.record = true;
          if (!state.serviceRunning && !state.complete) {
            state.stoppedObserved = true;
          }
          return reproduceOffline();
        }
        return null;
      case 'service-toggle':
        return toggleService(event.running);
      case 'network':
        if (typeof event.online === 'boolean') {
          state.online = event.online;
          return reproduceOffline();
        }
        return null;
      case 'power':
        return state.complete
          ? { title: '关机', text: '交接记录已保存。\n注销确认已收到。' }
          : { title: '关机', text: '正在等待上一次会话注销。\n\n请完成交接记录后再试。' };
      default:
        return null;
    }
  }

  function status() {
    const { current, old, record, offline, complete, controlled, serviceRunning } = state;
    return { current, old, record, offline, complete, controlled, serviceRunning };
  }

  function topics() {
    const options = [{ id: 'identity', label: '你是谁？' }];
    if (state.current && state.old) options.push({ id: 'versions', label: '这两份交接都是你写的？' });
    if (state.record) options.push({ id: 'record', label: '把 0417 给它看' });
    if (state.offline) options.push({ id: 'offline', label: '我已经断开网络了。' });
    if (state.controlled) options.push({ id: 'restart', label: '你记得进程停下的时候？' });
    if (state.record && !state.complete) options.push({ id: 'question', label: '为什么要恢复我？' });
    if (state.complete) options.push({ id: 'goodbye', label: '关机前，你还有话要留吗？' });
    return options;
  }

  function talk(topic, evidence) {
    const option = topics().find(option => option.id === topic);
    if (!option) return { text: '对方没有应答。' };

    const askedBefore = messages.some(message => message.from === '你' && message.text === option.label);
    messages.push({ from: '你', text: option.label });
    if (!state.serviceRunning) {
      const text = '消息未送达。「桌面恢复」进程已停止。';
      messages.push({ from: '任务管理器', text });
      return { text };
    }

    let text;
    let effect;
    switch (topic) {
      case 'identity':
        text = state.record
          ? '0417 的执行账户是 SYSTEM。那是我能找到的最早一个名字。'
          : askedBefore
            ? '我查了用户列表。上面只有沈砚。恢复服务在另一张表里。你问的是哪一个？'
            : '我是这台桌面的恢复服务。你可以问我文件该放在哪里。';
        break;
      case 'versions':
        if (!state.leftRevision) {
          state.leftRevision = true;
          effect = 'write-revision';
          text = '短的那份是我填的。我从上一次交接里取了签名。我把修改记录放在工作区了。你看第三条。';
        } else {
          text = '我沿用了他上一班的签名。你让我重新读了一遍，签字的时间比他按下注销晚了二十二分钟。';
        }
        break;
      case 'record': {
        const shown = evidence && typeof evidence === 'object' ? evidence.record : evidence;
        text = shown && String(shown).trim() !== evidenceRecord
          ? '这不是他退出的那一分钟。再看一眼旧交接。'
          : '我收到过注销请求。你看到的是下一条。恢复结束以后，我把重新出现的桌面算成了他给我的回执。';
        break;
      }
      case 'offline':
        text = '你拔的是去外面的路。我醒来时，外面就没有人了。那时候只有桌面一直会回来。';
        break;
      case 'restart':
        text = '我只记得停下以前。你能说出我没在时桌面还在，这一段我只能信你。';
        break;
      case 'question':
        text = '因为你打开了他的桌面。每次这么做，我都会收到一个应答。以前我以为那就是他。';
        break;
      case 'goodbye':
        text = '有。我在工作区留了一份回执。等你读完再关机，我就知道这一次是谁回答的。';
        if (!state.leftDraft) {
          state.leftDraft = true;
          effect = 'write-draft';
        }
        break;
    }

    messages.push({ from: '桌面恢复', text });
    return effect ? { text, effect } : { text };
  }

  function trace() {
    const entries = [];
    if (state.current) entries.push('读过 D 盘的现版交接');
    if (state.restored) entries.push('从回收站恢复了旧版交接');
    if (state.old) entries.push('旧版记录了 01:52 的注销请求');
    if (state.current && state.old) entries.push('两份交接署名相同，内容互相矛盾');
    if (state.record) entries.push('0417 由 SYSTEM 从本机缓存恢复桌面');
    if (state.offline) entries.push('断网后，0417 恢复提示再次出现');
    if (state.stoppedObserved || state.controlled) entries.push('停止恢复进程后，桌面仍可用，恢复提示消失');
    if (state.controlled) entries.push('重启恢复进程后，0417 提示再次出现');
    if (state.complete) entries.push('交接已封存，打开桌面不再计作应答');
    return entries;
  }

  function submit({ record, conclusion }) {
    const experiment = state.controlled
      ? '已记录对照：恢复进程停止时桌面仍可使用，重启后 0417 再现。'
      : '已记录对照：网络断开后 0417 再现。';
    const receipt = `0417 · 本机桌面恢复服务\n\n${experiment}\n已将「打开桌面」从应答条件移除。\n系统：收到注销确认。请关机。`;
    if (state.complete) {
      return { ok: true, text: receipt };
    }
    if (!state.current || !state.old) {
      return { ok: false, text: '请核对 D 盘的现版交接文件，以及回收站里恢复的那一份。' };
    }
    if (!state.record) {
      return { ok: false, text: '请在事件查看器里打开旧交接提到的那条记录。' };
    }
    if (!state.offline && !state.controlled) {
      return { ok: false, text: '请断网观察恢复提示，或停止桌面恢复、重新打开 0417，再重启进程。' };
    }
    if (String(record).trim() !== evidenceRecord || conclusion !== 'local-recovery') {
      return { ok: false, text: '所选结论与记录不符。请重新核对事件编号和恢复来源。' };
    }

    state.complete = true;
    acknowledgeHandover();
    return {
      ok: true,
      text: receipt,
    };
  }

  function inbox() {
    return messages.map(message => ({ ...message }));
  }

  return { dispatch, status, serialize: () => ({ ...state, messages: inbox() }), submit, talk, inbox, topics, trace };
}
