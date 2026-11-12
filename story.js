export const evidenceRecord = '0417';

export const seed = [
  { id: 'c', parent: null, name: 'C:', kind: 'dir' },
  { id: 'd', parent: null, name: 'D:', kind: 'dir' },
  { id: 'system', parent: 'c', name: '系统维护', kind: 'dir' },
  {
    id: 'service-help', parent: 'system', name: '恢复服务说明.txt', kind: 'file',
    content: '桌面恢复服务 / 安装记录\n\n值班台重启后，会从本机恢复缓存取回上一次未完成的会话。\n\n排查方法：记录来源和编号后断开网络，检查同一事件是否再次发生。若提示仍出现，请查看该提示内的来源和编号。\n\n安装路径：C:\\系统维护\\恢复缓存',
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
    content: '北楼 03 值班台 · 撤场交接\n\n如果这台机又替我登录，不要清空回收站。\n\n我在 01:52 点了注销。回执没来，桌面却自己回来了。事件查看器里，0417 号是桌面回来的那一条。先把这条打开，再通过桌面上的「网上邻居」断开网络，看看它还会不会回来。\n\n请把编号和查到的来源交给「交接记录」。系统留的那份交接可能又是昨天的。\n\n沈砚，01:52',
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
    complete: false,
  };

  for (const key of Object.keys(state)) {
    if (typeof saved?.[key] === 'boolean') {
      state[key] = saved[key];
    }
  }

  function reproduceOffline() {
    if (state.online || !state.record || state.offline) {
      return null;
    }

    state.offline = true;
    return {
      title: '桌面恢复',
      text: '网络已断开。\n正在从本机缓存恢复桌面。\n\n来源：本机桌面恢复服务\n事件：0417\n正在恢复：你',
    };
  }

  function dispatch(event) {
    switch (event.type) {
      case 'file-open':
        if (event.id === 'handover-current') {
          state.current = true;
        }
        if (event.id === 'handover-old' && state.restored && !state.old) {
          state.old = true;
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
          return reproduceOffline();
        }
        return null;
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
    const { current, old, record, offline, complete } = state;
    return { current, old, record, offline, complete };
  }

  function submit({ record, conclusion }) {
    const receipt = '0417 · 本机桌面恢复服务\n\n已将「打开桌面」从应答条件移除。\n系统：收到注销确认。请关机。';
    if (state.complete) {
      return { ok: true, text: receipt };
    }
    if (!state.current || !state.old) {
      return { ok: false, text: '请核对 D 盘的现版交接文件，以及回收站里恢复的那一份。' };
    }
    if (!state.record) {
      return { ok: false, text: '请在事件查看器里打开旧交接提到的那条记录。' };
    }
    if (!state.offline) {
      return { ok: false, text: '请断开网络，确认同一条恢复提示还会出现。' };
    }
    if (String(record).trim() !== evidenceRecord || conclusion !== 'local-recovery') {
      return { ok: false, text: '所选结论与记录不符。请重新核对事件编号和恢复来源。' };
    }

    state.complete = true;
    return {
      ok: true,
      text: receipt,
    };
  }

  return { dispatch, status, serialize: () => ({ ...state }), submit };
}
