import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getBusinessKey,
  normalizeTimelineEntry,
  migrateRecord,
  migrateRecords,
  recordsNeedMigration,
  detectConflicts,
  getTimelineEntryKey,
  detectTimelineConflict,
  mergeRecordFields,
  resolveConflict,
  mergeTimelines,
  validateMergeData,
  validateImportData,
  validateRecordsDetail,
  computeDataSummary,
  assembleMergedRecords,
  mergeImportSettings,
  buildManualMergeInitialForm,
  DATA_EXPORT_APP_ID,
  MERGE_DATA_APP_ID,
  CONFLICT_FIELDS
} from './dataImportExport.js';

const mockAppConfig = {
  statuses: ['pending', 'in_progress', 'completed', 'overdue'],
  fields: [
    { key: 'estate', label: '楼盘', required: true },
    { key: 'building', label: '楼栋', required: true },
    { key: 'elevatorNo', label: '电梯编号', required: true },
    { key: 'cycle', label: '维保周期', required: true, options: ['15天', '30天', '季度'] },
    { key: 'nextDate', label: '下次维保日期', required: true },
    { key: 'owner', label: '负责人', required: true }
  ]
};

describe('getBusinessKey', () => {
  it('优先使用 businessKey', () => {
    expect(getBusinessKey({ businessKey: 'BK-001', elevatorNo: 'E-001' })).toBe('BK-001');
  });

  it('无 businessKey 时回退到 elevatorNo', () => {
    expect(getBusinessKey({ elevatorNo: 'E-001' })).toBe('E-001');
  });

  it('两者都无时返回空字符串', () => {
    expect(getBusinessKey({ id: 'r1' })).toBe('');
  });
});

describe('normalizeTimelineEntry', () => {
  const primaryStatus = 'pending';
  const today = '2026-06-16';

  it('有效 entry 被标准化', () => {
    const entry = { status: 'done', at: '2026-06-15', by: '张三' };
    const result = normalizeTimelineEntry(entry, 'completed', primaryStatus, today);
    expect(result.status).toBe('done');
    expect(result.at).toBe('2026-06-15');
    expect(result.by).toBe('张三');
  });

  it('null / undefined / 非对象返回 null', () => {
    expect(normalizeTimelineEntry(null, 'done', primaryStatus, today)).toBeNull();
    expect(normalizeTimelineEntry(undefined, 'done', primaryStatus, today)).toBeNull();
    expect(normalizeTimelineEntry('not-obj', 'done', primaryStatus, today)).toBeNull();
  });

  it('缺失字段填充默认值', () => {
    const entry = {};
    const result = normalizeTimelineEntry(entry, 'default-status', primaryStatus, today);
    expect(result.status).toBe('default-status');
    expect(result.at).toBe(today);
    expect(result.by).toBe('系统');
  });

  it('defaultStatus 为假值时使用 primaryStatus', () => {
    const entry = {};
    const result = normalizeTimelineEntry(entry, null, primaryStatus, today);
    expect(result.status).toBe(primaryStatus);
  });

  it('保留 notes / backfill / nextCycle 扩展字段', () => {
    const entry = { status: 'done', notes: '测试备注', backfill: true, nextCycle: { date: '2026-07-01' } };
    const result = normalizeTimelineEntry(entry, 'completed', primaryStatus, today);
    expect(result.notes).toBe('测试备注');
    expect(result.backfill).toBe(true);
    expect(result.nextCycle).toEqual({ date: '2026-07-01' });
  });
});

describe('migrateRecord', () => {
  const primaryStatus = 'pending';
  const today = '2026-06-16';

  it('缺失 id 时自动生成', () => {
    const result = migrateRecord({ elevatorNo: 'E-001' }, { primaryStatus, today });
    expect(result.id).toBeDefined();
    expect(result.id.length).toBeGreaterThan(0);
  });

  it('已有 id 时保留', () => {
    const result = migrateRecord({ id: 'custom-id' }, { primaryStatus, today });
    expect(result.id).toBe('custom-id');
  });

  it('缺失 businessKey 时用 elevatorNo 填充', () => {
    const result = migrateRecord({ elevatorNo: 'E-001' }, { primaryStatus, today });
    expect(result.businessKey).toBe('E-001');
  });

  it('缺失 businessKey 和 elevatorNo 时用 id 填充', () => {
    const result = migrateRecord({ id: 'r1' }, { primaryStatus, today });
    expect(result.businessKey).toBe('r1');
  });

  it('缺失 createdAt 从 timeline 第一条推断', () => {
    const result = migrateRecord(
      { timeline: [{ at: '2026-05-01', status: 'pending', by: '系统' }] },
      { primaryStatus, today }
    );
    expect(result.createdAt).toBe(new Date('2026-05-01T00:00:00').toISOString());
  });

  it('缺失 status 时使用 primaryStatus', () => {
    const result = migrateRecord({ id: 'r1' }, { primaryStatus, today });
    expect(result.status).toBe(primaryStatus);
  });

  it('缺失 timeline 时创建默认条目', () => {
    const result = migrateRecord({ id: 'r1', status: 'completed' }, { primaryStatus, today });
    expect(Array.isArray(result.timeline)).toBe(true);
    expect(result.timeline.length).toBe(1);
    expect(result.timeline[0].status).toBe('completed');
    expect(result.timeline[0].at).toBe(today);
    expect(result.timeline[0].by).toBe('系统迁移');
  });

  it('已有 timeline 时标准化条目', () => {
    const record = {
      id: 'r1',
      timeline: [
        { status: 'done', at: '2026-06-10', by: '张三' },
        {}
      ]
    };
    const result = migrateRecord(record, { primaryStatus, today });
    expect(result.timeline.length).toBe(2);
    expect(result.timeline[0].status).toBe('done');
    expect(result.timeline[1].status).toBe(primaryStatus);
  });

  it('refreshUpdatedAt=true 强制刷新 updatedAt', () => {
    const now = new Date().toISOString();
    const record = { id: 'r1', updatedAt: 'old-ts' };
    const result = migrateRecord(record, { primaryStatus, today, refreshUpdatedAt: true });
    expect(result.updatedAt).not.toBe('old-ts');
    expect(new Date(result.updatedAt).getTime()).not.toBeNaN();
  });
});

describe('migrateRecords', () => {
  it('批量迁移多个记录', () => {
    const records = [
      { elevatorNo: 'E-001' },
      { elevatorNo: 'E-002' }
    ];
    const result = migrateRecords(records, { primaryStatus: 'pending', today: '2026-06-16' });
    expect(result.length).toBe(2);
    expect(result[0].elevatorNo).toBe('E-001');
    expect(result[1].elevatorNo).toBe('E-002');
    expect(result[0].id).toBeDefined();
    expect(result[1].id).toBeDefined();
  });
});

describe('recordsNeedMigration', () => {
  it('长度不同需要迁移', () => {
    expect(recordsNeedMigration([{ id: '1' }], [{ id: '1' }, { id: '2' }])).toBe(true);
  });

  it('id 变化需要迁移', () => {
    expect(recordsNeedMigration([{ id: '1' }], [{ id: '2' }])).toBe(true);
  });

  it('businessKey 变化需要迁移', () => {
    expect(recordsNeedMigration(
      [{ id: '1', businessKey: 'bk-1' }],
      [{ id: '1', businessKey: 'bk-2' }]
    )).toBe(true);
  });

  it('timeline 长度变化需要迁移', () => {
    expect(recordsNeedMigration(
      [{ id: '1', timeline: [{ status: 'a' }] }],
      [{ id: '1', timeline: [{ status: 'a' }, { status: 'b' }] }]
    )).toBe(true);
  });

  it('字段值变化需要迁移', () => {
    expect(recordsNeedMigration(
      [{ id: '1', status: 'pending' }],
      [{ id: '1', status: 'done' }]
    )).toBe(true);
  });

  it('完全相同不需要迁移', () => {
    const r = {
      id: '1',
      businessKey: 'bk-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
      timeline: [{ status: 'pending', at: '2026-06-01', by: '系统' }],
      status: 'pending'
    };
    expect(recordsNeedMigration([r], [r])).toBe(false);
  });
});

describe('getTimelineEntryKey', () => {
  it('为不同条目生成唯一键', () => {
    const k1 = getTimelineEntryKey({ status: 'done', at: '2026-06-15', by: '张三' });
    const k2 = getTimelineEntryKey({ status: 'done', at: '2026-06-16', by: '张三' });
    expect(k1).not.toBe(k2);
  });

  it('相同条目生成相同键', () => {
    const entry = { status: 'done', at: '2026-06-15', by: '张三', notes: '备注' };
    expect(getTimelineEntryKey(entry)).toBe(getTimelineEntryKey({ ...entry }));
  });
});

describe('detectTimelineConflict', () => {
  it('两边都无时间线无冲突', () => {
    expect(detectTimelineConflict([], [])).toBeNull();
  });

  it('本地空 / 导入有时——冲突', () => {
    const result = detectTimelineConflict([], [{ status: 'done' }]);
    expect(result).toBeDefined();
    expect(result.type).toBe('timeline');
    expect(result.localCount).toBe(0);
    expect(result.importCount).toBe(1);
  });

  it('本地有 / 导入空——冲突', () => {
    const result = detectTimelineConflict([{ status: 'done' }], []);
    expect(result).toBeDefined();
    expect(result.localCount).toBe(1);
    expect(result.importCount).toBe(0);
  });

  it('内容完全相同时无冲突', () => {
    const tl = [{ status: 'done', at: '2026-06-15', by: '张三' }];
    expect(detectTimelineConflict(tl, tl)).toBeNull();
  });

  it('两边有各自独立的条目——冲突', () => {
    const local = [{ status: 'done', at: '2026-06-15', by: '本地' }];
    const imp = [{ status: 'done', at: '2026-06-15', by: '导入侧' }];
    const result = detectTimelineConflict(local, imp);
    expect(result).toBeDefined();
    expect(result.description).toContain('独立');
  });

  it('仅导入侧有新增——冲突', () => {
    const local = [{ status: 'a', at: '2026-06-10', by: '系统' }];
    const imp = [
      { status: 'a', at: '2026-06-10', by: '系统' },
      { status: 'b', at: '2026-06-15', by: '系统' }
    ];
    const result = detectTimelineConflict(local, imp);
    expect(result).toBeDefined();
    expect(result.description).toContain('导入数据有新增');
  });
});

describe('detectConflicts', () => {
  it('完全不重叠的记录集无冲突', () => {
    const local = [{ businessKey: 'E-001', elevatorNo: 'E-001', status: 'pending' }];
    const imp = [{ businessKey: 'E-002', elevatorNo: 'E-002', status: 'pending' }];
    const result = detectConflicts(local, imp);
    expect(result.conflicts).toHaveLength(0);
    expect(result.noConflicts.localOnly).toHaveLength(1);
    expect(result.noConflicts.importOnly).toHaveLength(1);
  });

  it('相同 businessKey 且字段值不同——有冲突', () => {
    const local = [{ businessKey: 'E-001', elevatorNo: 'E-001', status: 'pending', nextDate: '2026-06-30' }];
    const imp = [{ businessKey: 'E-001', elevatorNo: 'E-001', status: 'done', nextDate: '2026-06-30' }];
    const result = detectConflicts(local, imp);
    expect(result.conflicts).toHaveLength(1);
    const hasStatusConflict = result.conflicts[0].conflictTypes.some(c => c.type === 'status');
    expect(hasStatusConflict).toBe(true);
  });

  it('相同 businessKey 且完全相同——autoMergeable', () => {
    const local = [{ businessKey: 'E-001', elevatorNo: 'E-001', status: 'pending' }];
    const imp = [{ businessKey: 'E-001', elevatorNo: 'E-001', status: 'pending' }];
    const result = detectConflicts(local, imp);
    expect(result.conflicts).toHaveLength(0);
    expect(result.noConflicts.autoMergeable).toHaveLength(1);
  });

  it('多个冲突字段被分别列出', () => {
    const local = [{ businessKey: 'E-001', status: 'pending', nextDate: '2026-06-30', owner: '张三' }];
    const imp = [{ businessKey: 'E-001', status: 'done', nextDate: '2026-07-15', owner: '李四' }];
    const result = detectConflicts(local, imp);
    expect(result.conflicts).toHaveLength(1);
    const types = result.conflicts[0].conflictTypes.map(c => c.type);
    expect(types).toContain('status');
    expect(types).toContain('nextDate');
    expect(types).toContain('owner');
  });
});

describe('mergeRecordFields', () => {
  it('本地和导入字段合并', () => {
    const local = { id: 'r1', estate: 'A小区', owner: '张三' };
    const imp = { estate: 'B小区', building: '1栋', cycle: '30天' };
    const result = mergeRecordFields(local, imp, null);
    expect(result.estate).toBe('A小区');
    expect(result.building).toBe('1栋');
    expect(result.owner).toBe('张三');
    expect(result.cycle).toBe('30天');
  });

  it('customMerge 覆盖本地和导入', () => {
    const local = { id: 'r1', status: 'pending' };
    const imp = { status: 'done' };
    const custom = { status: 'custom-status' };
    const result = mergeRecordFields(local, imp, custom);
    expect(result.status).toBe('custom-status');
  });

  it('不覆盖 id / businessKey 等特殊字段', () => {
    const local = { id: 'r1', businessKey: 'bk-1' };
    const imp = { id: 'r99', businessKey: 'bk-99' };
    const result = mergeRecordFields(local, imp, null);
    expect(result.id).toBe('r1');
    expect(result.businessKey).toBe('bk-1');
  });

  it('temps 数组合并去重', () => {
    const local = { id: 'r1', temps: [25, 26] };
    const imp = { temps: [26, 27] };
    const result = mergeRecordFields(local, imp, null);
    expect(result.temps).toEqual([25, 26, 27]);
  });
});

describe('resolveConflict', () => {
  it('keepLocal 保留本地但补全缺失字段', () => {
    const local = { id: 'r1', businessKey: 'bk-1', estate: 'A小区' };
    const imp = { estate: 'B小区', building: '1栋' };
    const conflict = { localRecord: local, importRecord: imp };
    const result = resolveConflict(conflict, 'keepLocal', null);
    expect(result.estate).toBe('A小区');
    expect(result.building).toBe('1栋');
    expect(result.updatedAt).toBeDefined();
  });

  it('useImport 使用导入但保留 id/businessKey', () => {
    const local = { id: 'r1', businessKey: 'bk-1', createdAt: 'created-ts' };
    const imp = { id: 'import-id', businessKey: 'import-bk', estate: 'B小区', status: 'done' };
    const conflict = { localRecord: local, importRecord: imp };
    const result = resolveConflict(conflict, 'useImport', null);
    expect(result.id).toBe('r1');
    expect(result.businessKey).toBe('bk-1');
    expect(result.estate).toBe('B小区');
    expect(result.status).toBe('done');
    expect(result.createdAt).toBe('created-ts');
  });

  it('manual 使用 customMerge 并合并 timeline', () => {
    const local = { id: 'r1', status: 'pending', timeline: [{ status: 'pending', at: '2026-06-01', by: '系统' }] };
    const imp = { status: 'done', timeline: [{ status: 'done', at: '2026-06-15', by: '系统' }] };
    const conflict = { localRecord: local, importRecord: imp };
    const customMerge = { status: 'custom-status' };
    const result = resolveConflict(conflict, 'manual', customMerge);
    expect(result.status).toBe('custom-status');
    expect(result.timeline.length).toBe(2);
  });

  it('默认保留本地', () => {
    const local = { id: 'r1', status: 'pending' };
    const imp = { status: 'done' };
    const conflict = { localRecord: local, importRecord: imp };
    const result = resolveConflict(conflict, 'unknown-strategy', null);
    expect(result.status).toBe('pending');
  });
});

describe('mergeTimelines', () => {
  it('相同条目去重', () => {
    const tl = [{ status: 'a', at: '2026-06-01', by: '系统' }];
    const result = mergeTimelines(tl, tl);
    expect(result.length).toBe(1);
  });

  it('按 at 升序排序', () => {
    const local = [{ status: 'late', at: '2026-06-20', by: '系统' }];
    const imp = [{ status: 'early', at: '2026-06-01', by: '系统' }];
    const result = mergeTimelines(local, imp);
    expect(result[0].status).toBe('early');
    expect(result[1].status).toBe('late');
  });

  it('不同条目全部保留', () => {
    const local = [{ status: 'a', at: '2026-06-01', by: '系统' }];
    const imp = [{ status: 'b', at: '2026-06-15', by: '系统' }];
    const result = mergeTimelines(local, imp);
    expect(result.length).toBe(2);
  });
});

describe('computeDataSummary', () => {
  it('正确统计汇总信息', () => {
    const records = [
      { owner: '张三', nextDate: '2026-06-20' },
      { owner: '李四', nextDate: '2026-06-30' },
      { owner: '张三', nextDate: '2026-07-15' }
    ];
    const result = computeDataSummary(records);
    expect(result.recordCount).toBe(3);
    expect(result.ownerCount).toBe(2);
    expect(result.earliestDate).toBe('2026-06-20');
    expect(result.latestDate).toBe('2026-07-15');
  });

  it('空记录返回默认值', () => {
    const result = computeDataSummary([]);
    expect(result.recordCount).toBe(0);
    expect(result.ownerCount).toBe(0);
    expect(result.earliestDate).toBeNull();
    expect(result.latestDate).toBeNull();
  });
});

describe('validateRecordsDetail', () => {
  it('所有必填字段存在且有效时无错误', () => {
    const records = [{
      estate: 'A小区',
      building: '1栋',
      elevatorNo: 'E-001',
      cycle: '30天',
      nextDate: '2026-06-30',
      owner: '张三',
      status: 'pending'
    }];
    const result = validateRecordsDetail(records, mockAppConfig);
    expect(result.recordErrors).toHaveLength(0);
    expect(result.invalidRecordCount).toBe(0);
  });

  it('缺失必填字段时报错', () => {
    const records = [{ elevatorNo: 'E-001', cycle: '30天', nextDate: '2026-06-30', owner: '张三' }];
    const result = validateRecordsDetail(records, mockAppConfig);
    expect(result.invalidRecordCount).toBe(1);
    const errKeys = result.recordErrors[0].errors.map(e => e.key);
    expect(errKeys).toContain('estate');
    expect(errKeys).toContain('building');
  });

  it('无效周期值报错', () => {
    const records = [{
      estate: 'A', building: '1', elevatorNo: 'E-001',
      cycle: '99天', nextDate: '2026-06-30', owner: '张三'
    }];
    const result = validateRecordsDetail(records, mockAppConfig);
    const hasCycleErr = result.recordErrors[0].errors.some(e => e.type === 'invalidCycle');
    expect(hasCycleErr).toBe(true);
  });

  it('无效日期格式报错', () => {
    const records = [{
      estate: 'A', building: '1', elevatorNo: 'E-001',
      cycle: '30天', nextDate: '2026/06/30', owner: '张三'
    }];
    const result = validateRecordsDetail(records, mockAppConfig);
    const hasDateErr = result.recordErrors[0].errors.some(e => e.type === 'invalidDate');
    expect(hasDateErr).toBe(true);
  });

  it('无效状态报错', () => {
    const records = [{
      estate: 'A', building: '1', elevatorNo: 'E-001',
      cycle: '30天', nextDate: '2026-06-30', owner: '张三', status: 'unknown-status'
    }];
    const result = validateRecordsDetail(records, mockAppConfig);
    const hasStatusErr = result.recordErrors[0].errors.some(e => e.type === 'invalidStatus');
    expect(hasStatusErr).toBe(true);
  });

  it('重复电梯编号报错', () => {
    const records = [
      { estate: 'A', building: '1', elevatorNo: 'E-001', cycle: '30天', nextDate: '2026-06-30', owner: '张三' },
      { estate: 'B', building: '2', elevatorNo: 'E-001', cycle: '30天', nextDate: '2026-06-30', owner: '李四' }
    ];
    const result = validateRecordsDetail(records, mockAppConfig);
    const dupErrs = result.recordErrors.filter(re => re.errors.some(e => e.type === 'duplicate'));
    expect(dupErrs.length).toBe(2);
  });
});

describe('validateImportData', () => {
  const validBase = () => ({
    appId: DATA_EXPORT_APP_ID,
    version: '2.0.0',
    data: {
      records: [],
      reminderSettings: {},
      routePlans: {},
      riskRules: {}
    }
  });

  it('null / undefined 返回无效', () => {
    expect(validateImportData(null, mockAppConfig).valid).toBe(false);
  });

  it('非对象返回无效', () => {
    expect(validateImportData('bad', mockAppConfig).valid).toBe(false);
  });

  it('缺少 appId 返回无效', () => {
    const d = validBase();
    delete d.appId;
    expect(validateImportData(d, mockAppConfig).valid).toBe(false);
  });

  it('appId 不匹配返回无效', () => {
    const d = validBase();
    d.appId = 'other-app';
    expect(validateImportData(d, mockAppConfig).valid).toBe(false);
  });

  it('缺少 data 返回无效', () => {
    const d = { appId: DATA_EXPORT_APP_ID };
    expect(validateImportData(d, mockAppConfig).valid).toBe(false);
  });

  it('records 非数组返回无效', () => {
    const d = validBase();
    d.data.records = 'not-array';
    expect(validateImportData(d, mockAppConfig).valid).toBe(false);
  });

  it('记录校验失败时返回详细错误', () => {
    const d = validBase();
    d.data.records = [{ status: 'pending' }];
    const result = validateImportData(d, mockAppConfig);
    expect(result.valid).toBe(false);
    expect(result.recordErrors.length).toBeGreaterThan(0);
  });

  it('完整有效数据返回 valid=true', () => {
    const d = validBase();
    d.data.records = [{
      estate: 'A', building: '1', elevatorNo: 'E-001',
      cycle: '30天', nextDate: '2026-06-30', owner: '张三', status: 'pending'
    }];
    const result = validateImportData(d, mockAppConfig);
    expect(result.valid).toBe(true);
  });

  it('缺少 riskRules 时仅告警', () => {
    const d = validBase();
    delete d.data.riskRules;
    d.data.records = [{
      estate: 'A', building: '1', elevatorNo: 'E-001',
      cycle: '30天', nextDate: '2026-06-30', owner: '张三', status: 'pending'
    }];
    const result = validateImportData(d, mockAppConfig);
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('validateMergeData', () => {
  it('接受 MERGE_DATA_APP_ID 标识', () => {
    const d = {
      appId: MERGE_DATA_APP_ID,
      version: '2.0.0',
      data: { records: [] }
    };
    const result = validateMergeData(d, { primaryStatus: 'pending', today: '2026-06-16' });
    expect(result.valid).toBe(true);
  });

  it('接受 DATA_EXPORT_APP_ID 标识', () => {
    const d = {
      appId: DATA_EXPORT_APP_ID,
      version: '2.0.0',
      data: { records: [] }
    };
    const result = validateMergeData(d, { primaryStatus: 'pending', today: '2026-06-16' });
    expect(result.valid).toBe(true);
  });

  it('包含 eventStream 时启用事件级合并并告警', () => {
    const d = {
      appId: MERGE_DATA_APP_ID,
      version: '2.0.0',
      data: { records: [] },
      eventStream: { events: [{ id: 'e1' }] }
    };
    const result = validateMergeData(d, { primaryStatus: 'pending', today: '2026-06-16' });
    expect(result.valid).toBe(true);
    expect(result.eventBasedMerge).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('assembleMergedRecords', () => {
  const opts = { primaryStatus: 'pending', today: '2026-06-16' };

  it('合并 localOnly 和 importOnly', () => {
    const noConflicts = {
      localOnly: [{ businessKey: 'L1', elevatorNo: 'L1' }],
      importOnly: [{ businessKey: 'I1', elevatorNo: 'I1' }]
    };
    const result = assembleMergedRecords(noConflicts, [], [], opts);
    expect(result.length).toBe(2);
    const keys = result.map(r => r.elevatorNo);
    expect(keys).toContain('L1');
    expect(keys).toContain('I1');
  });

  it('autoMergeable 自动合并', () => {
    const noConflicts = {
      autoMergeable: [{
        localRecord: { businessKey: 'A1', elevatorNo: 'A1', estate: 'A' },
        importRecord: { building: '1', cycle: '30天' }
      }]
    };
    const result = assembleMergedRecords(noConflicts, [], [], opts);
    expect(result.length).toBe(1);
    expect(result[0].estate).toBe('A');
    expect(result[0].building).toBe('1');
  });

  it('conflictResolutions 按策略解决冲突', () => {
    const noConflicts = {};
    const conflicts = [{
      key: 'C1',
      localRecord: { businessKey: 'C1', elevatorNo: 'C1', status: 'pending' },
      importRecord: { status: 'done', building: '1' }
    }];
    const resolutions = [{ resolution: 'useImport', customMerge: null }];
    const result = assembleMergedRecords(noConflicts, conflicts, resolutions, opts);
    expect(result.length).toBe(1);
    expect(result[0].status).toBe('done');
    expect(result[0].building).toBe('1');
  });
});

describe('mergeImportSettings', () => {
  it('合并 reminderSettings', () => {
    const local = { advanceDays: 3 };
    const imp = { advanceDays: 7, email: true };
    const defaults = { advanceDays: 2, sms: false };
    const { finalReminderSettings } = mergeImportSettings(
      local, {}, {}, { reminderSettings: imp }, defaults, {}
    );
    expect(finalReminderSettings.advanceDays).toBe(7);
    expect(finalReminderSettings.email).toBe(true);
    expect(finalReminderSettings.sms).toBe(false);
  });

  it('合并 routePlans', () => {
    const local = { '2026-06-16': { routes: [] } };
    const imp = { '2026-06-17': { routes: [] } };
    const { finalRoutePlans } = mergeImportSettings(
      {}, local, {}, { routePlans: imp }, {}, {}
    );
    expect(Object.keys(finalRoutePlans)).toEqual(['2026-06-16', '2026-06-17']);
  });

  it('合并 riskRules', () => {
    const local = { overdueLabel: '过期' };
    const imp = { overdueEnabled: false, soonExpireDays: 7 };
    const defaults = { overdueLabel: '逾期', overdueEnabled: true };
    const { finalRiskRules } = mergeImportSettings(
      {}, {}, local, { riskRules: imp }, {}, defaults
    );
    expect(finalRiskRules.overdueLabel).toBe('过期');
    expect(finalRiskRules.overdueEnabled).toBe(false);
    expect(finalRiskRules.soonExpireDays).toBe(7);
  });
});

describe('buildManualMergeInitialForm', () => {
  it('冲突字段以本地值作为初始值，本地缺失则取导入侧', () => {
    const conflict = {
      localRecord: { estate: 'A小区', building: '1栋', status: 'pending' },
      importRecord: { estate: 'B小区', cycle: '30天', status: 'done' }
    };
    const result = buildManualMergeInitialForm(conflict, mockAppConfig.fields);
    expect(result.estate).toBe('A小区');
    expect(result.building).toBe('1栋');
    expect(result.status).toBe('pending');
    expect(result.cycle).toBeUndefined();
    expect(result.elevatorNo).toBeUndefined();
  });
});
