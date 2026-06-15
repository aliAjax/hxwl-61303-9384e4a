import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  EVENT_TYPES,
  replayEvents,
  EventStore,
  rebuildFromEventStore,
} from './eventStore';

function makeEvent(type, payload, overrides = {}) {
  return {
    id: 'evt_' + Math.random().toString(36).slice(2, 10),
    type,
    aggregateType: 'RECORD',
    aggregateId: payload.recordId || 'rec-1',
    timestamp: new Date().toISOString(),
    deviceId: 'dev-test',
    actor: 'test',
    causalId: null,
    payload,
    ...overrides,
  };
}

const baseState = () => ({
  records: [],
  routePlans: {},
  reminderSettings: {},
  riskRules: {},
  autoPlanConfig: {},
});

describe('replayEvents', () => {
  it('空事件列表返回初始状态', () => {
    const result = replayEvents([]);
    expect(result.records).toEqual([]);
    expect(result.routePlans).toEqual({});
  });

  it('传入 baseState 时深拷贝不影响原始', () => {
    const bs = baseState();
    const result = replayEvents([], bs);
    result.records.push({ id: 'x' });
    expect(bs.records).toEqual([]);
  });
});

describe('RECORD_CREATE / RECORD_DUPLICATE', () => {
  it('创建单条记录', () => {
    const record = { id: 'r1', elevatorNo: 'E-001', status: 'pending' };
    const events = [makeEvent(EVENT_TYPES.RECORD_CREATE, { record }, { aggregateId: 'r1' })];
    const result = replayEvents(events);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].id).toBe('r1');
    expect(result.records[0].elevatorNo).toBe('E-001');
  });

  it('重复创建同一 id 的记录幂等——不追加', () => {
    const record = { id: 'r1', elevatorNo: 'E-001' };
    const events = [
      makeEvent(EVENT_TYPES.RECORD_CREATE, { record }, { aggregateId: 'r1' }),
      makeEvent(EVENT_TYPES.RECORD_CREATE, { record }, { aggregateId: 'r1' }),
    ];
    const result = replayEvents(events);
    expect(result.records).toHaveLength(1);
  });

  it('RECORD_DUPLICATE 行为与 RECORD_CREATE 一致', () => {
    const record = { id: 'r2', elevatorNo: 'E-002' };
    const events = [makeEvent(EVENT_TYPES.RECORD_DUPLICATE, { record }, { aggregateId: 'r2' })];
    const result = replayEvents(events);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].id).toBe('r2');
  });

  it('payload.record 缺失时不改变 state', () => {
    const events = [makeEvent(EVENT_TYPES.RECORD_CREATE, {})];
    const result = replayEvents(events);
    expect(result.records).toEqual([]);
  });
});

describe('RECORD_UPDATE', () => {
  it('更新已有记录的字段', () => {
    const record = { id: 'r1', elevatorNo: 'E-001', status: 'pending' };
    const events = [
      makeEvent(EVENT_TYPES.RECORD_CREATE, { record }, { aggregateId: 'r1' }),
      makeEvent(EVENT_TYPES.RECORD_UPDATE, { recordId: 'r1', changes: { status: 'done', note: 'ok' } }, { aggregateId: 'r1' }),
    ];
    const result = replayEvents(events);
    expect(result.records[0].status).toBe('done');
    expect(result.records[0].note).toBe('ok');
    expect(result.records[0].elevatorNo).toBe('E-001');
  });

  it('changes 中无 updatedAt 时自动填充事件时间戳', () => {
    const record = { id: 'r1', elevatorNo: 'E-001' };
    const updateEvent = makeEvent(EVENT_TYPES.RECORD_UPDATE, { recordId: 'r1', changes: { status: 'done' } }, { aggregateId: 'r1', timestamp: '2026-06-15T10:00:00.000Z' });
    const events = [
      makeEvent(EVENT_TYPES.RECORD_CREATE, { record }, { aggregateId: 'r1' }),
      updateEvent,
    ];
    const result = replayEvents(events);
    expect(result.records[0].updatedAt).toBe('2026-06-15T10:00:00.000Z');
  });

  it('changes 中含 updatedAt 时保留传入值', () => {
    const record = { id: 'r1', elevatorNo: 'E-001' };
    const events = [
      makeEvent(EVENT_TYPES.RECORD_CREATE, { record }, { aggregateId: 'r1' }),
      makeEvent(EVENT_TYPES.RECORD_UPDATE, { recordId: 'r1', changes: { status: 'done', updatedAt: 'custom-ts' } }, { aggregateId: 'r1' }),
    ];
    const result = replayEvents(events);
    expect(result.records[0].updatedAt).toBe('custom-ts');
  });

  it('更新不存在的 recordId 时无副作用', () => {
    const events = [
      makeEvent(EVENT_TYPES.RECORD_UPDATE, { recordId: 'nonexist', changes: { status: 'x' } }),
    ];
    const result = replayEvents(events);
    expect(result.records).toEqual([]);
  });
});

describe('RECORD_DELETE', () => {
  it('删除已有记录', () => {
    const record = { id: 'r1', elevatorNo: 'E-001' };
    const events = [
      makeEvent(EVENT_TYPES.RECORD_CREATE, { record }, { aggregateId: 'r1' }),
      makeEvent(EVENT_TYPES.RECORD_DELETE, { recordId: 'r1' }, { aggregateId: 'r1' }),
    ];
    const result = replayEvents(events);
    expect(result.records).toHaveLength(0);
  });

  it('删除不存在的 recordId 无副作用', () => {
    const events = [
      makeEvent(EVENT_TYPES.RECORD_DELETE, { recordId: 'ghost' }),
    ];
    const result = replayEvents(events);
    expect(result.records).toEqual([]);
  });
});

describe('STATUS_TRANSITION', () => {
  it('状态流转并追加 timeline 条目', () => {
    const record = { id: 'r1', elevatorNo: 'E-001', status: 'pending', timeline: [] };
    const tl = { status: 'in_progress', by: '张三', at: '2026-06-15', note: '开始' };
    const events = [
      makeEvent(EVENT_TYPES.RECORD_CREATE, { record }, { aggregateId: 'r1' }),
      makeEvent(EVENT_TYPES.STATUS_TRANSITION, { recordId: 'r1', status: 'in_progress', timelineEntry: tl }, { aggregateId: 'r1', timestamp: '2026-06-15T08:00:00.000Z' }),
    ];
    const result = replayEvents(events);
    expect(result.records[0].status).toBe('in_progress');
    expect(result.records[0].timeline).toHaveLength(1);
    expect(result.records[0].timeline[0]).toEqual(tl);
    expect(result.records[0].updatedAt).toBe('2026-06-15T08:00:00.000Z');
  });

  it('多次状态流转依次追加 timeline', () => {
    const record = { id: 'r1', status: 'pending', timeline: [] };
    const events = [
      makeEvent(EVENT_TYPES.RECORD_CREATE, { record }, { aggregateId: 'r1' }),
      makeEvent(EVENT_TYPES.STATUS_TRANSITION, { recordId: 'r1', status: 's1', timelineEntry: { status: 's1' } }, { aggregateId: 'r1' }),
      makeEvent(EVENT_TYPES.STATUS_TRANSITION, { recordId: 'r1', status: 's2', timelineEntry: { status: 's2' } }, { aggregateId: 'r1' }),
    ];
    const result = replayEvents(events);
    expect(result.records[0].status).toBe('s2');
    expect(result.records[0].timeline).toHaveLength(2);
  });
});

describe('BACKFILL_COMPLETE / BACKFILL_WITH_NEXT_CYCLE', () => {
  it('BACKFILL_COMPLETE 回填状态、nextDate、timeline', () => {
    const record = { id: 'r1', status: 'overdue', nextDate: '2026-05-01', timeline: [] };
    const tlEntries = [{ status: 'completed', by: '系统', at: '2026-06-15' }];
    const events = [
      makeEvent(EVENT_TYPES.RECORD_CREATE, { record }, { aggregateId: 'r1' }),
      makeEvent(EVENT_TYPES.BACKFILL_COMPLETE, { recordId: 'r1', finalStatus: 'completed', finalNextDate: null, timelineEntries: tlEntries }, { aggregateId: 'r1', timestamp: '2026-06-15T09:00:00.000Z' }),
    ];
    const result = replayEvents(events);
    expect(result.records[0].status).toBe('completed');
    expect(result.records[0].nextDate).toBeNull();
    expect(result.records[0].timeline).toHaveLength(1);
  });

  it('BACKFILL_WITH_NEXT_CYCLE 回填并设置下一个周期日期', () => {
    const record = { id: 'r1', status: 'overdue', nextDate: '2026-05-01', timeline: [] };
    const tlEntries = [{ status: 'completed', by: '系统', at: '2026-06-15' }];
    const events = [
      makeEvent(EVENT_TYPES.RECORD_CREATE, { record }, { aggregateId: 'r1' }),
      makeEvent(EVENT_TYPES.BACKFILL_WITH_NEXT_CYCLE, { recordId: 'r1', finalStatus: 'pending', finalNextDate: '2026-07-15', timelineEntries: tlEntries }, { aggregateId: 'r1', timestamp: '2026-06-15T09:00:00.000Z' }),
    ];
    const result = replayEvents(events);
    expect(result.records[0].status).toBe('pending');
    expect(result.records[0].nextDate).toBe('2026-07-15');
  });

  it('维保回填追加多条 timeline', () => {
    const record = { id: 'r1', status: 'overdue', timeline: [] };
    const tlEntries = [
      { status: 'completed', by: '系统', at: '2026-06-15' },
      { status: 'pending', by: '系统', at: '2026-06-15' },
    ];
    const events = [
      makeEvent(EVENT_TYPES.RECORD_CREATE, { record }, { aggregateId: 'r1' }),
      makeEvent(EVENT_TYPES.BACKFILL_COMPLETE, { recordId: 'r1', finalStatus: 'pending', finalNextDate: '2026-07-15', timelineEntries: tlEntries }, { aggregateId: 'r1' }),
    ];
    const result = replayEvents(events);
    expect(result.records[0].timeline).toHaveLength(2);
  });
});

describe('路线设备增删排序', () => {
  const date = '2026-06-20';

  function routePlanEvent(type, payload) {
    return makeEvent(type, { date, ...payload }, { aggregateType: 'ROUTE_PLAN', aggregateId: date });
  }

  it('ROUTE_CREATE 创建路线', () => {
    const route = { id: 'route-1', estate: 'A小区', deviceIds: ['d1', 'd2'] };
    const events = [
      routePlanEvent(EVENT_TYPES.ROUTE_CREATE, { routePlansPatch: { routesToAdd: [route] } }),
    ];
    const result = replayEvents(events);
    expect(result.routePlans[date].routes).toHaveLength(1);
    expect(result.routePlans[date].routes[0].id).toBe('route-1');
  });

  it('ROUTE_PLAN_CREATE 行为与 ROUTE_CREATE 一致', () => {
    const route = { id: 'route-2', estate: 'B小区', deviceIds: [] };
    const events = [
      routePlanEvent(EVENT_TYPES.ROUTE_PLAN_CREATE, { routePlansPatch: { routesToAdd: [route] } }),
    ];
    const result = replayEvents(events);
    expect(result.routePlans[date].routes).toHaveLength(1);
    expect(result.routePlans[date].routes[0].estate).toBe('B小区');
  });

  it('ROUTE_ADD_DEVICE 添加设备到路线', () => {
    const route = { id: 'route-1', estate: 'A小区', deviceIds: ['d1'] };
    const events = [
      routePlanEvent(EVENT_TYPES.ROUTE_CREATE, { routePlansPatch: { routesToAdd: [route] } }),
      routePlanEvent(EVENT_TYPES.ROUTE_ADD_DEVICE, { routeId: 'route-1', deviceId: 'd2' }),
    ];
    const result = replayEvents(events);
    expect(result.routePlans[date].routes[0].deviceIds).toEqual(['d1', 'd2']);
  });

  it('ROUTE_ADD_DEVICE 重复添加同一 deviceId 幂等', () => {
    const route = { id: 'route-1', estate: 'A小区', deviceIds: ['d1'] };
    const events = [
      routePlanEvent(EVENT_TYPES.ROUTE_CREATE, { routePlansPatch: { routesToAdd: [route] } }),
      routePlanEvent(EVENT_TYPES.ROUTE_ADD_DEVICE, { routeId: 'route-1', deviceId: 'd1' }),
    ];
    const result = replayEvents(events);
    expect(result.routePlans[date].routes[0].deviceIds).toEqual(['d1']);
  });

  it('ROUTE_REMOVE_DEVICE 从路线移除设备', () => {
    const route = { id: 'route-1', estate: 'A小区', deviceIds: ['d1', 'd2', 'd3'] };
    const events = [
      routePlanEvent(EVENT_TYPES.ROUTE_CREATE, { routePlansPatch: { routesToAdd: [route] } }),
      routePlanEvent(EVENT_TYPES.ROUTE_REMOVE_DEVICE, { routeId: 'route-1', deviceId: 'd2' }),
    ];
    const result = replayEvents(events);
    expect(result.routePlans[date].routes[0].deviceIds).toEqual(['d1', 'd3']);
  });

  it('ROUTE_REORDER_DEVICE 交换设备顺序', () => {
    const route = { id: 'route-1', estate: 'A小区', deviceIds: ['d1', 'd2', 'd3'] };
    const events = [
      routePlanEvent(EVENT_TYPES.ROUTE_CREATE, { routePlansPatch: { routesToAdd: [route] } }),
      routePlanEvent(EVENT_TYPES.ROUTE_REORDER_DEVICE, { routeId: 'route-1', fromIndex: 0, toIndex: 2 }),
    ];
    const result = replayEvents(events);
    expect(result.routePlans[date].routes[0].deviceIds).toEqual(['d3', 'd2', 'd1']);
  });

  it('ROUTE_REORDER_DEVICE 越界索引不改变顺序', () => {
    const route = { id: 'route-1', estate: 'A小区', deviceIds: ['d1', 'd2'] };
    const events = [
      routePlanEvent(EVENT_TYPES.ROUTE_CREATE, { routePlansPatch: { routesToAdd: [route] } }),
      routePlanEvent(EVENT_TYPES.ROUTE_REORDER_DEVICE, { routeId: 'route-1', fromIndex: -1, toIndex: 5 }),
    ];
    const result = replayEvents(events);
    expect(result.routePlans[date].routes[0].deviceIds).toEqual(['d1', 'd2']);
  });

  it('ROUTE_RENAME 重命名路线', () => {
    const route = { id: 'route-1', estate: '旧名', deviceIds: [] };
    const events = [
      routePlanEvent(EVENT_TYPES.ROUTE_CREATE, { routePlansPatch: { routesToAdd: [route] } }),
      routePlanEvent(EVENT_TYPES.ROUTE_RENAME, { routeId: 'route-1', newName: '新名' }),
    ];
    const result = replayEvents(events);
    expect(result.routePlans[date].routes[0].estate).toBe('新名');
  });

  it('ROUTE_DELETE 按 routeId 删除路线', () => {
    const r1 = { id: 'route-1', estate: 'A', deviceIds: [] };
    const r2 = { id: 'route-2', estate: 'B', deviceIds: [] };
    const events = [
      routePlanEvent(EVENT_TYPES.ROUTE_CREATE, { routePlansPatch: { routesToAdd: [r1, r2] } }),
      routePlanEvent(EVENT_TYPES.ROUTE_DELETE, { routeId: 'route-1' }),
    ];
    const result = replayEvents(events);
    expect(result.routePlans[date].routes).toHaveLength(1);
    expect(result.routePlans[date].routes[0].id).toBe('route-2');
  });

  it('ROUTE_DELETE 按 routeIdsToRemove 批量删除', () => {
    const r1 = { id: 'route-1', estate: 'A', deviceIds: [] };
    const r2 = { id: 'route-2', estate: 'B', deviceIds: [] };
    const r3 = { id: 'route-3', estate: 'C', deviceIds: [] };
    const events = [
      routePlanEvent(EVENT_TYPES.ROUTE_CREATE, { routePlansPatch: { routesToAdd: [r1, r2, r3] } }),
      routePlanEvent(EVENT_TYPES.ROUTE_DELETE, { routePlansPatch: { routeIdsToRemove: ['route-1', 'route-3'] } }),
    ];
    const result = replayEvents(events);
    expect(result.routePlans[date].routes).toHaveLength(1);
    expect(result.routePlans[date].routes[0].id).toBe('route-2');
  });

  it('ROUTE_PLAN_SAVE replaceAll 完全替换路线', () => {
    const r1 = { id: 'route-1', estate: 'A', deviceIds: [] };
    const r2 = { id: 'route-2', estate: 'B', deviceIds: [] };
    const events = [
      routePlanEvent(EVENT_TYPES.ROUTE_CREATE, { routePlansPatch: { routesToAdd: [r1] } }),
      routePlanEvent(EVENT_TYPES.ROUTE_PLAN_SAVE, { routePlansPatch: { replaceAll: { routes: [r2] } } }),
    ];
    const result = replayEvents(events);
    expect(result.routePlans[date].routes).toHaveLength(1);
    expect(result.routePlans[date].routes[0].id).toBe('route-2');
  });

  it('不同日期的路线互不干扰', () => {
    const dateA = '2026-06-20';
    const dateB = '2026-06-21';
    const events = [
      makeEvent(EVENT_TYPES.ROUTE_CREATE, { date: dateA, routePlansPatch: { routesToAdd: [{ id: 'r1', estate: 'A', deviceIds: [] }] } }, { aggregateType: 'ROUTE_PLAN', aggregateId: dateA }),
      makeEvent(EVENT_TYPES.ROUTE_CREATE, { date: dateB, routePlansPatch: { routesToAdd: [{ id: 'r2', estate: 'B', deviceIds: [] }] } }, { aggregateType: 'ROUTE_PLAN', aggregateId: dateB }),
    ];
    const result = replayEvents(events);
    expect(result.routePlans[dateA].routes[0].id).toBe('r1');
    expect(result.routePlans[dateB].routes[0].id).toBe('r2');
  });
});

describe('AUTO_PLAN_CONFIRM', () => {
  it('确认自动计划：更新记录并写入 routePlans', () => {
    const record = { id: 'r1', elevatorNo: 'E-001', status: 'pending', timeline: [] };
    const date = '2026-06-20';

    const events = [
      makeEvent(EVENT_TYPES.RECORD_CREATE, { record }, { aggregateId: 'r1' }),
      makeEvent(EVENT_TYPES.AUTO_PLAN_CONFIRM, {
        recordUpdates: [
          { recordId: 'r1', changes: { status: 'scheduled', nextDate: '2026-07-15' }, timelineEntries: [{ status: 'scheduled', by: '系统', at: '2026-06-20' }] },
        ],
        routePlans: {
          [date]: {
            routes: [{ id: 'route-1', estate: 'A小区', deviceIds: ['dev-1'] }],
          },
        },
      }, { aggregateType: 'AUTO_PLAN', aggregateId: 'auto-1', timestamp: '2026-06-20T10:00:00.000Z' }),
    ];

    const result = replayEvents(events);

    expect(result.records[0].status).toBe('scheduled');
    expect(result.records[0].nextDate).toBe('2026-07-15');
    expect(result.records[0].timeline).toHaveLength(1);
    expect(result.records[0].updatedAt).toBe('2026-06-20T10:00:00.000Z');

    expect(result.routePlans[date]).toBeDefined();
    expect(result.routePlans[date].routes).toHaveLength(1);
    expect(result.routePlans[date].routes[0].estate).toBe('A小区');
    expect(result.routePlans[date].routes[0].deviceIds).toEqual(['dev-1']);
  });

  it('AUTO_PLAN_CONFIRM 合并已有路线的 deviceIds', () => {
    const date = '2026-06-20';
    const record = { id: 'r1', status: 'pending', timeline: [] };

    const events = [
      makeEvent(EVENT_TYPES.RECORD_CREATE, { record }, { aggregateId: 'r1' }),
      makeEvent(EVENT_TYPES.ROUTE_CREATE, { date, routePlansPatch: { routesToAdd: [{ id: 'route-1', estate: 'A小区', deviceIds: ['d1'] }] } }, { aggregateType: 'ROUTE_PLAN', aggregateId: date }),
      makeEvent(EVENT_TYPES.AUTO_PLAN_CONFIRM, {
        recordUpdates: [
          { recordId: 'r1', changes: { status: 'scheduled' } },
        ],
        routePlans: {
          [date]: {
            routes: [{ estate: 'A小区', deviceIds: ['d2'] }],
          },
        },
      }, { aggregateType: 'AUTO_PLAN', aggregateId: 'auto-1' }),
    ];

    const result = replayEvents(events);

    const route = result.routePlans[date].routes.find(r => r.estate === 'A小区');
    expect(route).toBeDefined();
    expect(route.deviceIds).toEqual(['d1', 'd2']);
  });

  it('AUTO_PLAN_CONFIRM 无 recordUpdates 时不变', () => {
    const events = [
      makeEvent(EVENT_TYPES.AUTO_PLAN_CONFIRM, {}),
    ];
    const result = replayEvents(events);
    expect(result.records).toEqual([]);
  });

  it('AUTO_PLAN_CONFIRM 更新不存在的 record 被跳过', () => {
    const events = [
      makeEvent(EVENT_TYPES.AUTO_PLAN_CONFIRM, {
        recordUpdates: [
          { recordId: 'nonexist', changes: { status: 'x' } },
        ],
      }),
    ];
    const result = replayEvents(events);
    expect(result.records).toEqual([]);
  });
});

describe('综合回放场景', () => {
  it('完整生命周期：创建→流转→维保回填→删除', () => {
    const record = { id: 'r1', elevatorNo: 'E-001', status: 'pending', nextDate: '2026-05-01', timeline: [] };
    const events = [
      makeEvent(EVENT_TYPES.RECORD_CREATE, { record }, { aggregateId: 'r1' }),
      makeEvent(EVENT_TYPES.STATUS_TRANSITION, { recordId: 'r1', status: 'in_progress', timelineEntry: { status: 'in_progress' } }, { aggregateId: 'r1' }),
      makeEvent(EVENT_TYPES.BACKFILL_WITH_NEXT_CYCLE, { recordId: 'r1', finalStatus: 'pending', finalNextDate: '2026-07-01', timelineEntries: [{ status: 'completed' }] }, { aggregateId: 'r1' }),
      makeEvent(EVENT_TYPES.RECORD_DELETE, { recordId: 'r1' }, { aggregateId: 'r1' }),
    ];
    const result = replayEvents(events);
    expect(result.records).toHaveLength(0);
  });

  it('多记录多事件交叉回放', () => {
    const events = [
      makeEvent(EVENT_TYPES.RECORD_CREATE, { record: { id: 'r1', status: 'pending', timeline: [] } }, { aggregateId: 'r1' }),
      makeEvent(EVENT_TYPES.RECORD_CREATE, { record: { id: 'r2', status: 'pending', timeline: [] } }, { aggregateId: 'r2' }),
      makeEvent(EVENT_TYPES.RECORD_UPDATE, { recordId: 'r1', changes: { note: '备注' } }, { aggregateId: 'r1' }),
      makeEvent(EVENT_TYPES.STATUS_TRANSITION, { recordId: 'r2', status: 'done', timelineEntry: { status: 'done' } }, { aggregateId: 'r2' }),
    ];
    const result = replayEvents(events);
    expect(result.records).toHaveLength(2);
    const r1 = result.records.find(r => r.id === 'r1');
    const r2 = result.records.find(r => r.id === 'r2');
    expect(r1.note).toBe('备注');
    expect(r2.status).toBe('done');
    expect(r2.timeline).toHaveLength(1);
  });

  it('路线完整操作链：创建→加设备→排序→删设备→删路线', () => {
    const date = '2026-06-25';
    const rPlanEvt = (type, payload) =>
      makeEvent(type, { date, ...payload }, { aggregateType: 'ROUTE_PLAN', aggregateId: date });

    const events = [
      rPlanEvt(EVENT_TYPES.ROUTE_CREATE, { routePlansPatch: { routesToAdd: [{ id: 'route-1', estate: 'A小区', deviceIds: [] }] } }),
      rPlanEvt(EVENT_TYPES.ROUTE_ADD_DEVICE, { routeId: 'route-1', deviceId: 'd1' }),
      rPlanEvt(EVENT_TYPES.ROUTE_ADD_DEVICE, { routeId: 'route-1', deviceId: 'd2' }),
      rPlanEvt(EVENT_TYPES.ROUTE_ADD_DEVICE, { routeId: 'route-1', deviceId: 'd3' }),
      rPlanEvt(EVENT_TYPES.ROUTE_REORDER_DEVICE, { routeId: 'route-1', fromIndex: 0, toIndex: 2 }),
      rPlanEvt(EVENT_TYPES.ROUTE_REMOVE_DEVICE, { routeId: 'route-1', deviceId: 'd1' }),
      rPlanEvt(EVENT_TYPES.ROUTE_DELETE, { routeId: 'route-1' }),
    ];
    const result = replayEvents(events);
    expect(result.routePlans[date].routes).toHaveLength(0);
  });
});

describe('其他事件类型', () => {
  it('SETTINGS_UPDATE 合并设置', () => {
    const events = [
      makeEvent(EVENT_TYPES.SETTINGS_UPDATE, { reminderSettings: { advanceDays: 3 } }, { aggregateType: 'SETTINGS', aggregateId: 'reminder-settings' }),
      makeEvent(EVENT_TYPES.SETTINGS_UPDATE, { riskRules: { highRisk: true } }, { aggregateType: 'SETTINGS', aggregateId: 'risk-rules' }),
    ];
    const result = replayEvents(events);
    expect(result.reminderSettings.advanceDays).toBe(3);
    expect(result.riskRules.highRisk).toBe(true);
  });

  it('BULK_IMPORT 去重导入', () => {
    const record = { id: 'r1', elevatorNo: 'E-001', status: 'pending' };
    const events = [
      makeEvent(EVENT_TYPES.RECORD_CREATE, { record }, { aggregateId: 'r1' }),
      makeEvent(EVENT_TYPES.BULK_IMPORT, { records: [{ id: 'r2', elevatorNo: 'E-002' }, { id: 'r3', elevatorNo: 'E-001' }] }),
    ];
    const result = replayEvents(events);
    expect(result.records).toHaveLength(2);
  });

  it('MERGE_EXECUTE 用 snapshotAfter 覆盖状态', () => {
    const record = { id: 'r1', status: 'pending', timeline: [] };
    const events = [
      makeEvent(EVENT_TYPES.RECORD_CREATE, { record }, { aggregateId: 'r1' }),
      makeEvent(EVENT_TYPES.MERGE_EXECUTE, { snapshotAfter: { records: [{ id: 'r99', status: 'merged' }], routePlans: { '2026-01-01': { routes: [] } } } }, { aggregateType: 'MERGE', aggregateId: 'merge-1' }),
    ];
    const result = replayEvents(events);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].id).toBe('r99');
    expect(result.routePlans['2026-01-01']).toBeDefined();
  });

  it('DATA_RESTORE 从 snapshotState 恢复', () => {
    const events = [
      makeEvent(EVENT_TYPES.DATA_RESTORE, { snapshotState: { records: [{ id: 'restored-1' }], routePlans: {} } }),
    ];
    const result = replayEvents(events);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].id).toBe('restored-1');
  });

  it('AUTO_PLAN_GENERATE / ITEM_MOVE / ITEM_REMOVE 不改变状态', () => {
    const record = { id: 'r1', status: 'pending' };
    const events = [
      makeEvent(EVENT_TYPES.RECORD_CREATE, { record }, { aggregateId: 'r1' }),
      makeEvent(EVENT_TYPES.AUTO_PLAN_GENERATE, { plan: [] }, { aggregateType: 'AUTO_PLAN', aggregateId: 'auto-1' }),
      makeEvent(EVENT_TYPES.AUTO_PLAN_ITEM_MOVE, { from: 0, to: 1 }, { aggregateType: 'AUTO_PLAN', aggregateId: 'auto-1' }),
      makeEvent(EVENT_TYPES.AUTO_PLAN_ITEM_REMOVE, { index: 0 }, { aggregateType: 'AUTO_PLAN', aggregateId: 'auto-1' }),
    ];
    const result = replayEvents(events);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].status).toBe('pending');
  });

  it('未知事件类型被忽略', () => {
    const events = [
      { ...makeEvent('UNKNOWN_TYPE', {}), type: 'UNKNOWN_TYPE' },
    ];
    const result = replayEvents(events);
    expect(result.records).toEqual([]);
  });
});

describe('EventStore 类（localStorage mock）', () => {
  let store;

  beforeEach(() => {
    const storage = {};
    globalThis.localStorage = {
      getItem: vi.fn(key => storage[key] || null),
      setItem: vi.fn((key, val) => { storage[key] = val; }),
      removeItem: vi.fn(key => { delete storage[key]; }),
      clear: vi.fn(() => { Object.keys(storage).forEach(k => delete storage[k]); }),
      get length() { return Object.keys(storage).length; },
      key: vi.fn(i => Object.keys(storage)[i] || null),
    };
    store = new EventStore();
  });

  it('初始状态事件为空', () => {
    expect(store.getEventCount()).toBe(0);
  });

  it('appendEvent 后事件计数增加', () => {
    const evt = makeEvent(EVENT_TYPES.RECORD_CREATE, { record: { id: 'r1' } }, { aggregateId: 'r1' });
    store.appendEvent(evt);
    expect(store.getEventCount()).toBe(1);
  });

  it('rebuildState 回放后得到正确记录', () => {
    const evt = makeEvent(EVENT_TYPES.RECORD_CREATE, { record: { id: 'r1', status: 'pending' } }, { aggregateId: 'r1' });
    store.appendEvent(evt);
    const state = store.rebuildState();
    expect(state.records).toHaveLength(1);
    expect(state.records[0].id).toBe('r1');
  });

  it('getEventsByType 过滤事件', () => {
    store.appendEvent(makeEvent(EVENT_TYPES.RECORD_CREATE, { record: { id: 'r1' } }, { aggregateId: 'r1' }));
    store.appendEvent(makeEvent(EVENT_TYPES.RECORD_DELETE, { recordId: 'r1' }, { aggregateId: 'r1' }));
    expect(store.getEventsByType(EVENT_TYPES.RECORD_CREATE)).toHaveLength(1);
    expect(store.getEventsByType(EVENT_TYPES.RECORD_DELETE)).toHaveLength(1);
  });

  it('clearAll 清空事件', () => {
    store.appendEvent(makeEvent(EVENT_TYPES.RECORD_CREATE, { record: { id: 'r1' } }, { aggregateId: 'r1' }));
    store.clearAll();
    expect(store.getEventCount()).toBe(0);
  });

  it('subscribe 监听器收到事件通知', () => {
    const listener = vi.fn();
    store.subscribe(listener);
    const evt = makeEvent(EVENT_TYPES.RECORD_CREATE, { record: { id: 'r1' } }, { aggregateId: 'r1' });
    store.appendEvent(evt);
    expect(listener).toHaveBeenCalledWith(evt);
  });

  it('importEvents append 策略追加不重复事件', () => {
    const evt1 = makeEvent(EVENT_TYPES.RECORD_CREATE, { record: { id: 'r1' } }, { aggregateId: 'r1' });
    store.appendEvent(evt1);
    const evt2 = makeEvent(EVENT_TYPES.RECORD_CREATE, { record: { id: 'r2' } }, { aggregateId: 'r2' });
    const result = store.importEvents([evt1, evt2], 'append');
    expect(result.imported).toBe(1);
    expect(result.duplicates).toBe(1);
    expect(store.getEventCount()).toBe(2);
  });

  it('appendEvents 批量追加', () => {
    const events = [
      makeEvent(EVENT_TYPES.RECORD_CREATE, { record: { id: 'r1' } }, { aggregateId: 'r1' }),
      makeEvent(EVENT_TYPES.RECORD_CREATE, { record: { id: 'r2' } }, { aggregateId: 'r2' }),
    ];
    store.appendEvents(events);
    expect(store.getEventCount()).toBe(2);
  });
});

describe('rebuildFromEventStore', () => {
  it('无快照时从头回放全部事件', () => {
    const store = {
      events: [
        makeEvent(EVENT_TYPES.RECORD_CREATE, { record: { id: 'r1' } }, { aggregateId: 'r1' }),
        makeEvent(EVENT_TYPES.RECORD_UPDATE, { recordId: 'r1', changes: { status: 'done' } }, { aggregateId: 'r1' }),
      ],
      snapshots: [],
    };
    const result = rebuildFromEventStore(store, {});
    expect(result.records).toHaveLength(1);
    expect(result.records[0].status).toBe('done');
  });

  it('有快照时从快照位置继续回放', () => {
    const snapshotState = {
      records: [{ id: 'r1', status: 'pending' }],
      routePlans: {},
      reminderSettings: {},
      riskRules: {},
      autoPlanConfig: {},
    };
    const store = {
      events: [
        makeEvent(EVENT_TYPES.RECORD_CREATE, { record: { id: 'r1' } }, { aggregateId: 'r1' }),
        makeEvent(EVENT_TYPES.RECORD_UPDATE, { recordId: 'r1', changes: { status: 'done' } }, { aggregateId: 'r1' }),
      ],
      snapshots: [{
        id: 'snap_1',
        atEventIndex: 1,
        state: snapshotState,
      }],
    };
    const result = rebuildFromEventStore(store, {});
    expect(result.records).toHaveLength(1);
    expect(result.records[0].status).toBe('done');
  });
});
