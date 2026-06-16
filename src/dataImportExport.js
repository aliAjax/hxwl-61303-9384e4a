import { EVENT_STORE_VERSION } from './eventStore.js';

const DATA_EXPORT_VERSION = '1.1.0';
const DATA_EXPORT_APP_ID = 'hxwl-61303-elevator-maintenance';
const MERGE_DATA_VERSION = '1.0.0';
const MERGE_DATA_APP_ID = 'hxwl-61303-elevator-maintenance';

const MERGE_HISTORY_STORAGE_KEY = 'hxwl-61303-merge-history';
const MERGE_HISTORY_LIMIT = 20;

const CONFLICT_FIELDS = [
  { key: 'status', label: '状态冲突' },
  { key: 'nextDate', label: '下次维保日期冲突' },
  { key: 'estate', label: '楼盘名称冲突' },
  { key: 'building', label: '楼栋编号冲突' },
  { key: 'cycle', label: '维保周期冲突' },
  { key: 'owner', label: '负责人冲突' },
  { key: 'priority', label: '优先级冲突' },
  { key: 'temperature', label: '温度读数冲突' },
  { key: 'notes', label: '备注冲突' }
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function withIds(items, { primaryStatus, today }) {
  return items.map((item) => ({ id: uid(), timeline: item.timeline || [{ status: item.status || primaryStatus, at: today, by: '系统' }], ...item }));
}

function getBusinessKey(record) {
  return record.businessKey || record.elevatorNo || '';
}

function normalizeTimelineEntry(entry, defaultStatus, primaryStatus, today) {
  if (!entry || typeof entry !== 'object') return null;
  return {
    status: entry.status || defaultStatus || primaryStatus,
    at: entry.at || today,
    by: entry.by || '系统',
    ...(entry.notes ? { notes: entry.notes } : {}),
    ...(entry.backfill ? { backfill: entry.backfill } : {}),
    ...(entry.nextCycle ? { nextCycle: entry.nextCycle } : {})
  };
}

function migrateRecord(record, options = {}) {
  const { primaryStatus, today } = options;
  const now = new Date().toISOString();
  const { refreshUpdatedAt = false } = options;
  const migrated = { ...record };

  if (!migrated.id) {
    migrated.id = uid();
  }

  if (!migrated.businessKey) {
    migrated.businessKey = migrated.elevatorNo || migrated.id;
  }

  if (!migrated.createdAt) {
    if (migrated.timeline && migrated.timeline.length > 0) {
      const firstTimeline = migrated.timeline[0];
      try {
        const d = new Date(firstTimeline.at + 'T00:00:00');
        migrated.createdAt = isNaN(d.getTime()) ? now : d.toISOString();
      } catch {
        migrated.createdAt = now;
      }
    } else {
      migrated.createdAt = now;
    }
  }

  if (refreshUpdatedAt || !migrated.updatedAt) {
    if (migrated.timeline && migrated.timeline.length > 0) {
      const lastTimeline = migrated.timeline[migrated.timeline.length - 1];
      try {
        const d = new Date(lastTimeline.at + 'T00:00:00');
        migrated.updatedAt = isNaN(d.getTime()) ? now : d.toISOString();
      } catch {
        migrated.updatedAt = now;
      }
    } else {
      migrated.updatedAt = now;
    }
  }

  if (!migrated.timeline) {
    migrated.timeline = [{ status: migrated.status || primaryStatus, at: today, by: '系统迁移' }];
  } else if (Array.isArray(migrated.timeline)) {
    const normalizedTimeline = migrated.timeline
      .map(e => normalizeTimelineEntry(e, migrated.status, primaryStatus, today))
      .filter(Boolean);
    if (normalizedTimeline.length > 0) {
      migrated.timeline = normalizedTimeline;
    } else {
      migrated.timeline = [{ status: migrated.status || primaryStatus, at: today, by: '系统迁移' }];
    }
  }

  if (!migrated.status) {
    migrated.status = primaryStatus;
  }

  return migrated;
}

function migrateRecords(records, options = {}) {
  return records.map((record) => migrateRecord(record, options));
}

function recordsNeedMigration(original, migrated) {
  if (original.length !== migrated.length) return true;

  return original.some((r, i) => {
    const m = migrated[i];
    if (r.id !== m.id) return true;
    if (r.businessKey !== m.businessKey) return true;
    if (r.createdAt !== m.createdAt) return true;
    if (r.updatedAt !== m.updatedAt) return true;
    if (!r.timeline && m.timeline) return true;
    if (r.timeline && !m.timeline) return true;
    if (r.timeline && m.timeline && r.timeline.length !== m.timeline.length) return true;

    const allKeys = new Set([...Object.keys(r), ...Object.keys(m)]);
    for (const key of allKeys) {
      if (key === 'id' || key === 'businessKey' || key === 'createdAt' || key === 'updatedAt' || key === 'timeline') continue;
      if (r[key] !== m[key]) return true;
    }
    return false;
  });
}

function loadRecords(storageKey, seed, options = {}) {
  const { primaryStatus, today } = options;
  const raw = localStorage.getItem(storageKey);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const migrated = migrateRecords(parsed, { primaryStatus, today });
      if (recordsNeedMigration(parsed, migrated)) {
        localStorage.setItem(storageKey, JSON.stringify(migrated));
      }
      return migrated;
    } catch {
      const seeded = withIds(seed, { primaryStatus, today });
      return migrateRecords(seeded, { primaryStatus, today });
    }
  }
  const seeded = withIds(seed, { primaryStatus, today });
  return migrateRecords(seeded, { primaryStatus, today });
}

function loadMergeHistory() {
  const raw = localStorage.getItem(MERGE_HISTORY_STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return [];
}

function saveMergeHistory(history) {
  localStorage.setItem(MERGE_HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, MERGE_HISTORY_LIMIT)));
}

function createDataSnapshot(currentRecords, currentReminderSettings, currentRoutePlans) {
  return {
    records: JSON.parse(JSON.stringify(currentRecords)),
    reminderSettings: JSON.parse(JSON.stringify(currentReminderSettings)),
    routePlans: JSON.parse(JSON.stringify(currentRoutePlans)),
    createdAt: new Date().toISOString()
  };
}

function getCurrentFullState(currentRecords, currentReminderSettings, currentRoutePlans, currentRiskRules, currentAutoPlanConfig) {
  return {
    records: JSON.parse(JSON.stringify(currentRecords)),
    routePlans: JSON.parse(JSON.stringify(currentRoutePlans)),
    reminderSettings: JSON.parse(JSON.stringify(currentReminderSettings)),
    riskRules: JSON.parse(JSON.stringify(currentRiskRules || {})),
    autoPlanConfig: JSON.parse(JSON.stringify(currentAutoPlanConfig || {}))
  };
}

function getTimelineEntryKey(entry) {
  const status = entry.status || '';
  const at = entry.at || '';
  const by = entry.by || '';
  const notes = entry.notes || '';
  const backfill = entry.backfill ? JSON.stringify(entry.backfill) : '';
  const nextCycle = entry.nextCycle ? JSON.stringify(entry.nextCycle) : '';
  return `${status}-${at}-${by}-${notes}-${backfill}-${nextCycle}`;
}

function detectTimelineConflict(localTimeline, importTimeline) {
  if (!localTimeline.length && !importTimeline.length) return null;
  if (!localTimeline.length) {
    return {
      type: 'timeline',
      label: '时间线追加冲突',
      description: '本地无时间线记录，导入数据有时间线',
      localCount: 0,
      importCount: importTimeline.length
    };
  }
  if (!importTimeline.length) {
    return {
      type: 'timeline',
      label: '时间线追加冲突',
      description: '导入数据无时间线记录，本地有时间线',
      localCount: localTimeline.length,
      importCount: 0
    };
  }

  const localLast = localTimeline[localTimeline.length - 1];
  const importLast = importTimeline[importTimeline.length - 1];

  const localLastTime = new Date(localLast.at || 0).getTime();
  const importLastTime = new Date(importLast.at || 0).getTime();

  const localKeys = new Set(localTimeline.map(t => getTimelineEntryKey(t)));
  const importKeys = new Set(importTimeline.map(t => getTimelineEntryKey(t)));

  const hasUniqueLocal = localTimeline.some(t => !importKeys.has(getTimelineEntryKey(t)));
  const hasUniqueImport = importTimeline.some(t => !localKeys.has(getTimelineEntryKey(t)));

  if (hasUniqueLocal && hasUniqueImport) {
    return {
      type: 'timeline',
      label: '时间线追加冲突',
      description: '两边都有独立的时间线记录',
      localCount: localTimeline.length,
      importCount: importTimeline.length,
      localLastTime,
      importLastTime
    };
  }

  if (hasUniqueImport) {
    return {
      type: 'timeline',
      label: '时间线追加冲突',
      description: '导入数据有新增的时间线记录',
      localCount: localTimeline.length,
      importCount: importTimeline.length
    };
  }

  if (hasUniqueLocal) {
    return {
      type: 'timeline',
      label: '时间线追加冲突',
      description: '本地数据有新增的时间线记录',
      localCount: localTimeline.length,
      importCount: importTimeline.length
    };
  }

  return null;
}

function detectConflicts(localRecords, importRecords) {
  const conflicts = [];
  const noConflicts = { localOnly: [], importOnly: [] };

  const localMap = new Map();
  localRecords.forEach((record) => {
    const key = getBusinessKey(record);
    if (key) {
      localMap.set(key, record);
    }
  });

  const importMap = new Map();
  importRecords.forEach((record) => {
    const key = getBusinessKey(record);
    if (key) {
      importMap.set(key, record);
    }
  });

  importRecords.forEach((importRecord) => {
    const key = getBusinessKey(importRecord);
    const localRecord = localMap.get(key);

    if (!localRecord) {
      noConflicts.importOnly.push(importRecord);
      return;
    }

    const conflictTypes = [];

    CONFLICT_FIELDS.forEach(({ key: fieldKey, label }) => {
      const localVal = localRecord[fieldKey];
      const importVal = importRecord[fieldKey];
      if (localVal !== importVal && (localVal || importVal)) {
        conflictTypes.push({
          type: fieldKey,
          label,
          localValue: localVal,
          importValue: importVal
        });
      }
    });

    const localTimeline = localRecord.timeline || [];
    const importTimeline = importRecord.timeline || [];
    const timelineConflict = detectTimelineConflict(localTimeline, importTimeline);
    if (timelineConflict) {
      conflictTypes.push(timelineConflict);
    }

    if (conflictTypes.length > 0) {
      conflicts.push({
        key,
        localRecord,
        importRecord,
        conflictTypes,
        resolution: 'pending'
      });
    } else {
      noConflicts.autoMergeable = noConflicts.autoMergeable || [];
      noConflicts.autoMergeable.push({ localRecord, importRecord });
    }
  });

  localRecords.forEach((localRecord) => {
    const key = getBusinessKey(localRecord);
    if (!importMap.has(key)) {
      noConflicts.localOnly.push(localRecord);
    }
  });

  return { conflicts, noConflicts };
}

function mergeRecordFields(localRecord, importRecord, customMerge) {
  const merged = { ...localRecord };
  const allKeys = new Set([
    ...Object.keys(localRecord || {}),
    ...Object.keys(importRecord || {}),
    ...Object.keys(customMerge || {})
  ]);

  allKeys.forEach((key) => {
    if (key === 'timeline' || key === 'id' || key === 'businessKey') return;

    if (customMerge && customMerge.hasOwnProperty(key)) {
      merged[key] = customMerge[key];
    } else if (importRecord && importRecord.hasOwnProperty(key) && !localRecord.hasOwnProperty(key)) {
      merged[key] = importRecord[key];
    } else if (localRecord && localRecord.hasOwnProperty(key)) {
      merged[key] = localRecord[key];
    }
  });

  if (importRecord && importRecord.temps && importRecord.temps.length > 0) {
    const mergedTemps = [...(localRecord.temps || [])];
    importRecord.temps.forEach((t) => {
      if (!mergedTemps.includes(t)) {
        mergedTemps.push(t);
      }
    });
    if (mergedTemps.length > (localRecord.temps || []).length) {
      merged.temps = mergedTemps;
    }
  }

  return merged;
}

function resolveConflict(conflict, resolution, customMerge) {
  const { localRecord, importRecord } = conflict;
  const now = new Date().toISOString();

  switch (resolution) {
    case 'keepLocal': {
      const result = { ...localRecord };
      Object.keys(importRecord || {}).forEach((key) => {
        if (key === 'id' || key === 'businessKey' || key === 'timeline' || key === 'createdAt' || key === 'updatedAt') return;
        if (!result.hasOwnProperty(key) && importRecord[key] !== undefined && importRecord[key] !== null && importRecord[key] !== '') {
          result[key] = importRecord[key];
        }
      });
      result.updatedAt = now;
      if (importRecord?.temps && importRecord.temps.length > 0) {
        const mergedTemps = [...(localRecord.temps || [])];
        importRecord.temps.forEach((t) => {
          if (!mergedTemps.includes(t)) mergedTemps.push(t);
        });
        if (mergedTemps.length > (localRecord.temps || []).length) result.temps = mergedTemps;
      }
      return result;
    }

    case 'useImport': {
      const result = { ...importRecord };
      result.id = localRecord.id;
      result.businessKey = localRecord.businessKey;
      if (!result.createdAt) result.createdAt = localRecord.createdAt;
      result.updatedAt = now;
      if (localRecord?.temps && localRecord.temps.length > 0) {
        const mergedTemps = [...(importRecord.temps || [])];
        localRecord.temps.forEach((t) => {
          if (!mergedTemps.includes(t)) mergedTemps.push(t);
        });
        if (mergedTemps.length > (importRecord.temps || []).length) result.temps = mergedTemps;
      }
      return result;
    }

    case 'manual': {
      const merged = mergeRecordFields(localRecord, importRecord, customMerge);
      return {
        ...merged,
        timeline: mergeTimelines(localRecord.timeline || [], importRecord.timeline || []),
        updatedAt: now
      };
    }

    default:
      return localRecord;
  }
}

function mergeTimelines(localTimeline, importTimeline) {
  const merged = [];
  const seen = new Set();

  const all = [...localTimeline, ...importTimeline];

  all.forEach((entry) => {
    const key = getTimelineEntryKey(entry);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(entry);
    }
  });

  merged.sort((a, b) => {
    const timeA = new Date(a.at || 0).getTime();
    const timeB = new Date(b.at || 0).getTime();
    return timeA - timeB;
  });

  return merged;
}

function buildMergeData(records, reminderSettings, routePlans, deviceInfo, eventExport) {
  return {
    appId: MERGE_DATA_APP_ID,
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    deviceInfo: deviceInfo || { name: '未知设备', id: uid() },
    eventStoreVersion: EVENT_STORE_VERSION,
    data: {
      records,
      reminderSettings,
      routePlans
    },
    eventStream: eventExport
  };
}

function validateMergeData(parsed, options = {}) {
  const { primaryStatus, today } = options;
  const errors = [];
  const warnings = [];

  if (!parsed || typeof parsed !== 'object') {
    errors.push('文件格式错误：不是有效的JSON对象');
    return { valid: false, errors, warnings, summary: null, recordErrors: [] };
  }

  if (!parsed.appId) {
    errors.push('文件格式错误：缺少 appId 标识，可能不是本系统导出的文件');
  } else if (parsed.appId !== MERGE_DATA_APP_ID && parsed.appId !== DATA_EXPORT_APP_ID) {
    errors.push(`文件来源不匹配：期望 ${MERGE_DATA_APP_ID}，实际为 ${parsed.appId}`);
  }

  if (!parsed.version) {
    warnings.push('缺少版本信息，可能存在兼容性风险');
  } else if (parsed.version.startsWith('2.')) {
    if (!parsed.eventStream || !Array.isArray(parsed.eventStream.events)) {
      warnings.push('v2.x 文件缺少事件流数据，将回退到记录级合并');
    }
  }

  if (!parsed.data || typeof parsed.data !== 'object') {
    errors.push('文件结构错误：缺少 data 节点');
    return { valid: false, errors, warnings, summary: null, recordErrors: [] };
  }

  const { data } = parsed;

  if (!Array.isArray(data.records)) {
    errors.push('字段缺失：records 应为数组');
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings, summary: null, recordErrors: [] };
  }

  const migratedRecords = migrateRecords(data.records, { primaryStatus, today });
  const summary = computeDataSummary(migratedRecords);

  let eventBasedMerge = false;
  let eventStream = null;
  if (parsed.version && parsed.version.startsWith('2.') && parsed.eventStream && Array.isArray(parsed.eventStream.events)) {
    eventStream = parsed.eventStream;
    eventBasedMerge = true;
    warnings.push(`检测到 ${parsed.eventStream.events.length} 条事件流数据，将启用细粒度事件级合并`);
  }

  return {
    valid: true,
    errors,
    warnings,
    summary,
    recordErrors: [],
    data: {
      ...data,
      records: migratedRecords
    },
    deviceInfo: parsed.deviceInfo,
    eventBasedMerge,
    eventStream
  };
}

function buildExportData(records, reminderSettings, routePlans, riskRules, eventExport) {
  return {
    appId: DATA_EXPORT_APP_ID,
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    eventStoreVersion: EVENT_STORE_VERSION,
    data: {
      records,
      reminderSettings,
      routePlans,
      riskRules
    },
    eventStream: eventExport
  };
}

function validateRecordsDetail(records, appConfig) {
  const recordErrors = [];
  const validCycles = appConfig.fields.find(f => f.key === 'cycle')?.options || [];
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const validStatuses = appConfig.statuses;
  const fieldLabels = {};
  appConfig.fields.forEach(f => { fieldLabels[f.key] = f.label; });

  records.forEach((record, index) => {
    const errors = [];

    appConfig.fields.forEach(field => {
      const value = record[field.key];
      const label = field.label;
      if (!value) {
        errors.push({ type: 'missing', field: label, key: field.key });
      } else if (field.key === 'cycle' && !validCycles.includes(value)) {
        errors.push({ type: 'invalidCycle', field: label, value, key: field.key });
      } else if (field.key === 'nextDate') {
        if (!datePattern.test(value)) {
          errors.push({ type: 'invalidDate', field: label, value, key: field.key });
        } else {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            errors.push({ type: 'invalidDate', field: label, value, key: field.key });
          }
        }
      }
    });

    if (record.status && !validStatuses.includes(record.status)) {
      errors.push({ type: 'invalidStatus', field: '当前状态', value: record.status, key: 'status' });
    }

    if (errors.length > 0) {
      recordErrors.push({
        index,
        record,
        errors
      });
    }
  });

  const seenElevatorNos = {};
  records.forEach((record, index) => {
    const elevatorNo = record.elevatorNo;
    if (elevatorNo) {
      if (seenElevatorNos[elevatorNo]) {
        const existingError = recordErrors.find(e => e.index === index);
        if (existingError) {
          existingError.errors.push({ type: 'duplicate', field: '电梯编号', value: elevatorNo, key: 'elevatorNo' });
        } else {
          recordErrors.push({
            index,
            record,
            errors: [{ type: 'duplicate', field: '电梯编号', value: elevatorNo, key: 'elevatorNo' }]
          });
        }
        seenElevatorNos[elevatorNo].push(index);
      } else {
        seenElevatorNos[elevatorNo] = [index];
      }
    }
  });

  Object.entries(seenElevatorNos).forEach(([no, indices]) => {
    if (indices.length > 1) {
      indices.forEach(idx => {
        const errItem = recordErrors.find(e => e.index === idx);
        if (!errItem) {
          recordErrors.push({
            index: idx,
            record: records[idx],
            errors: [{ type: 'duplicate', field: '电梯编号', value: no, key: 'elevatorNo' }]
          });
        }
      });
    }
  });

  return {
    recordErrors,
    invalidRecordCount: new Set(recordErrors.map(e => e.index)).size
  };
}

function validateImportData(parsed, appConfig, options = {}) {
  const { primaryStatus, today } = options;
  const errors = [];
  const warnings = [];

  if (!parsed || typeof parsed !== 'object') {
    errors.push('文件格式错误：不是有效的JSON对象');
    return { valid: false, errors, warnings, summary: null, recordErrors: [] };
  }

  if (!parsed.appId) {
    errors.push('文件格式错误：缺少 appId 标识，可能不是本系统导出的文件');
  } else if (parsed.appId !== DATA_EXPORT_APP_ID) {
    errors.push(`文件来源不匹配：期望 ${DATA_EXPORT_APP_ID}，实际为 ${parsed.appId}`);
  }

  if (!parsed.version) {
    warnings.push('缺少版本信息，可能存在兼容性风险');
  } else if (parsed.version.startsWith('2.')) {
    if (!parsed.eventStream || !Array.isArray(parsed.eventStream.events)) {
      warnings.push('v2.x 文件缺少事件流数据，将仅恢复记录快照');
    } else {
      warnings.push(`检测到 ${parsed.eventStream.events.length} 条事件流数据，将恢复完整历史时间线`);
    }
  } else if (parsed.version !== DATA_EXPORT_VERSION) {
    warnings.push(`版本不一致：当前系统 v2.0.0，导入文件 v${parsed.version}，部分字段可能不兼容`);
  }

  if (!parsed.data || typeof parsed.data !== 'object') {
    errors.push('文件结构错误：缺少 data 节点');
    return { valid: false, errors, warnings, summary: null, recordErrors: [] };
  }

  const { data } = parsed;

  if (!Array.isArray(data.records)) {
    errors.push('字段缺失：records 应为数组');
  }

  if (!data.reminderSettings || typeof data.reminderSettings !== 'object') {
    errors.push('字段缺失：reminderSettings 应为对象');
  }

  if (!data.routePlans || typeof data.routePlans !== 'object') {
    errors.push('字段缺失：routePlans 应为对象');
  }

  if (!data.riskRules || typeof data.riskRules !== 'object') {
    warnings.push('导入文件中缺少风险规则配置，将使用系统默认值');
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings, summary: null, recordErrors: [] };
  }

  const { recordErrors, invalidRecordCount } = validateRecordsDetail(data.records, appConfig);
  if (recordErrors.length > 0) {
    const recordErrorSummary = `记录校验失败：共 ${invalidRecordCount} 条记录存在字段缺失或格式错误`;
    errors.push(recordErrorSummary);
    const summary = computeDataSummary(data.records);
    return { valid: false, errors, warnings, summary, recordErrors, data };
  }

  const summary = computeDataSummary(data.records);
  return {
    valid: true,
    errors,
    warnings,
    summary,
    recordErrors: [],
    data,
    eventStream: parsed.eventStream || null
  };
}

function computeDataSummary(records) {
  const recordCount = records.length;
  const owners = new Set();
  let earliestDate = null;
  let latestDate = null;

  records.forEach((item) => {
    if (item.owner) owners.add(item.owner);
    if (item.nextDate) {
      if (!earliestDate || item.nextDate < earliestDate) earliestDate = item.nextDate;
      if (!latestDate || item.nextDate > latestDate) latestDate = item.nextDate;
    }
  });

  return {
    recordCount,
    ownerCount: owners.size,
    earliestDate,
    latestDate
  };
}

function downloadJSON(data, filename) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function assembleMergedRecords(mergeNoConflicts, mergeConflicts, conflictResolutions) {
  const mergedRecords = [];
  const seenKeys = new Set();

  if (mergeNoConflicts?.localOnly) {
    mergeNoConflicts.localOnly.forEach((record) => {
      const key = getBusinessKey(record);
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        mergedRecords.push(record);
      }
    });
  }

  if (mergeNoConflicts?.importOnly) {
    mergeNoConflicts.importOnly.forEach((record) => {
      const key = getBusinessKey(record);
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        mergedRecords.push(record);
      }
    });
  }

  if (mergeNoConflicts?.autoMergeable) {
    mergeNoConflicts.autoMergeable.forEach(({ localRecord, importRecord }) => {
      const key = getBusinessKey(localRecord);
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const merged = mergeRecordFields(localRecord, importRecord, null);
        mergedRecords.push(merged);
      }
    });
  }

  mergeConflicts.forEach((conflict, index) => {
    const key = conflict.key;
    const resolution = conflictResolutions[index];
    if (resolution && !seenKeys.has(key)) {
      seenKeys.add(key);
      const resolvedRecord = resolveConflict(conflict, resolution.resolution, resolution.customMerge);
      mergedRecords.push(resolvedRecord);
    }
  });

  return migrateRecords(mergedRecords);
}

function mergeImportSettings(localReminderSettings, localRoutePlans, localRiskRules, importData, defaultReminderSettings, defaultRiskRules) {
  let finalReminderSettings = localReminderSettings;
  let finalRoutePlans = localRoutePlans;
  let finalRiskRules = localRiskRules;

  if (importData.reminderSettings) {
    finalReminderSettings = { ...defaultReminderSettings, ...localReminderSettings, ...importData.reminderSettings };
  }
  if (importData.routePlans) {
    finalRoutePlans = { ...localRoutePlans, ...importData.routePlans };
  }
  if (importData.riskRules) {
    finalRiskRules = { ...defaultRiskRules, ...localRiskRules, ...importData.riskRules };
  }

  return { finalReminderSettings, finalRoutePlans, finalRiskRules };
}

function buildManualMergeInitialForm(conflict, appConfigFields) {
  const initialForm = {};
  CONFLICT_FIELDS.forEach(({ key }) => {
    if (conflict.localRecord.hasOwnProperty(key) || conflict.importRecord.hasOwnProperty(key)) {
      initialForm[key] = conflict.localRecord[key];
    }
  });
  appConfigFields.forEach((field) => {
    if (!initialForm.hasOwnProperty(field.key)) {
      initialForm[field.key] = conflict.localRecord[field.key];
    }
  });
  return initialForm;
}

export {
  DATA_EXPORT_VERSION,
  DATA_EXPORT_APP_ID,
  MERGE_DATA_VERSION,
  MERGE_DATA_APP_ID,
  MERGE_HISTORY_STORAGE_KEY,
  MERGE_HISTORY_LIMIT,
  CONFLICT_FIELDS,
  uid,
  withIds,
  getBusinessKey,
  normalizeTimelineEntry,
  migrateRecord,
  migrateRecords,
  recordsNeedMigration,
  loadRecords,
  loadMergeHistory,
  saveMergeHistory,
  createDataSnapshot,
  getCurrentFullState,
  detectConflicts,
  getTimelineEntryKey,
  detectTimelineConflict,
  mergeRecordFields,
  resolveConflict,
  mergeTimelines,
  buildMergeData,
  validateMergeData,
  buildExportData,
  validateImportData,
  validateRecordsDetail,
  computeDataSummary,
  downloadJSON,
  assembleMergedRecords,
  mergeImportSettings,
  buildManualMergeInitialForm
};
