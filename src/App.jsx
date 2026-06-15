import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Plus, Search, Trash2, RotateCcw, CheckCircle2, AlertTriangle, ClipboardList, CalendarDays, ChevronLeft, ChevronRight, LayoutGrid, Calendar, Users, User, Settings, X, Bell, Zap, Upload, FileText, XCircle, Route, MapPin, ArrowUp, ArrowDown, GripVertical, Save, ChevronDown, ShieldAlert, AlertOctagon, Clock, UserX, Building, Download, HardDrive, Database, RefreshCw, FileJson, Printer, FileSpreadsheet } from 'lucide-react';
import './App.css';

const appConfig = {
  "id": "hxwl-61303",
  "port": 61303,
  "title": "电梯维保路线看板",
  "subtitle": "楼盘电梯维保周期、到期风险和完成状态",
  "domain": "电梯维保",
  "icon": "Building2",
  "storage": "hxwl-61303-elevator-maintenance",
  "accent": "#2563eb",
  "statuses": [
    "待维保",
    "今日执行",
    "已完成"
  ],
  "primaryStatus": "待维保",
  "fields": [
    {
      "key": "estate",
      "label": "楼盘",
      "type": "input",
      "placeholder": "星河湾",
      "options": []
    },
    {
      "key": "building",
      "label": "楼栋",
      "type": "input",
      "placeholder": "3栋",
      "options": []
    },
    {
      "key": "elevatorNo",
      "label": "电梯编号",
      "type": "input",
      "placeholder": "E-032",
      "options": []
    },
    {
      "key": "cycle",
      "label": "维保周期",
      "type": "select",
      "placeholder": "15天",
      "options": [
        "7天",
        "15天",
        "30天"
      ]
    },
    {
      "key": "nextDate",
      "label": "下次维保日期",
      "type": "date",
      "placeholder": "",
      "options": []
    },
    {
      "key": "owner",
      "label": "负责人",
      "type": "input",
      "placeholder": "赵师傅",
      "options": []
    }
  ],
  "seed": [
    {
      "estate": "星河湾",
      "building": "3栋",
      "elevatorNo": "E-032",
      "cycle": "15天",
      "nextDate": "2026-06-13",
      "owner": "赵师傅",
      "status": "今日执行"
    },
    {
      "estate": "海棠府",
      "building": "1栋",
      "elevatorNo": "E-118",
      "cycle": "15天",
      "nextDate": "2026-06-12",
      "owner": "钱师傅",
      "status": "待维保"
    },
    {
      "estate": "东城国际",
      "building": "8栋",
      "elevatorNo": "E-220",
      "cycle": "30天",
      "nextDate": "2026-06-25",
      "owner": "孙师傅",
      "status": "已完成"
    },
    {
      "estate": "翠湖天地",
      "building": "2栋",
      "elevatorNo": "E-305",
      "cycle": "15天",
      "nextDate": "2026-06-15",
      "owner": "李师傅",
      "status": "待维保"
    },
    {
      "estate": "金茂府",
      "building": "5栋",
      "elevatorNo": "E-410",
      "cycle": "7天",
      "nextDate": "2026-06-14",
      "owner": "周师傅",
      "status": "待维保"
    }
  ],
  "metrics": [
    [
      "设备数",
      "records.length"
    ],
    [
      "逾期",
      "records.filter((item) => item.nextDate < today && item.status !== '已完成').length"
    ],
    [
      "今日",
      "records.filter((item) => item.nextDate === today).length"
    ]
  ],
  "filters": [
    {
      "key": "query",
      "label": "楼盘/编号",
      "type": "search",
      "match": "`${item.estate}${item.elevatorNo}${item.owner}`.includes(filters.query)"
    },
    {
      "key": "status",
      "label": "维保状态",
      "type": "status"
    }
  ],
  "cardTitle": "`${item.estate} ${item.building}`",
  "cardMeta": "`${item.elevatorNo} · ${item.cycle} · ${item.owner}`",
  "cardDetail": "`下次维保：${item.nextDate}`",
  "dateKey": "nextDate",
  "note": "适合电脑和平板使用，先用本地数据完成排期闭环。",
  "defaultValues": {
    "estate": "星河湾",
    "building": "3栋",
    "elevatorNo": "E-032",
    "cycle": "15天",
    "nextDate": "",
    "owner": "赵师傅",
    "status": "待维保"
  }
};

function getLocalToday() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const today = getLocalToday();

function daysBetween(dateText1, dateText2) {
  const d1 = new Date(dateText1 + 'T00:00:00');
  const d2 = new Date(dateText2 + 'T00:00:00');
  return Math.round((d1.getTime() - d2.getTime()) / 86400000);
}

const REMINDER_STORAGE_KEY = 'hxwl-61303-reminder-settings';
const DEFAULT_REMINDER_SETTINGS = {
  '7天': 2,
  '15天': 3,
  '30天': 7
};

const RISK_RULES_STORAGE_KEY = 'hxwl-61303-risk-rules';
const DEFAULT_RISK_RULES = {
  overdueEnabled: true,
  overdueLabel: '逾期未维保',
  soonExpireDays: 3,
  soonExpireEnabled: true,
  soonExpireLabel: '即将到期',
  overloadThreshold: 5,
  overloadEnabled: true,
  overloadLabel: '任务过载',
  estateConcentrationThreshold: 3,
  estateConcentrationWindow: 7,
  estateConcentrationEnabled: true,
  estateConcentrationLabel: '集中到期'
};

const ROUTE_PLANS_STORAGE_KEY = 'hxwl-61303-route-plans';
const DATA_EXPORT_VERSION = '1.1.0';
const DATA_EXPORT_APP_ID = 'hxwl-61303-elevator-maintenance';
const MERGE_DATA_VERSION = '1.0.0';
const MERGE_DATA_APP_ID = 'hxwl-61303-elevator-maintenance';

const AUTO_PLAN_DRAFT_STORAGE_KEY = 'hxwl-61303-auto-plan-draft';
const AUTO_PLAN_HISTORY_STORAGE_KEY = 'hxwl-61303-auto-plan-history';
const AUTO_PLAN_CONFIG_STORAGE_KEY = 'hxwl-61303-auto-plan-config';

const DEFAULT_AUTO_PLAN_CONFIG = {
  planDays: 30,
  defaultDailyLimit: 5,
  ownerDailyLimits: {},
  estateConcentration: true,
  priorityOverdue: true,
  prioritySoon: true,
  allowAdvanceScheduling: false,
  maxAdvanceDays: 0
};

function loadAutoPlanDraft() {
  const raw = localStorage.getItem(AUTO_PLAN_DRAFT_STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

function saveAutoPlanDraft(draft) {
  localStorage.setItem(AUTO_PLAN_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

function clearAutoPlanDraft() {
  localStorage.removeItem(AUTO_PLAN_DRAFT_STORAGE_KEY);
}

function loadAutoPlanHistory() {
  const raw = localStorage.getItem(AUTO_PLAN_HISTORY_STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return [];
}

function saveAutoPlanHistory(history) {
  localStorage.setItem(AUTO_PLAN_HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
}

function loadAutoPlanConfig() {
  const raw = localStorage.getItem(AUTO_PLAN_CONFIG_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_AUTO_PLAN_CONFIG, ...parsed };
    } catch {
      return { ...DEFAULT_AUTO_PLAN_CONFIG };
    }
  }
  return { ...DEFAULT_AUTO_PLAN_CONFIG };
}

function saveAutoPlanConfig(config) {
  localStorage.setItem(AUTO_PLAN_CONFIG_STORAGE_KEY, JSON.stringify(config));
}

function planUid() {
  return 'plan_' + Math.random().toString(36).slice(2, 12);
}

function getNextDays(count) {
  const dates = [];
  const now = new Date(today + 'T00:00:00');
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    dates.push(formatDate(d));
  }
  return dates;
}

function loadRoutePlans() {
  const raw = localStorage.getItem(ROUTE_PLANS_STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
}

function saveRoutePlans(plans) {
  localStorage.setItem(ROUTE_PLANS_STORAGE_KEY, JSON.stringify(plans));
}

function getEmptyRoutePlan(date) {
  return {
    date,
    routes: [],
    updatedAt: null
  };
}

function routeUid() {
  return 'rt_' + Math.random().toString(36).slice(2, 10);
}

function loadReminderSettings() {
  const raw = localStorage.getItem(REMINDER_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_REMINDER_SETTINGS, ...parsed };
    } catch {
      return { ...DEFAULT_REMINDER_SETTINGS };
    }
  }
  return { ...DEFAULT_REMINDER_SETTINGS };
}

function saveReminderSettings(settings) {
  localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(settings));
}

function loadRiskRules() {
  const raw = localStorage.getItem(RISK_RULES_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_RISK_RULES, ...parsed };
    } catch {
      return { ...DEFAULT_RISK_RULES };
    }
  }
  return { ...DEFAULT_RISK_RULES };
}

function saveRiskRules(rules) {
  localStorage.setItem(RISK_RULES_STORAGE_KEY, JSON.stringify(rules));
}

function getReminderStatus(item, reminderSettings) {
  if (!item.nextDate) return { type: 'none', label: '', daysLeft: null };
  if (item.status === '已完成') return { type: 'none', label: '', daysLeft: null };

  const diff = daysBetween(item.nextDate, today);

  if (diff < 0) {
    return { type: 'overdue', label: '已逾期', daysLeft: diff };
  } else if (diff === 0) {
    return { type: 'today', label: '今日到期', daysLeft: 0 };
  } else {
    const advanceDays = reminderSettings[item.cycle] || 0;
    if (diff <= advanceDays) {
      return { type: 'soon', label: `即将到期（${diff}天）`, daysLeft: diff };
    }
  }
  return { type: 'none', label: '', daysLeft: diff };
}

function reminderStatusClass(type) {
  return {
    overdue: 'reminder-overdue',
    today: 'reminder-today',
    soon: 'reminder-soon',
    none: ''
  }[type] || '';
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function withIds(items) {
  return items.map((item) => ({ id: uid(), timeline: item.timeline || [{ status: item.status, at: today, by: '系统' }], ...item }));
}

function getBusinessKey(record) {
  return record.businessKey || record.elevatorNo || '';
}

function normalizeTimelineEntry(entry, defaultStatus) {
  if (!entry || typeof entry !== 'object') return null;
  return {
    status: entry.status || defaultStatus || appConfig.primaryStatus,
    at: entry.at || today,
    by: entry.by || '系统',
    ...(entry.notes ? { notes: entry.notes } : {}),
    ...(entry.backfill ? { backfill: entry.backfill } : {})
  };
}

function migrateRecord(record, options = {}) {
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
    migrated.timeline = [{ status: migrated.status || appConfig.primaryStatus, at: today, by: '系统迁移' }];
  } else if (Array.isArray(migrated.timeline)) {
    const normalizedTimeline = migrated.timeline
      .map(e => normalizeTimelineEntry(e, migrated.status))
      .filter(Boolean);
    if (normalizedTimeline.length > 0) {
      migrated.timeline = normalizedTimeline;
    } else {
      migrated.timeline = [{ status: migrated.status || appConfig.primaryStatus, at: today, by: '系统迁移' }];
    }
  }
  
  if (!migrated.status) {
    migrated.status = appConfig.primaryStatus;
  }
  
  return migrated;
}

function migrateRecords(records) {
  return records.map((record) => migrateRecord(record));
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

function loadRecords() {
  const raw = localStorage.getItem(appConfig.storage);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const migrated = migrateRecords(parsed);
      if (recordsNeedMigration(parsed, migrated)) {
        localStorage.setItem(appConfig.storage, JSON.stringify(migrated));
      }
      return migrated;
    } catch {
      const seeded = withIds(appConfig.seed);
      return migrateRecords(seeded);
    }
  }
  const seeded = withIds(appConfig.seed);
  return migrateRecords(seeded);
}

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

function getTimelineEntryKey(entry) {
  const status = entry.status || '';
  const at = entry.at || '';
  const by = entry.by || '';
  const notes = entry.notes || '';
  return `${status}-${at}-${by}-${notes}`;
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

function buildMergeData(records, reminderSettings, routePlans, deviceInfo) {
  return {
    appId: MERGE_DATA_APP_ID,
    version: MERGE_DATA_VERSION,
    exportedAt: new Date().toISOString(),
    deviceInfo: deviceInfo || { name: '未知设备', id: uid() },
    data: {
      records,
      reminderSettings,
      routePlans
    }
  };
}

function validateMergeData(parsed) {
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

  const migratedRecords = migrateRecords(data.records);
  const summary = computeDataSummary(migratedRecords);
  
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
    deviceInfo: parsed.deviceInfo
  };
}

function buildExportData(records, reminderSettings, routePlans, riskRules) {
  return {
    appId: DATA_EXPORT_APP_ID,
    version: DATA_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      records,
      reminderSettings,
      routePlans,
      riskRules
    }
  };
}

function validateImportData(parsed) {
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
  } else if (parsed.version !== DATA_EXPORT_VERSION) {
    warnings.push(`版本不一致：当前系统 v${DATA_EXPORT_VERSION}，导入文件 v${parsed.version}，部分字段可能不兼容`);
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

  const { recordErrors, invalidRecordCount } = validateRecordsDetail(data.records);
  if (recordErrors.length > 0) {
    const recordErrorSummary = `记录校验失败：共 ${invalidRecordCount} 条记录存在字段缺失或格式错误`;
    errors.push(recordErrorSummary);
    const summary = computeDataSummary(data.records);
    return { valid: false, errors, warnings, summary, recordErrors, data };
  }

  const summary = computeDataSummary(data.records);
  return { valid: true, errors, warnings, summary, recordErrors: [], data };
}

function validateRecordsDetail(records) {
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

function avg(numbers) {
  const valid = numbers.filter((value) => Number.isFinite(value));
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function money(value) {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(value || 0);
}

function inNextDays(dateText, days) {
  if (!dateText) return false;
  const diff = daysBetween(dateText, today);
  return diff >= 0 && diff <= days;
}

function latestTemp(item) {
  const temps = item.temps || [Number(item.temperature)];
  return temps[temps.length - 1];
}

function hasHotTemp(item) {
  const temps = item.temps || [Number(item.temperature)];
  return temps.some((value) => Number(value) > 2);
}

function priorityRank(value) {
  return { 危急: 0, 加急: 1, 常规: 2, 高: 0, 中: 1, 低: 2 }[value] ?? 9;
}

function hasOverlap(target, records) {
  if (!target.bed || !target.date || !target.start || !target.end) return false;
  return records.some((item) => item.id !== target.id && item.bed === target.bed && item.date === target.date && target.start < item.end && target.end > item.start);
}

function statusClass(status) {
  const index = appConfig.statuses.indexOf(status);
  return ['status-a', 'status-b', 'status-c', 'status-d'][index] || 'status-a';
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekDates(offset = 0) {
  const now = new Date(today);
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + offset * 7);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(formatDate(d));
  }
  return dates;
}

function getWeekLabel(offset = 0) {
  const dates = getWeekDates(offset);
  const start = new Date(dates[0]);
  const end = new Date(dates[6]);
  return `${start.getMonth() + 1}月${start.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`;
}

const weekdayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function App() {
  const [records, setRecords] = useState(loadRecords);
  const [form, setForm] = useState(appConfig.defaultValues);
  const [filters, setFilters] = useState({ query: '', status: '全部' });
  const [selected, setSelected] = useState(null);
  const [viewMode, setViewMode] = useState('group');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [workbenchView, setWorkbenchView] = useState(false);
  const [reminderSettings, setReminderSettings] = useState(loadReminderSettings);
  const [riskRules, setRiskRules] = useState(loadRiskRules);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('reminder');
  const [tempSettings, setTempSettings] = useState(loadReminderSettings);
  const [tempRiskRules, setTempRiskRules] = useState(loadRiskRules);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const editFormRef = useRef(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [parsedImport, setParsedImport] = useState(null);
  const [importMeta, setImportMeta] = useState({ fieldMapping: null, hasHeader: false, headerCells: null });
  const [routePlanningView, setRoutePlanningView] = useState(false);
  const [routePlans, setRoutePlans] = useState(loadRoutePlans);
  const [selectedRouteDate, setSelectedRouteDate] = useState(today);
  const [routeQuery, setRouteQuery] = useState('');
  const [expandedEstates, setExpandedEstates] = useState({});
  const [showBackfillModal, setShowBackfillModal] = useState(false);
  const [backfillItem, setBackfillItem] = useState(null);
  const [backfillForm, setBackfillForm] = useState({ completedAt: '', executor: '', notes: '', nextDate: '' });
  const [riskDashboardView, setRiskDashboardView] = useState(false);
  const [expandedRisks, setExpandedRisks] = useState({});
  const [showDataManager, setShowDataManager] = useState(false);
  const [dataManagerTab, setDataManagerTab] = useState('export');
  const [importFile, setImportFile] = useState(null);
  const [importFileName, setImportFileName] = useState('');
  const [importValidation, setImportValidation] = useState(null);
  const [importConfirmStep, setImportConfirmStep] = useState(false);
  const fileInputRef = useRef(null);
  const mergeFileInputRef = useRef(null);
  const [mergeFile, setMergeFile] = useState(null);
  const [mergeFileName, setMergeFileName] = useState('');
  const [mergeValidation, setMergeValidation] = useState(null);
  const [mergeConflicts, setMergeConflicts] = useState([]);
  const [mergeNoConflicts, setMergeNoConflicts] = useState(null);
  const [mergeStep, setMergeStep] = useState('upload');
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0);
  const [conflictResolutions, setConflictResolutions] = useState({});
  const [manualMergeForm, setManualMergeForm] = useState({});
  const [showManualMergeModal, setShowManualMergeModal] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({ name: '', id: '' });
  const [autoPlanView, setAutoPlanView] = useState(false);
  const [autoPlanDraft, setAutoPlanDraft] = useState(loadAutoPlanDraft);
  const [autoPlanHistory, setAutoPlanHistory] = useState(loadAutoPlanHistory);
  const [autoPlanConfig, setAutoPlanConfig] = useState(loadAutoPlanConfig);
  const [tempAutoPlanConfig, setTempAutoPlanConfig] = useState(loadAutoPlanConfig);
  const [showAutoPlanConfig, setShowAutoPlanConfig] = useState(false);
  const [expandedPlanDates, setExpandedPlanDates] = useState({});
  const [planEditItem, setPlanEditItem] = useState(null);
  const [planEditForm, setPlanEditForm] = useState({ date: '', owner: '' });
  const [showEstateSuggestions, setShowEstateSuggestions] = useState(false);
  const [showOwnerSuggestions, setShowOwnerSuggestions] = useState(false);
  const [estateInputValue, setEstateInputValue] = useState('');
  const [ownerInputValue, setOwnerInputValue] = useState('');
  const [calendarFilters, setCalendarFilters] = useState({ owner: '全部', cycle: '全部' });
  const [showPrintExportModal, setShowPrintExportModal] = useState(false);

  const estateMetadata = useMemo(() => {
    const meta = {};
    records.forEach((record) => {
      const estate = record.estate;
      if (!estate) return;
      if (!meta[estate]) {
        meta[estate] = {
          estate,
          ownerCounts: {},
          cycleCounts: {},
          ownerLastUsed: {},
          cycleLastUsed: {},
          lastUsedAt: record.updatedAt || record.createdAt || ''
        };
      }
      const owner = record.owner || '';
      const cycle = record.cycle || '';
      const recordDate = record.updatedAt || record.createdAt || '';
      
      meta[estate].ownerCounts[owner] = (meta[estate].ownerCounts[owner] || 0) + 1;
      meta[estate].cycleCounts[cycle] = (meta[estate].cycleCounts[cycle] || 0) + 1;
      
      if (!meta[estate].ownerLastUsed[owner] || recordDate > meta[estate].ownerLastUsed[owner]) {
        meta[estate].ownerLastUsed[owner] = recordDate;
      }
      if (!meta[estate].cycleLastUsed[cycle] || recordDate > meta[estate].cycleLastUsed[cycle]) {
        meta[estate].cycleLastUsed[cycle] = recordDate;
      }
      
      if (recordDate > meta[estate].lastUsedAt) {
        meta[estate].lastUsedAt = recordDate;
      }
    });
    return meta;
  }, [records]);

  const uniqueEstates = useMemo(() => {
    return Object.values(estateMetadata)
      .sort((a, b) => {
        if (a.lastUsedAt && b.lastUsedAt) {
          return b.lastUsedAt.localeCompare(a.lastUsedAt);
        }
        return a.estate.localeCompare(b.estate);
      })
      .map(m => m.estate);
  }, [estateMetadata]);

  const uniqueOwners = useMemo(() => {
    const ownerCounts = {};
    records.forEach((record) => {
      const owner = record.owner;
      if (owner) {
        ownerCounts[owner] = (ownerCounts[owner] || 0) + 1;
      }
    });
    return Object.entries(ownerCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([owner]) => owner);
  }, [records]);

  const uniqueCycles = useMemo(() => {
    const cycles = new Set();
    records.forEach((record) => {
      if (record.cycle) {
        cycles.add(record.cycle);
      }
    });
    return Array.from(cycles).sort();
  }, [records]);

  const filteredEstateSuggestions = useMemo(() => {
    if (!estateInputValue.trim()) return uniqueEstates;
    const query = estateInputValue.toLowerCase();
    return uniqueEstates.filter(estate => 
      estate.toLowerCase().includes(query)
    );
  }, [estateInputValue, uniqueEstates]);

  const filteredOwnerSuggestions = useMemo(() => {
    if (!ownerInputValue.trim()) {
      if (form.estate && estateMetadata[form.estate]) {
        const estateMeta = estateMetadata[form.estate];
        const estateOwners = Object.entries(estateMeta.ownerLastUsed)
          .filter(([owner]) => owner)
          .sort((a, b) => b[1].localeCompare(a[1]))
          .map(([owner]) => owner);
        const otherOwners = uniqueOwners.filter(o => !estateOwners.includes(o));
        return [...estateOwners, ...otherOwners];
      }
      return uniqueOwners;
    }
    const query = ownerInputValue.toLowerCase();
    return uniqueOwners.filter(owner => 
      owner.toLowerCase().includes(query)
    );
  }, [ownerInputValue, uniqueOwners, form.estate, estateMetadata]);

  function formatRelativeDate(dateStr) {
    if (!dateStr) return '';
    const diff = daysBetween(today, dateStr.split('T')[0]);
    if (diff === 0) return '今天';
    if (diff === 1) return '昨天';
    if (diff < 30) return `${diff}天前`;
    if (diff < 365) return `${Math.floor(diff / 30)}个月前`;
    return `${Math.floor(diff / 365)}年前`;
  }

  function getEstateDefaults(estateName) {
    const meta = estateMetadata[estateName];
    if (!meta) return { owner: '', cycle: '' };
    
    const topOwner = Object.entries(meta.ownerLastUsed)
      .filter(([owner]) => owner)
      .sort((a, b) => b[1].localeCompare(a[1]))
      .map(([owner]) => owner)[0] || '';
    
    const topCycle = Object.entries(meta.cycleLastUsed)
      .filter(([cycle]) => cycle)
      .sort((a, b) => b[1].localeCompare(a[1]))
      .map(([cycle]) => cycle)[0] || '';
    
    return { owner: topOwner, cycle: topCycle };
  }

  function handleEstateSelect(estateName) {
    const defaults = getEstateDefaults(estateName);
    setForm(prev => ({
      ...prev,
      estate: estateName,
      owner: defaults.owner || prev.owner,
      cycle: defaults.cycle || prev.cycle
    }));
    setEstateInputValue(estateName);
    setShowEstateSuggestions(false);
  }

  function handleOwnerSelect(ownerName) {
    setForm(prev => ({ ...prev, owner: ownerName }));
    setOwnerInputValue(ownerName);
    setShowOwnerSuggestions(false);
  }

  function closeSuggestionsOnClick(e) {
    if (!e.target.closest('.autocomplete-wrapper')) {
      setShowEstateSuggestions(false);
      setShowOwnerSuggestions(false);
    }
  }

  useEffect(() => {
    document.addEventListener('click', closeSuggestionsOnClick);
    return () => document.removeEventListener('click', closeSuggestionsOnClick);
  }, []);

  useEffect(() => {
    setEstateInputValue(form.estate || '');
    setOwnerInputValue(form.owner || '');
  }, [form.estate, form.owner]);

  function computeNextDate(baseDate, cycle) {
    const match = cycle && cycle.match(/(\d+)/);
    if (!match || !baseDate) return '';
    const days = parseInt(match[1], 10);
    const d = new Date(baseDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return formatDate(d);
  }

  function openBackfillModal(item) {
    const nextDate = computeNextDate(today, item.cycle);
    setBackfillItem(item);
    setBackfillForm({
      completedAt: today,
      executor: item.owner || '',
      notes: '',
      nextDate
    });
    setShowBackfillModal(true);
  }

  function handleBackfillSubmit() {
    if (!backfillItem) return;
    const timelineEntry = {
      status: '已完成',
      at: backfillForm.completedAt || today,
      by: backfillForm.executor || '操作员',
      backfill: {
        completedAt: backfillForm.completedAt || today,
        executor: backfillForm.executor || '',
        notes: backfillForm.notes || '',
        nextDate: backfillForm.nextDate || ''
      }
    };
    const next = records.map((item) => item.id === backfillItem.id ? {
      ...item,
      status: '已完成',
      nextDate: backfillForm.nextDate || item.nextDate,
      timeline: [...(item.timeline || []), timelineEntry]
    } : item);
    persist(next);
    if (selected?.id === backfillItem.id) setSelected(next.find((item) => item.id === backfillItem.id));
    setShowBackfillModal(false);
    setBackfillItem(null);
    setBackfillForm({ completedAt: '', executor: '', notes: '', nextDate: '' });
  }

  function splitLineByMixedDelimiters(line) {
    return line
      .split(/[\t，,\s]+/)
      .map(p => p.trim())
      .filter(p => p !== '');
  }

  function detectFieldMapping(headerCells) {
    const labelToKey = {};
    appConfig.fields.forEach(f => {
      labelToKey[f.label] = f.key;
    });
    const mapping = {};
    headerCells.forEach((cell, idx) => {
      const normalized = cell.trim();
      if (labelToKey[normalized]) {
        mapping[idx] = labelToKey[normalized];
      }
    });
    return mapping;
  }

  function isHeaderLine(cells) {
    const labelSet = new Set(appConfig.fields.map(f => f.label));
    const keySet = new Set(appConfig.fields.map(f => f.key));
    let matchCount = 0;
    cells.forEach(cell => {
      const normalized = cell.trim();
      if (labelSet.has(normalized) || keySet.has(normalized)) {
        matchCount++;
      }
    });
    return matchCount >= 2;
  }

  function parseImportText(text) {
    const rawLines = text.split('\n');
    const nonEmptyLines = rawLines
      .map((line, originalIdx) => ({ line: line.trim(), originalIdx }))
      .filter(item => item.line !== '');

    if (nonEmptyLines.length === 0) {
      return { records: [], fieldMapping: null, hasHeader: false };
    }

    const firstLineCells = splitLineByMixedDelimiters(nonEmptyLines[0].line);
    const hasHeader = isHeaderLine(firstLineCells);
    let fieldMapping = null;
    let dataStartIndex = 0;

    if (hasHeader) {
      fieldMapping = detectFieldMapping(firstLineCells);
      dataStartIndex = 1;
    }

    const records = [];
    const defaultOrder = ['estate', 'building', 'elevatorNo', 'cycle', 'nextDate', 'owner'];

    for (let i = dataStartIndex; i < nonEmptyLines.length; i++) {
      const { line, originalIdx } = nonEmptyLines[i];
      const cells = splitLineByMixedDelimiters(line);
      const record = {
        lineIndex: originalIdx,
        rawLine: line,
        estate: '',
        building: '',
        elevatorNo: '',
        cycle: '',
        nextDate: '',
        owner: '',
        errors: []
      };

      if (hasHeader && fieldMapping) {
        cells.forEach((cell, idx) => {
          const key = fieldMapping[idx];
          if (key && record.hasOwnProperty(key)) {
            record[key] = cell;
          }
        });
      } else {
        defaultOrder.forEach((key, idx) => {
          if (cells[idx]) {
            record[key] = cells[idx];
          }
        });
      }

      records.push(record);
    }

    return { records, fieldMapping, hasHeader, headerCells: hasHeader ? firstLineCells : null };
  }

  function validateImportRecords(parsedRecords) {
    const validCycles = appConfig.fields.find(f => f.key === 'cycle')?.options || [];
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const seenElevatorNos = {};
    const recordsWithErrors = parsedRecords.map((record) => {
      const errors = [];
      if (!record.estate) errors.push({ type: 'missing', field: '楼盘' });
      if (!record.building) errors.push({ type: 'missing', field: '楼栋' });
      if (!record.elevatorNo) {
        errors.push({ type: 'missing', field: '电梯编号' });
      } else {
        if (seenElevatorNos[record.elevatorNo]) {
          errors.push({ type: 'duplicate', field: '电梯编号', value: record.elevatorNo });
        } else {
          seenElevatorNos[record.elevatorNo] = true;
        }
      }
      if (!record.cycle) {
        errors.push({ type: 'missing', field: '维保周期' });
      } else if (!validCycles.includes(record.cycle)) {
        errors.push({ type: 'invalidCycle', field: '维保周期', value: record.cycle });
      }
      if (!record.nextDate) {
        errors.push({ type: 'missing', field: '下次维保日期' });
      } else if (!datePattern.test(record.nextDate)) {
        errors.push({ type: 'invalidDate', field: '下次维保日期', value: record.nextDate });
      } else {
        const date = new Date(record.nextDate);
        if (isNaN(date.getTime())) {
          errors.push({ type: 'invalidDate', field: '下次维保日期', value: record.nextDate });
        }
      }
      if (!record.owner) errors.push({ type: 'missing', field: '负责人' });
      return { ...record, errors };
    });

    const existingRecordNos = new Set(records.map(r => r.elevatorNo));
    recordsWithErrors.forEach((record) => {
      if (record.elevatorNo && existingRecordNos.has(record.elevatorNo)) {
        record.errors.push({ type: 'duplicateExisting', field: '电梯编号', value: record.elevatorNo });
      }
    });

    return recordsWithErrors;
  }

  function handleImportPreview() {
    const { records, fieldMapping, hasHeader, headerCells } = parseImportText(importText);
    const validated = validateImportRecords(records);
    setParsedImport(validated);
    setImportMeta({ fieldMapping, hasHeader, headerCells });
  }

  function handleConfirmImport() {
    if (!parsedImport) return;
    const validRecords = parsedImport.filter(r => r.errors.length === 0);
    if (validRecords.length === 0) return;

    const newRecords = validRecords.map((record) => ({
      id: uid(),
      estate: record.estate,
      building: record.building,
      elevatorNo: record.elevatorNo,
      cycle: record.cycle,
      nextDate: record.nextDate,
      owner: record.owner,
      status: appConfig.primaryStatus,
      createdAt: new Date().toISOString(),
      timeline: [{ status: appConfig.primaryStatus, at: today, by: '录入' }]
    }));

    persist([...newRecords, ...records]);
    setShowImportModal(false);
    setImportText('');
    setParsedImport(null);
    setImportMeta({ fieldMapping: null, hasHeader: false, headerCells: null });
  }

  function recordsChanged(prev, next) {
    if (prev.length !== next.length) return true;
    
    const prevMap = new Map(prev.map(r => [r.id, r]));
    for (const nextRecord of next) {
      const prevRecord = prevMap.get(nextRecord.id);
      if (!prevRecord) return true;
      
      const allKeys = new Set([...Object.keys(prevRecord), ...Object.keys(nextRecord)]);
      for (const key of allKeys) {
        if (key === 'updatedAt') continue;
        const prevVal = prevRecord[key];
        const nextVal = nextRecord[key];
        if (Array.isArray(prevVal) && Array.isArray(nextVal)) {
          if (JSON.stringify(prevVal) !== JSON.stringify(nextVal)) return true;
        } else if (typeof prevVal === 'object' && prevVal !== null && typeof nextVal === 'object' && nextVal !== null) {
          if (JSON.stringify(prevVal) !== JSON.stringify(nextVal)) return true;
        } else if (prevVal !== nextVal) {
          return true;
        }
      }
    }
    return false;
  }

  function persist(next) {
    const changedIds = new Set();
    if (recordsChanged(records, next)) {
      const prevMap = new Map(records.map(r => [r.id, r]));
      next.forEach((r, idx) => {
        const prev = prevMap.get(r.id);
        if (!prev) {
          changedIds.add(r.id);
        } else {
          const allKeys = new Set([...Object.keys(prev), ...Object.keys(r)]);
          for (const key of allKeys) {
            if (key === 'updatedAt') continue;
            const prevVal = prev[key];
            const nextVal = r[key];
            let isDiff = false;
            if (Array.isArray(prevVal) && Array.isArray(nextVal)) {
              if (JSON.stringify(prevVal) !== JSON.stringify(nextVal)) isDiff = true;
            } else if (typeof prevVal === 'object' && prevVal !== null && typeof nextVal === 'object' && nextVal !== null) {
              if (JSON.stringify(prevVal) !== JSON.stringify(nextVal)) isDiff = true;
            } else if (prevVal !== nextVal) {
              isDiff = true;
            }
            if (isDiff) {
              changedIds.add(r.id);
              break;
            }
          }
        }
      });
    }

    const now = new Date().toISOString();
    const normalized = next.map((record) => {
      const migrated = migrateRecord(record);
      if (changedIds.has(migrated.id)) {
        migrated.updatedAt = now;
      }
      if (!migrated.businessKey) {
        migrated.businessKey = migrated.elevatorNo || migrated.id;
      }
      return migrated;
    });
    
    setRecords(normalized);
    localStorage.setItem(appConfig.storage, JSON.stringify(normalized));
  }

  function addRecord(event) {
    event.preventDefault();
    const nextRecord = {
      id: uid(),
      ...form,
      status: form.status || appConfig.primaryStatus,
      createdAt: new Date().toISOString(),
      timeline: [{ status: form.status || appConfig.primaryStatus, at: today, by: '录入' }]
    };

    if (appConfig.conflict === 'date-slot' && records.some((item) => item.date === nextRecord.date && item.slot === nextRecord.slot)) {
      nextRecord.conflict = true;
    }
    if (appConfig.conflict === 'bed-time' && hasOverlap(nextRecord, records)) {
      nextRecord.conflict = true;
    }
    if (appConfig.chart) {
      const temp = Number(nextRecord.temperature || 0);
      nextRecord.temps = [temp];
      if (temp > 2) nextRecord.status = '异常';
    }

    persist([nextRecord, ...records]);
    setForm({
      ...appConfig.defaultValues,
      estate: form.estate,
      owner: form.owner,
      cycle: form.cycle
    });
    setEstateInputValue(form.estate);
    setOwnerInputValue(form.owner);
    setSelected(nextRecord);
  }

  function updateStatus(id, status) {
    const next = records.map((item) => item.id === id ? {
      ...item,
      status,
      timeline: [...(item.timeline || []), { status, at: today, by: '操作员' }]
    } : item);
    persist(next);
    if (selected?.id === id) setSelected(next.find((item) => item.id === id));
  }

  function removeRecord(id) {
    const next = records.filter((item) => item.id !== id);
    persist(next);
    if (selected?.id === id) setSelected(null);
  }

  function duplicateRecord(item) {
    const copied = { ...item, id: uid(), status: appConfig.primaryStatus, timeline: [{ status: appConfig.primaryStatus, at: today, by: '复制' }] };
    persist([copied, ...records]);
    setSelected(copied);
  }

  function startEdit(item) {
    setEditForm({ ...item });
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setEditForm({});
  }

  function saveEdit() {
    if (!selected) return;
    const formValues = {};
    if (editFormRef.current) {
      const data = new FormData(editFormRef.current);
      appConfig.fields.forEach((field) => {
        const value = data.get(field.key);
        if (value !== null) formValues[field.key] = String(value);
      });
      const status = data.get('status');
      if (status !== null) formValues.status = String(status);
    }
    const nextEditForm = { ...editForm, ...formValues };
    const next = records.map((item) => item.id === selected.id ? {
      ...item,
      ...nextEditForm,
      timeline: [...(item.timeline || []), { status: nextEditForm.status || item.status, at: today, by: '编辑' }]
    } : item);
    persist(next);
    const updated = next.find((item) => item.id === selected.id);
    setSelected(updated);
    setEditing(false);
    setEditForm({});
  }

  function openSettings(tab = 'reminder') {
    setTempSettings({ ...reminderSettings });
    setTempRiskRules({ ...riskRules });
    setSettingsTab(tab);
    setShowSettings(true);
  }

  function handleSaveSettings() {
    if (settingsTab === 'reminder') {
      const sanitized = {};
      Object.keys(tempSettings).forEach((key) => {
        const val = parseInt(tempSettings[key], 10);
        sanitized[key] = Number.isFinite(val) && val >= 0 ? val : DEFAULT_REMINDER_SETTINGS[key];
      });
      setReminderSettings(sanitized);
      saveReminderSettings(sanitized);
    } else if (settingsTab === 'risk') {
      const sanitized = {};
      Object.keys(tempRiskRules).forEach((key) => {
        const val = tempRiskRules[key];
        if (key.includes('Threshold') || key.includes('Window') || key.includes('Days')) {
          const numVal = parseInt(val, 10);
          sanitized[key] = Number.isFinite(numVal) && numVal >= 0 ? numVal : DEFAULT_RISK_RULES[key];
        } else if (key.includes('Enabled')) {
          sanitized[key] = Boolean(val);
        } else {
          sanitized[key] = String(val || DEFAULT_RISK_RULES[key]);
        }
      });
      setRiskRules(sanitized);
      saveRiskRules(sanitized);
    }
    setShowSettings(false);
  }

  function handleResetSettings() {
    if (settingsTab === 'reminder') {
      setTempSettings({ ...DEFAULT_REMINDER_SETTINGS });
    } else if (settingsTab === 'risk') {
      setTempRiskRules({ ...DEFAULT_RISK_RULES });
    }
  }

  function handleExportData() {
    const exportData = buildExportData(records, reminderSettings, routePlans, riskRules);
    const dateStr = formatDate(new Date());
    const filename = `电梯维保数据_${dateStr}.json`;
    downloadJSON(exportData, filename);
  }

  function handleSelectFileClick() {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportFileName(file.name);
    setImportValidation(null);
    setImportConfirmStep(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== 'string') {
          setImportValidation({ valid: false, errors: ['文件读取失败'], warnings: [], summary: null });
          return;
        }
        const parsed = JSON.parse(text);
        const result = validateImportData(parsed);
        setImportValidation(result);
      } catch (err) {
        setImportValidation({
          valid: false,
          errors: ['JSON解析失败：文件格式错误，请确保是有效的JSON文件'],
          warnings: [],
          summary: null
        });
      }
    };
    reader.onerror = () => {
      setImportValidation({ valid: false, errors: ['文件读取失败'], warnings: [], summary: null });
    };
    reader.readAsText(file);

    e.target.value = '';
  }

  function resetImportState() {
    setImportFile(null);
    setImportFileName('');
    setImportValidation(null);
    setImportConfirmStep(false);
  }

  function closeDataManager() {
    setShowDataManager(false);
    resetImportState();
  }

  function handleConfirmRestore() {
    if (!importValidation?.valid || !importValidation.data) return;
    const { records: newRecords, reminderSettings: newReminderSettings, routePlans: newRoutePlans, riskRules: newRiskRules } = importValidation.data;

    persist(newRecords);
    setReminderSettings(newReminderSettings);
    saveReminderSettings(newReminderSettings);
    setRoutePlans(newRoutePlans);
    saveRoutePlans(newRoutePlans);
    if (newRiskRules) {
      const mergedRiskRules = { ...DEFAULT_RISK_RULES, ...newRiskRules };
      setRiskRules(mergedRiskRules);
      saveRiskRules(mergedRiskRules);
    }

    setSelected(null);
    alert('数据恢复成功！');
    closeDataManager();
  }

  function handleSelectMergeFileClick() {
    if (mergeFileInputRef.current) {
      mergeFileInputRef.current.click();
    }
  }

  function handleMergeFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMergeFile(file);
    setMergeFileName(file.name);
    setMergeValidation(null);
    setMergeStep('upload');
    setMergeConflicts([]);
    setMergeNoConflicts(null);
    setConflictResolutions({});
    setCurrentConflictIndex(0);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== 'string') {
          setMergeValidation({ valid: false, errors: ['文件读取失败'], warnings: [], summary: null });
          return;
        }
        const parsed = JSON.parse(text);
        const result = validateMergeData(parsed);
        setMergeValidation(result);
        setDeviceInfo(result.deviceInfo || { name: '未知设备', id: '' });
      } catch (err) {
        setMergeValidation({
          valid: false,
          errors: ['JSON解析失败：文件格式错误，请确保是有效的JSON文件'],
          warnings: [],
          summary: null
        });
      }
    };
    reader.onerror = () => {
      setMergeValidation({ valid: false, errors: ['文件读取失败'], warnings: [], summary: null });
    };
    reader.readAsText(file);

    e.target.value = '';
  }

  function resetMergeState() {
    setMergeFile(null);
    setMergeFileName('');
    setMergeValidation(null);
    setMergeStep('upload');
    setMergeConflicts([]);
    setMergeNoConflicts(null);
    setConflictResolutions({});
    setCurrentConflictIndex(0);
    setManualMergeForm({});
    setShowManualMergeModal(false);
    setDeviceInfo({ name: '', id: '' });
  }

  function handleStartMerge() {
    if (!mergeValidation?.valid || !mergeValidation.data) return;
    
    const { records: importRecords } = mergeValidation.data;
    const { conflicts, noConflicts } = detectConflicts(records, importRecords);
    
    setMergeConflicts(conflicts);
    setMergeNoConflicts(noConflicts);
    
    if (conflicts.length === 0) {
      setMergeStep('review');
    } else {
      setMergeStep('resolve');
      const initialResolutions = {};
      conflicts.forEach((conflict, index) => {
        initialResolutions[index] = { resolution: 'pending', customMerge: null };
      });
      setConflictResolutions(initialResolutions);
    }
  }

  function handleResolveConflict(index, resolution) {
    setConflictResolutions((prev) => ({
      ...prev,
      [index]: { ...prev[index], resolution, customMerge: null }
    }));
  }

  function handleOpenManualMerge(conflictIndex) {
    const conflict = mergeConflicts[conflictIndex];
    if (!conflict) return;
    
    const initialForm = {};
    CONFLICT_FIELDS.forEach(({ key }) => {
      if (conflict.localRecord.hasOwnProperty(key) || conflict.importRecord.hasOwnProperty(key)) {
        initialForm[key] = conflict.localRecord[key];
      }
    });
    appConfig.fields.forEach((field) => {
      if (!initialForm.hasOwnProperty(field.key)) {
        initialForm[field.key] = conflict.localRecord[field.key];
      }
    });
    
    setManualMergeForm(initialForm);
    setShowManualMergeModal(true);
  }

  function handleSaveManualMerge(conflictIndex) {
    setConflictResolutions((prev) => ({
      ...prev,
      [conflictIndex]: { resolution: 'manual', customMerge: { ...manualMergeForm } }
    }));
    setShowManualMergeModal(false);
  }

  function handleNextConflict() {
    if (currentConflictIndex < mergeConflicts.length - 1) {
      setCurrentConflictIndex(currentConflictIndex + 1);
    }
  }

  function handlePrevConflict() {
    if (currentConflictIndex > 0) {
      setCurrentConflictIndex(currentConflictIndex - 1);
    }
  }

  function handleAllConflictsResolved() {
    const allResolved = mergeConflicts.every((_, index) => {
      const res = conflictResolutions[index];
      return res && res.resolution !== 'pending';
    });
    return allResolved;
  }

  function goToReviewStep() {
    if (handleAllConflictsResolved()) {
      setMergeStep('review');
    }
  }

  function handleExecuteMerge() {
    if (!mergeValidation?.data) return;
    
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
    
    const finalRecords = migrateRecords(mergedRecords);
    
    persist(finalRecords);

    const { reminderSettings: importReminderSettings, routePlans: importRoutePlans, riskRules: importRiskRules } = mergeValidation.data;
    if (importReminderSettings) {
      const mergedReminder = { ...DEFAULT_REMINDER_SETTINGS, ...reminderSettings, ...importReminderSettings };
      setReminderSettings(mergedReminder);
      saveReminderSettings(mergedReminder);
    }
    if (importRoutePlans) {
      const mergedRoutes = { ...routePlans, ...importRoutePlans };
      setRoutePlans(mergedRoutes);
      saveRoutePlans(mergedRoutes);
    }
    if (importRiskRules) {
      const mergedRiskRules = { ...DEFAULT_RISK_RULES, ...riskRules, ...importRiskRules };
      setRiskRules(mergedRiskRules);
      saveRiskRules(mergedRiskRules);
    }

    setSelected(null);
    alert(`合并完成！共 ${finalRecords.length} 条记录。${importRiskRules ? '风险规则配置已同步更新。' : ''}`);
    closeDataManager();
  }

  function handleExportMergeData() {
    const deviceName = prompt('请输入设备名称（用于标识数据来源）：', '设备' + Math.floor(Math.random() * 1000));
    if (!deviceName) return;
    
    const deviceId = uid();
    const exportData = buildMergeData(records, reminderSettings, routePlans, { name: deviceName, id: deviceId });
    const dateStr = formatDate(new Date());
    const safeDeviceName = deviceName.replace(/[^\w\u4e00-\u9fa5]/g, '_');
    const filename = `电梯维保数据_${safeDeviceName}_${dateStr}.json`;
    downloadJSON(exportData, filename);
  }

  function addTemperature(item) {
    const value = Number(prompt('录入新的温度读数'));
    if (!Number.isFinite(value)) return;
    const next = records.map((record) => record.id === item.id ? {
      ...record,
      temps: [...(record.temps || []), value],
      temperature: String(value),
      status: value > 2 ? '异常' : record.status
    } : record);
    persist(next);
    setSelected(next.find((record) => record.id === item.id));
  }

  function getOwnerDailyLimit(owner, config) {
    return config.ownerDailyLimits?.[owner] ?? config.defaultDailyLimit;
  }

  function generateAutoPlan(config = autoPlanConfig) {
    const planDays = config.planDays || 30;
    const dates = getNextDays(planDays);
    const datePlan = {};
    dates.forEach((d) => { datePlan[d] = []; });

    const ownerDailyCounts = {};
    const estateDailyCounts = {};
    dates.forEach((d) => {
      ownerDailyCounts[d] = {};
      estateDailyCounts[d] = {};
    });

    const recordsInRoutePlans = new Set();
    const routeRecordMeta = new Map();
    const draftExcludedFromRoute = new Set();

    if (autoPlanDraft) {
      Object.values(autoPlanDraft.dates || {}).forEach((items) => {
        items.forEach((item) => draftExcludedFromRoute.add(item.recordId));
      });
    }

    Object.entries(routePlans).forEach(([date, plan]) => {
      if (!datePlan[date]) return;
      plan?.routes?.forEach((r) => {
        r.deviceIds?.forEach((id) => {
          if (draftExcludedFromRoute.has(id)) return;
          recordsInRoutePlans.add(id);
          const rec = records.find((x) => x.id === id);
          if (rec) {
            const owner = rec.owner || '未分配';
            const estate = rec.estate;
            ownerDailyCounts[date][owner] = (ownerDailyCounts[date][owner] || 0) + 1;
            estateDailyCounts[date][estate] = (estateDailyCounts[date][estate] || 0) + 1;
            routeRecordMeta.set(id, { owner, estate, date });
          }
        });
      });
    });

    const candidateRecords = records.filter((item) => {
      if (item.status === '已完成') return false;
      if (!item.nextDate) return false;
      if (recordsInRoutePlans.has(item.id)) return false;
      const diff = daysBetween(item.nextDate, today);

      const advanceDays = config.allowAdvanceScheduling
        ? Math.max(0, config.maxAdvanceDays || 0)
        : 0;
      const minDateIdx = diff < 0 ? 0 : Math.max(0, diff - advanceDays);
      if (minDateIdx >= planDays) return false;
      if (diff > planDays - 1) return false;
      return true;
    });

    const scoredRecords = candidateRecords.map((item) => {
      const diff = daysBetween(item.nextDate, today);
      let priority = 0;
      if (diff < 0) {
        priority = 1000 + Math.abs(diff) * 50;
      } else if (diff === 0) {
        priority = 800;
      } else {
        const advanceDays = reminderSettings[item.cycle] || 0;
        if (diff <= advanceDays) {
          priority = 600 - diff * 10;
        } else {
          priority = 100 - diff;
        }
      }
      return {
        record: item,
        recordId: item.id,
        diff,
        priority,
        estate: item.estate,
        owner: item.owner || '未分配'
      };
    });

    scoredRecords.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      if (a.diff !== b.diff) return a.diff - b.diff;
      return a.estate.localeCompare(b.estate);
    });

    function findBestDateAndOwner(scoredItem, preferredStartIdx = 0) {
      const { record, diff, owner: defaultOwner } = scoredItem;

      const advanceDays = config.allowAdvanceScheduling
        ? Math.max(0, config.maxAdvanceDays || 0)
        : 0;
      const minDateIdx = diff < 0
        ? Math.max(0, preferredStartIdx)
        : Math.max(0, preferredStartIdx, diff - advanceDays);

      let bestDateIdx = -1;
      let bestOwner = defaultOwner;
      let bestScore = -1;

      for (let i = Math.max(preferredStartIdx, minDateIdx); i < dates.length; i++) {
        const date = dates[i];
        const candidates = [defaultOwner];
        if (defaultOwner === '未分配') {
          Object.keys(ownerDailyCounts[date] || {}).forEach((o) => {
            if (!candidates.includes(o) && o !== '未分配') candidates.push(o);
          });
        }

        for (const owner of candidates) {
          const ownerLimit = getOwnerDailyLimit(owner, config);
          const currentOwnerCount = ownerDailyCounts[date][owner] || 0;
          if (currentOwnerCount >= ownerLimit) continue;

          let estateCountBonus = 0;
          if (config.estateConcentration) {
            estateCountBonus = (estateDailyCounts[date]?.[record.estate] || 0) +
              datePlan[date].filter((item) => item.estate === record.estate).length;
          }

          const datePreference = i === minDateIdx ? 10 : 0;
          const ownerPreference = owner === defaultOwner ? 5 : 0;
          const totalScore = estateCountBonus * 10 + datePreference + ownerPreference;

          if (totalScore > bestScore) {
            bestScore = totalScore;
            bestDateIdx = i;
            bestOwner = owner;
          }
        }

        if (bestDateIdx !== -1 && i === minDateIdx && bestOwner === defaultOwner) {
          break;
        }
      }

      if (bestDateIdx === -1) {
        return { date: null, owner: defaultOwner };
      }

      const finalDate = dates[bestDateIdx];
      const finalOwner = bestOwner;
      const finalLimit = getOwnerDailyLimit(finalOwner, config);
      const finalCount = ownerDailyCounts[finalDate][finalOwner] || 0;
      if (finalCount >= finalLimit) {
        return { date: null, owner: finalOwner };
      }

      return { date: finalDate, owner: finalOwner };
    }

    const draftItems = [];
    const unassignedItems = [];

    scoredRecords.forEach((scoredItem) => {
      const { date, owner } = findBestDateAndOwner(scoredItem);
      if (date) {
        const ownerLimit = getOwnerDailyLimit(owner, config);
        if ((ownerDailyCounts[date][owner] || 0) >= ownerLimit) {
          unassignedItems.push(scoredItem);
          return;
        }

        const planItem = {
          planId: planUid(),
          recordId: scoredItem.recordId,
          estate: scoredItem.estate,
          building: scoredItem.record.building,
          elevatorNo: scoredItem.record.elevatorNo,
          cycle: scoredItem.record.cycle,
          originalNextDate: scoredItem.record.nextDate,
          plannedDate: date,
          owner: owner,
          originalOwner: scoredItem.owner,
          ownerReassigned: owner !== scoredItem.owner,
          priority: scoredItem.priority,
          daysDiff: scoredItem.diff,
          status: 'draft'
        };
        datePlan[date].push(planItem);
        ownerDailyCounts[date][owner] = (ownerDailyCounts[date][owner] || 0) + 1;
        draftItems.push(planItem);
      } else {
        unassignedItems.push(scoredItem);
      }
    });

    Object.keys(datePlan).forEach((date) => {
      datePlan[date].sort((a, b) => {
        if (a.estate !== b.estate) return a.estate.localeCompare(b.estate);
        return String(a.building).localeCompare(String(b.building));
      });
    });

    const draft = {
      id: planUid(),
      createdAt: new Date().toISOString(),
      config: { ...config },
      dates: datePlan,
      dateList: dates,
      totalCount: draftItems.length,
      unassignedCount: unassignedItems.length,
      unassignedItems: unassignedItems.map((si) => ({
        recordId: si.recordId,
        estate: si.estate,
        building: si.record.building,
        elevatorNo: si.record.elevatorNo,
        owner: si.owner,
        originalNextDate: si.record.nextDate,
        daysDiff: si.diff
      }))
    };

    setAutoPlanDraft(draft);
    saveAutoPlanDraft(draft);
    return draft;
  }

  function updatePlanItemDate(planId, newDate, newOwner) {
    if (!autoPlanDraft) return;

    let movedItem = null;
    let oldDate = null;

    const newDates = { ...autoPlanDraft.dates };
    Object.keys(newDates).forEach((date) => {
      const items = newDates[date];
      const idx = items.findIndex((it) => it.planId === planId);
      if (idx !== -1) {
        movedItem = { ...items[idx] };
        oldDate = date;
        items.splice(idx, 1);
      }
    });

    if (!movedItem) return;

    if (newOwner) {
      movedItem.owner = newOwner;
    }
    movedItem.plannedDate = newDate;

    if (!newDates[newDate]) {
      newDates[newDate] = [];
    }
    newDates[newDate].push(movedItem);

    Object.keys(newDates).forEach((date) => {
      newDates[date].sort((a, b) => {
        if (a.estate !== b.estate) return a.estate.localeCompare(b.estate);
        return String(a.building).localeCompare(String(b.building));
      });
    });

    const newDraft = {
      ...autoPlanDraft,
      dates: newDates,
      updatedAt: new Date().toISOString()
    };
    setAutoPlanDraft(newDraft);
    saveAutoPlanDraft(newDraft);
  }

  function removePlanItem(planId) {
    if (!autoPlanDraft) return;

    const newDates = { ...autoPlanDraft.dates };
    Object.keys(newDates).forEach((date) => {
      newDates[date] = newDates[date].filter((it) => it.planId !== planId);
    });

    const newDraft = {
      ...autoPlanDraft,
      dates: newDates,
      totalCount: autoPlanDraft.totalCount - 1,
      updatedAt: new Date().toISOString()
    };
    setAutoPlanDraft(newDraft);
    saveAutoPlanDraft(newDraft);
  }

  function discardPlanDraft() {
    if (!confirm('确定要放弃当前草稿吗？所有未确认的计划将被清除。')) return;
    setAutoPlanDraft(null);
    clearAutoPlanDraft();
    setPlanEditItem(null);
  }

  function confirmAutoPlan() {
    if (!autoPlanDraft) return;
    if (!confirm('确认提交此计划？系统将：\n1. 更新所有计划设备的维保日期\n2. 将状态设置为「今日执行」（当天日期的设备）\n3. 自动生成路线方案\n4. 记录操作历史以便回滚')) return;

    const snapshot = {
      records: JSON.parse(JSON.stringify(records)),
      routePlans: JSON.parse(JSON.stringify(routePlans))
    };

    const updatedRecordsMap = new Map();
    records.forEach((r) => updatedRecordsMap.set(r.id, { ...r }));

    const newRoutePlans = JSON.parse(JSON.stringify(routePlans));

    const existingRouteDeviceSet = new Set();
    Object.entries(newRoutePlans).forEach(([rpDate, plan]) => {
      plan?.routes?.forEach((r) => {
        r.deviceIds?.forEach((id) => existingRouteDeviceSet.add(`${rpDate}:${id}`));
      });
    });

    const globalDeviceFirstSeen = new Map();
    const skippedItems = [];

    Object.entries(autoPlanDraft.dates).forEach(([date, items]) => {
      if (items.length === 0) return;

      const validItems = items.filter((item) => {
        if (existingRouteDeviceSet.has(`${date}:${item.recordId}`)) {
          skippedItems.push({ ...item, reason: '该日期已有此设备路线' });
          return false;
        }
        if (globalDeviceFirstSeen.has(item.recordId)) {
          skippedItems.push({ ...item, reason: `已在 ${globalDeviceFirstSeen.get(item.recordId)} 排期` });
          return false;
        }
        const rec = updatedRecordsMap.get(item.recordId);
        if (!rec || rec.status === '已完成') {
          skippedItems.push({ ...item, reason: '记录已完成或不存在' });
          return false;
        }
        globalDeviceFirstSeen.set(item.recordId, date);
        return true;
      });

      validItems.forEach((item) => {
        const record = updatedRecordsMap.get(item.recordId);
        if (!record) return;

        const timelineEntry = {
          status: date === today ? '今日执行' : '待维保',
          at: today,
          by: '自动计划生成器',
          plan: {
            planId: autoPlanDraft.id,
            originalNextDate: record.nextDate,
            plannedDate: date,
            plannedOwner: item.owner || record.owner
          }
        };

        record.nextDate = date;
        record.status = date === today ? '今日执行' : '待维保';
        if (item.owner && item.owner !== '未分配') {
          record.owner = item.owner;
        }
        record.timeline = [...(record.timeline || []), timelineEntry];
        updatedRecordsMap.set(record.id, record);
      });

      const estateGroups = {};
      validItems.forEach((item) => {
        if (!estateGroups[item.estate]) estateGroups[item.estate] = [];
        estateGroups[item.estate].push(item.recordId);
      });

      if (!newRoutePlans[date]) {
        newRoutePlans[date] = getEmptyRoutePlan(date);
      }

      Object.entries(estateGroups).forEach(([estate, deviceIds]) => {
        const existingRoute = newRoutePlans[date].routes.find((r) => r.estate === estate);
        if (existingRoute) {
          deviceIds.forEach((id) => {
            if (!existingRoute.deviceIds.includes(id)) {
              existingRoute.deviceIds.push(id);
            }
          });
        } else {
          newRoutePlans[date].routes.push({
            id: routeUid(),
            estate,
            deviceIds
          });
        }
      });

      newRoutePlans[date].updatedAt = new Date().toISOString();
    });

    const finalRecords = Array.from(updatedRecordsMap.values());
    persist(finalRecords);
    persistRoutePlans(newRoutePlans);

    const actualAffectedCount = globalDeviceFirstSeen.size;
    const actualDayCount = new Set(
      Array.from(globalDeviceFirstSeen.values())
    ).size;

    const historyEntry = {
      id: planUid(),
      type: 'confirm',
      planId: autoPlanDraft.id,
      timestamp: new Date().toISOString(),
      description: `确认维保计划（实际写入 ${actualAffectedCount} 台设备，${actualDayCount} 天${skippedItems.length > 0 ? `，跳过 ${skippedItems.length} 条冲突` : ''}）`,
      snapshot,
      affectedCount: actualAffectedCount,
      skippedCount: skippedItems.length,
      skippedItems: skippedItems.slice(0, 50)
    };
    const newHistory = [historyEntry, ...autoPlanHistory];
    setAutoPlanHistory(newHistory);
    saveAutoPlanHistory(newHistory);

    setAutoPlanDraft(null);
    clearAutoPlanDraft();
    setPlanEditItem(null);

    let msg = `计划确认成功！\n\n实际写入 ${actualAffectedCount} 台设备，覆盖 ${actualDayCount} 天。`;
    if (skippedItems.length > 0) {
      msg += `\n\n⚠️  跳过 ${skippedItems.length} 条冲突项：`;
      const uniqueReasons = {};
      skippedItems.forEach((it) => {
        uniqueReasons[it.reason] = (uniqueReasons[it.reason] || 0) + 1;
      });
      Object.entries(uniqueReasons).forEach(([r, c]) => {
        msg += `\n  · ${r} × ${c}`;
      });
    }
    msg += `\n\n您可以在「操作历史」中回滚此操作。`;
    alert(msg);
  }

  function rollbackHistoryEntry(entryId) {
    const entry = autoPlanHistory.find((e) => e.id === entryId);
    if (!entry) return;
    if (!confirm(`确定要回滚此操作吗？\n\n${entry.description}\n\n系统将恢复操作前的所有记录和路线方案状态。`)) return;

    if (entry.snapshot?.records) {
      const migrated = migrateRecords(entry.snapshot.records);
      localStorage.setItem(appConfig.storage, JSON.stringify(migrated));
      setRecords(migrated);
    }

    if (entry.snapshot?.routePlans) {
      saveRoutePlans(entry.snapshot.routePlans);
      setRoutePlans(entry.snapshot.routePlans);
    }

    const rollbackEntry = {
      id: planUid(),
      type: 'rollback',
      relatedId: entryId,
      timestamp: new Date().toISOString(),
      description: `回滚操作：${entry.description}`,
      affectedCount: entry.affectedCount || 0
    };
    const newHistory = [rollbackEntry, ...autoPlanHistory];
    setAutoPlanHistory(newHistory);
    saveAutoPlanHistory(newHistory);

    alert('回滚成功！记录和路线方案已恢复至操作前状态。');
  }

  function openPlanItemEdit(item) {
    setPlanEditItem(item);
    setPlanEditForm({
      date: item.plannedDate,
      owner: item.owner || ''
    });
  }

  function savePlanItemEdit() {
    if (!planEditItem) return;
    updatePlanItemDate(planEditItem.planId, planEditForm.date, planEditForm.owner);
    setPlanEditItem(null);
    setPlanEditForm({ date: '', owner: '' });
  }

  function openAutoPlanConfigModal() {
    setTempAutoPlanConfig({ ...autoPlanConfig });
    setShowAutoPlanConfig(true);
  }

  function saveAutoPlanConfigModal() {
    const sanitized = {
      ...DEFAULT_AUTO_PLAN_CONFIG,
      ...tempAutoPlanConfig,
      planDays: Math.max(7, Math.min(90, parseInt(tempAutoPlanConfig.planDays, 10) || 30)),
      defaultDailyLimit: Math.max(1, Math.min(50, parseInt(tempAutoPlanConfig.defaultDailyLimit, 10) || 5))
    };
    if (sanitized.ownerDailyLimits && typeof sanitized.ownerDailyLimits === 'object') {
      Object.keys(sanitized.ownerDailyLimits).forEach((owner) => {
        sanitized.ownerDailyLimits[owner] = Math.max(1, Math.min(50, parseInt(sanitized.ownerDailyLimits[owner], 10) || sanitized.defaultDailyLimit));
      });
    } else {
      sanitized.ownerDailyLimits = {};
    }
    setAutoPlanConfig(sanitized);
    saveAutoPlanConfig(sanitized);
    setShowAutoPlanConfig(false);
  }

  function togglePlanDateExpand(date) {
    setExpandedPlanDates({ ...expandedPlanDates, [date]: !expandedPlanDates[date] });
  }

  const autoPlanSummary = useMemo(() => {
    if (!autoPlanDraft) return null;
    let totalOverdue = 0;
    let totalToday = 0;
    let totalSoon = 0;
    const ownerSummary = {};
    const estateSummary = {};

    Object.values(autoPlanDraft.dates).forEach((items) => {
      items.forEach((item) => {
        if (item.daysDiff < 0) totalOverdue++;
        else if (item.daysDiff === 0) totalToday++;
        else {
          const advanceDays = reminderSettings[item.cycle] || 0;
          if (item.daysDiff <= advanceDays) totalSoon++;
        }
        ownerSummary[item.owner] = (ownerSummary[item.owner] || 0) + 1;
        estateSummary[item.estate] = (estateSummary[item.estate] || 0) + 1;
      });
    });

    const daysWithPlan = Object.keys(autoPlanDraft.dates).filter((d) => (autoPlanDraft.dates[d]?.length || 0) > 0).length;

    return {
      totalOverdue,
      totalToday,
      totalSoon,
      daysWithPlan,
      ownerSummary,
      estateSummary,
      topOwners: Object.entries(ownerSummary).sort((a, b) => b[1] - a[1]).slice(0, 5),
      topEstates: Object.entries(estateSummary).sort((a, b) => b[1] - a[1]).slice(0, 5)
    };
  }, [autoPlanDraft, reminderSettings]);

  const filteredRecords = useMemo(() => {
    return records
      .filter((item) => !filters.query || `${item.estate}${item.elevatorNo}${item.owner}`.includes(filters.query))
      .filter((item) => filters.status === '全部' || item.status === filters.status)
      .sort((a, b) => {
        if (appConfig.sort === 'priority') {
          const rank = priorityRank(a.priority) - priorityRank(b.priority);
          if (rank !== 0) return rank;
        }
        const aDate = a[appConfig.dateKey] || a.sentAt || a.createdAt || '';
        const bDate = b[appConfig.dateKey] || b.sentAt || b.createdAt || '';
        return String(aDate).localeCompare(String(bDate));
      });
  }, [records, filters]);

  const calendarFilteredRecords = useMemo(() => {
    return records
      .filter((item) => !filters.query || `${item.estate}${item.elevatorNo}${item.owner}`.includes(filters.query))
      .filter((item) => filters.status === '全部' || item.status === filters.status)
      .filter((item) => calendarFilters.owner === '全部' || item.owner === calendarFilters.owner)
      .filter((item) => calendarFilters.cycle === '全部' || item.cycle === calendarFilters.cycle)
      .sort((a, b) => {
        if (appConfig.sort === 'priority') {
          const rank = priorityRank(a.priority) - priorityRank(b.priority);
          if (rank !== 0) return rank;
        }
        const aDate = a[appConfig.dateKey] || a.sentAt || a.createdAt || '';
        const bDate = b[appConfig.dateKey] || b.sentAt || b.createdAt || '';
        return String(aDate).localeCompare(String(bDate));
      });
  }, [records, filters, calendarFilters]);

  const metricsSource = useMemo(() => {
    return viewMode === 'calendar' && !routePlanningView && !workbenchView && !riskDashboardView && !autoPlanView ? calendarFilteredRecords : records;
  }, [viewMode, routePlanningView, workbenchView, riskDashboardView, autoPlanView, calendarFilteredRecords, records]);

  const metrics = useMemo(() => [
    { label: "设备数", value: metricsSource.length },
    { label: "逾期", value: metricsSource.filter((item) => item.nextDate < today && item.status !== '已完成').length },
    { label: "今日", value: metricsSource.filter((item) => item.nextDate === today).length },
    { label: "即将到期", value: metricsSource.filter((item) => {
      const rs = getReminderStatus(item, reminderSettings);
      return rs.type === 'soon';
    }).length },
  ], [metricsSource, reminderSettings]);

  const groupedByDate = useMemo(() => {
    return filteredRecords.reduce((acc, item) => {
      const key = item[appConfig.dateKey] || item.date || item.enrollDate || '未排期';
      (acc[key] ||= []).push(item);
      return acc;
    }, {});
  }, [filteredRecords]);

  const directory = useMemo(() => {
    return records.reduce((acc, item) => {
      const key = item.issue || '未分类';
      (acc[key] ||= []).push(item);
      return acc;
    }, {});
  }, [records]);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  const calendarByDate = useMemo(() => {
    const map = {};
    weekDates.forEach((d) => (map[d] = []));
    calendarFilteredRecords.forEach((item) => {
      const d = item.nextDate;
      if (d && map[d]) map[d].push(item);
    });
    return map;
  }, [calendarFilteredRecords, weekDates]);

  const selectedDateRecords = useMemo(() => {
    if (!selectedDate) return [];
    return calendarFilteredRecords.filter((item) => item.nextDate === selectedDate && item.status !== '已完成');
  }, [calendarFilteredRecords, selectedDate]);

  const groupedByOwner = useMemo(() => {
    const groups = {};
    records.forEach((item) => {
      const owner = item.owner || '未分配';
      if (!groups[owner]) {
        groups[owner] = {
          owner,
          total: 0,
          pending: 0,
          today: 0,
          overdue: 0,
          completed: 0,
          items: []
        };
      }
      groups[owner].total++;
      groups[owner].items.push(item);
      if (item.status === '待维保') groups[owner].pending++;
      if (item.status === '今日执行') groups[owner].today++;
      if (item.nextDate < today && item.status !== '已完成') groups[owner].overdue++;
      if (item.status === '已完成') groups[owner].completed++;
    });
    return Object.values(groups).sort((a, b) => b.overdue - a.overdue || b.total - a.total);
  }, [records]);

  const selectedOwnerRecords = useMemo(() => {
    if (!selectedOwner) return [];
    return records.filter((item) => (item.owner || '未分配') === selectedOwner);
  }, [records, selectedOwner]);

  const riskItems = useMemo(() => {
    const risks = [];
    const { 
      overdueEnabled, 
      soonExpireDays, 
      soonExpireEnabled, 
      overloadThreshold, 
      overloadEnabled, 
      estateConcentrationThreshold, 
      estateConcentrationWindow, 
      estateConcentrationEnabled,
      overdueLabel,
      soonExpireLabel,
      overloadLabel,
      estateConcentrationLabel
    } = riskRules;

    if (overdueEnabled) {
      const overdueItems = records.filter((item) => item.nextDate && item.nextDate < today && item.status !== '已完成');
      if (overdueItems.length > 0) {
        risks.push({
          key: 'overdue',
          type: 'critical',
          icon: AlertOctagon,
          label: overdueLabel,
          summary: `${overdueItems.length} 台电梯已超过维保日期未完成`,
          items: overdueItems.sort((a, b) => a.nextDate.localeCompare(b.nextDate)),
          expanded: expandedRisks['overdue'] !== false,
          triggeredRule: {
            type: 'overdue',
            description: '维保日期已过且未完成',
            threshold: null,
            actual: overdueItems.length
          }
        });
      }
    }

    const todayDueItems = records.filter((item) => item.nextDate === today && item.status !== '已完成');
    if (todayDueItems.length > 0) {
      risks.push({
        key: 'today',
        type: 'warning',
        icon: Clock,
        label: '今日到期',
        summary: `${todayDueItems.length} 台电梯今日需维保`,
        items: todayDueItems,
        expanded: expandedRisks['today'] !== false,
        triggeredRule: {
          type: 'today',
          description: '维保日期为今日',
          threshold: null,
          actual: todayDueItems.length
        }
      });
    }

    if (soonExpireEnabled && soonExpireDays > 0) {
      const soonDueItems = records.filter((item) => {
        if (!item.nextDate || item.status === '已完成') return false;
        const diff = daysBetween(item.nextDate, today);
        return diff > 0 && diff <= soonExpireDays;
      });
      if (soonDueItems.length > 0) {
        risks.push({
          key: 'soon3',
          type: 'info',
          icon: Bell,
          label: `${soonExpireDays}天内${soonExpireLabel}`,
          summary: `${soonDueItems.length} 台电梯将在${soonExpireDays}天内到期`,
          items: soonDueItems.sort((a, b) => a.nextDate.localeCompare(b.nextDate)),
          expanded: expandedRisks['soon3'] !== false,
          triggeredRule: {
            type: 'soon',
            description: `${soonExpireDays}天内到期`,
            threshold: soonExpireDays,
            actual: soonDueItems.length
          }
        });
      }
    }

    if (overloadEnabled && overloadThreshold > 0) {
      const ownerTaskMap = {};
      records.forEach((item) => {
        if (item.status === '已完成') return;
        const owner = item.owner || '未分配';
        if (!ownerTaskMap[owner]) ownerTaskMap[owner] = [];
        ownerTaskMap[owner].push(item);
      });
      Object.entries(ownerTaskMap).forEach(([owner, items]) => {
        if (items.length >= overloadThreshold) {
          const overdueCount = items.filter((it) => it.nextDate < today).length;
          risks.push({
            key: `overload_${owner}`,
            type: 'warning',
            icon: UserX,
            label: `${owner} ${overloadLabel}`,
            summary: `${owner} 待处理 ${items.length} 台（逾期 ${overdueCount} 台），超出负荷阈值（${overloadThreshold}）`,
            items: items.sort((a, b) => {
              if (a.nextDate < today && b.nextDate >= today) return -1;
              if (b.nextDate < today && a.nextDate >= today) return 1;
              return a.nextDate.localeCompare(b.nextDate);
            }),
            expanded: expandedRisks[`overload_${owner}`] !== false,
            triggeredRule: {
              type: 'overload',
              description: `负责人待处理任务数 >= ${overloadThreshold}`,
              threshold: overloadThreshold,
              actual: items.length
            }
          });
        }
      });
    }

    if (estateConcentrationEnabled && estateConcentrationWindow > 0 && estateConcentrationThreshold > 0) {
      const estateWindowMap = {};
      records.forEach((item) => {
        if (!item.nextDate || item.status === '已完成') return;
        const diff = daysBetween(item.nextDate, today);
        if (diff >= 0 && diff <= estateConcentrationWindow) {
          if (!estateWindowMap[item.estate]) estateWindowMap[item.estate] = [];
          estateWindowMap[item.estate].push(item);
        }
      });
      Object.entries(estateWindowMap).forEach(([estate, items]) => {
        if (items.length >= estateConcentrationThreshold) {
          const owners = [...new Set(items.map((it) => it.owner || '未分配'))];
          risks.push({
            key: `estate_${estate}`,
            type: 'info',
            icon: Building,
            label: `${estate} ${estateConcentrationLabel}`,
            summary: `${estate} 有 ${items.length} 台电梯在 ${estateConcentrationWindow} 天内到期，涉及 ${owners.length} 位负责人`,
            items: items.sort((a, b) => a.nextDate.localeCompare(b.nextDate)),
            expanded: expandedRisks[`estate_${estate}`] !== false,
            triggeredRule: {
              type: 'estate',
              description: `楼盘${estateConcentrationWindow}天内到期数 >= ${estateConcentrationThreshold}`,
              threshold: estateConcentrationThreshold,
              actual: items.length,
              window: estateConcentrationWindow
            }
          });
        }
      });
    }

    const typeOrder = { critical: 0, warning: 1, info: 2 };
    risks.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
    return risks;
  }, [records, reminderSettings, expandedRisks, riskRules]);

  const routeDates = useMemo(() => getNextDays(8), []);

  const currentRoutePlan = useMemo(() => {
    return routePlans[selectedRouteDate] || getEmptyRoutePlan(selectedRouteDate);
  }, [routePlans, selectedRouteDate]);

  const allDeviceIdsInRoutes = useMemo(() => {
    const ids = new Set();
    currentRoutePlan.routes.forEach((route) => {
      route.deviceIds.forEach((id) => ids.add(id));
    });
    return ids;
  }, [currentRoutePlan]);

  const pendingDevicesByEstate = useMemo(() => {
    const grouped = {};
    records
      .filter((item) => {
        if (!inNextDays(item.nextDate, 7)) return false;
        if (allDeviceIdsInRoutes.has(item.id)) return false;
        if (!routeQuery) return true;
        return `${item.estate}${item.building}${item.elevatorNo}${item.owner}${item.nextDate}`.includes(routeQuery);
      })
      .forEach((item) => {
        if (!grouped[item.estate]) grouped[item.estate] = [];
        grouped[item.estate].push(item);
      });
    Object.keys(grouped).forEach((estate) => {
      grouped[estate].sort((a, b) => {
        const dateDiff = daysBetween(a.nextDate, b.nextDate);
        if (dateDiff !== 0) return dateDiff;
        return String(a.building).localeCompare(String(b.building));
      });
    });
    return grouped;
  }, [records, allDeviceIdsInRoutes, routeQuery]);

  const getRecordById = (id) => records.find((r) => r.id === id);

  function persistRoutePlans(nextPlans) {
    setRoutePlans(nextPlans);
    saveRoutePlans(nextPlans);
  }

  function createRoute(estateName) {
    const newRoute = {
      id: routeUid(),
      estate: estateName || '未命名路线',
      deviceIds: []
    };
    const nextPlan = {
      ...currentRoutePlan,
      routes: [...currentRoutePlan.routes, newRoute],
      updatedAt: new Date().toISOString()
    };
    persistRoutePlans({ ...routePlans, [selectedRouteDate]: nextPlan });
  }

  function renameRoute(routeId, newName) {
    const nextPlan = {
      ...currentRoutePlan,
      routes: currentRoutePlan.routes.map((r) =>
        r.id === routeId ? { ...r, estate: newName } : r
      ),
      updatedAt: new Date().toISOString()
    };
    persistRoutePlans({ ...routePlans, [selectedRouteDate]: nextPlan });
  }

  function removeRoute(routeId) {
    const nextPlan = {
      ...currentRoutePlan,
      routes: currentRoutePlan.routes.filter((r) => r.id !== routeId),
      updatedAt: new Date().toISOString()
    };
    persistRoutePlans({ ...routePlans, [selectedRouteDate]: nextPlan });
  }

  function addDeviceToRoute(deviceId, routeId) {
    const nextPlan = {
      ...currentRoutePlan,
      routes: currentRoutePlan.routes.map((r) =>
        r.id === routeId && !r.deviceIds.includes(deviceId)
          ? { ...r, deviceIds: [...r.deviceIds, deviceId] }
          : r
      ),
      updatedAt: new Date().toISOString()
    };
    persistRoutePlans({ ...routePlans, [selectedRouteDate]: nextPlan });
  }

  function removeDeviceFromRoute(deviceId, routeId) {
    const nextPlan = {
      ...currentRoutePlan,
      routes: currentRoutePlan.routes.map((r) =>
        r.id === routeId
          ? { ...r, deviceIds: r.deviceIds.filter((id) => id !== deviceId) }
          : r
      ),
      updatedAt: new Date().toISOString()
    };
    persistRoutePlans({ ...routePlans, [selectedRouteDate]: nextPlan });
  }

  function moveDeviceInRoute(deviceId, routeId, direction) {
    const route = currentRoutePlan.routes.find((r) => r.id === routeId);
    if (!route) return;
    const idx = route.deviceIds.indexOf(deviceId);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= route.deviceIds.length) return;
    const newDeviceIds = [...route.deviceIds];
    [newDeviceIds[idx], newDeviceIds[newIdx]] = [newDeviceIds[newIdx], newDeviceIds[idx]];
    const nextPlan = {
      ...currentRoutePlan,
      routes: currentRoutePlan.routes.map((r) =>
        r.id === routeId ? { ...r, deviceIds: newDeviceIds } : r
      ),
      updatedAt: new Date().toISOString()
    };
    persistRoutePlans({ ...routePlans, [selectedRouteDate]: nextPlan });
  }

  function toggleEstate(estate) {
    setExpandedEstates({ ...expandedEstates, [estate]: !expandedEstates[estate] });
  }

  function toggleRiskExpand(key) {
    setExpandedRisks({ ...expandedRisks, [key]: expandedRisks[key] === false });
  }

  function handleSaveRoutePlan() {
    const finalPlan = {
      ...currentRoutePlan,
      updatedAt: new Date().toISOString()
    };
    persistRoutePlans({ ...routePlans, [selectedRouteDate]: finalPlan });
    alert('路线方案已保存！');
  }

  function buildRouteExportData(date, plan) {
    const rows = [];
    const routePlan = plan || routePlans[date] || getEmptyRoutePlan(date);
    routePlan.routes.forEach((route, routeIdx) => {
      route.deviceIds.forEach((deviceId, devIdx) => {
        const item = getRecordById(deviceId);
        if (!item) return;
        const rs = getReminderStatus(item, reminderSettings);
        const dateDiff = daysBetween(item.nextDate, today);
        let riskLabel = '';
        if (item.status === '已完成') {
          riskLabel = '已完成';
        } else if (rs.type === 'overdue') {
          riskLabel = `已逾期${Math.abs(dateDiff)}天`;
        } else if (rs.type === 'today') {
          riskLabel = '今日到期';
        } else if (rs.type === 'soon') {
          riskLabel = `即将到期（${dateDiff}天）`;
        } else {
          riskLabel = `剩余${dateDiff}天`;
        }
        rows.push({
          routeIndex: routeIdx + 1,
          routeName: route.estate,
          deviceOrder: devIdx + 1,
          estate: item.estate || '',
          building: item.building || '',
          elevatorNo: item.elevatorNo || '',
          owner: item.owner || '',
          cycle: item.cycle || '',
          nextDate: item.nextDate || '',
          risk: riskLabel,
          riskType: rs.type,
          status: item.status || '',
          note: ''
        });
      });
    });
    return rows;
  }

  function handlePrintRoutePlan() {
    const rows = buildRouteExportData(selectedRouteDate, currentRoutePlan);
    if (rows.length === 0) {
      alert('当前路线方案为空，无法打印。');
      return;
    }
    const d = new Date(selectedRouteDate);
    const weekday = weekdayLabels[(d.getDay() + 6) % 7];
    const totalCount = rows.length;
    const routeCount = currentRoutePlan.routes.length;
    const rowsByRoute = {};
    rows.forEach((r) => {
      if (!rowsByRoute[r.routeIndex]) rowsByRoute[r.routeIndex] = [];
      rowsByRoute[r.routeIndex].push(r);
    });
    const riskClass = (type) => {
      if (type === 'overdue') return 'risk-overdue';
      if (type === 'today') return 'risk-today';
      if (type === 'soon') return 'risk-soon';
      return '';
    };
    let tableHTML = '';
    Object.entries(rowsByRoute).forEach(([routeIdx, routeRows]) => {
      const r0 = routeRows[0];
      tableHTML += `
        <tr class="route-group-header">
          <td colspan="11">
            <span class="route-badge">路线 ${routeIdx}</span>
            <strong>${r0.routeName}</strong>
            <span class="route-count">共 ${routeRows.length} 台设备</span>
          </td>
        </tr>`;
      routeRows.forEach((r) => {
        tableHTML += `
          <tr>
            <td class="col-order">${r.deviceOrder}</td>
            <td>${r.estate}</td>
            <td>${r.building}</td>
            <td class="col-elevator">${r.elevatorNo}</td>
            <td>${r.owner}</td>
            <td class="col-risk ${riskClass(r.riskType)}">${r.risk}</td>
            <td>${r.nextDate}</td>
            <td>${r.cycle}</td>
            <td>${r.status}</td>
            <td class="col-signature"></td>
            <td class="col-note"></td>
          </tr>`;
      });
    });
    const uniqueOwners = [...new Set(rows.map(r => r.owner).filter(Boolean))].join('、') || '—';
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>维保路线执行清单 - ${selectedRouteDate}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "PingFang SC", "Microsoft YaHei", system-ui, sans-serif; margin: 0; padding: 24px; color: #172033; background: #fff; }
  .page-title { text-align: center; margin-bottom: 8px; font-size: 24px; font-weight: 700; }
  .page-subtitle { text-align: center; color: #5b6474; margin-bottom: 24px; font-size: 14px; }
  .summary { display: flex; gap: 24px; margin-bottom: 20px; padding: 12px 16px; background: #f8fafc; border-radius: 6px; font-size: 14px; }
  .summary-item strong { font-size: 18px; color: #2563eb; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border: 1px solid #d0d5dd; padding: 8px 10px; text-align: left; vertical-align: middle; }
  th { background: #f2f4f7; font-weight: 700; }
  .col-order { width: 50px; text-align: center; font-weight: 700; }
  .col-elevator { font-family: monospace; }
  .col-signature { width: 120px; color: #667085; font-size: 12px; }
  .col-note { min-width: 140px; height: 36px; }
  .route-group-header td { background: #eef2ff; font-weight: 600; color: #1e1b4b; }
  .route-badge { display: inline-block; background: #2563eb; color: #fff; padding: 2px 10px; border-radius: 10px; font-size: 12px; margin-right: 10px; }
  .route-count { margin-left: 12px; color: #667085; font-weight: 400; }
  .risk-overdue { color: #b91c1c; font-weight: 600; }
  .risk-today { color: #b45309; font-weight: 600; }
  .risk-soon { color: #1d4ed8; font-weight: 600; }
  .footer { margin-top: 24px; display: flex; justify-content: space-between; font-size: 12px; color: #667085; }
  @media print {
    body { padding: 12px; }
    .summary { break-inside: avoid; }
    table { font-size: 12px; }
    th, td { padding: 6px 8px; }
  }
</style>
</head>
<body>
  <h1 class="page-title">电梯维保路线执行清单</h1>
  <p class="page-subtitle">日期：${selectedRouteDate}（${weekday}） · 生成时间：${new Date().toLocaleString('zh-CN')}</p>
  <div class="summary">
    <div class="summary-item"><span>路线数：</span><strong>${routeCount}</strong> 条</div>
    <div class="summary-item"><span>设备总数：</span><strong>${totalCount}</strong> 台</div>
    <div class="summary-item"><span>负责人：</span><strong>${uniqueOwners}</strong></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>序号</th>
        <th>楼盘</th>
        <th>楼栋</th>
        <th>电梯编号</th>
        <th>负责人</th>
        <th>到期风险</th>
        <th>下次维保日期</th>
        <th>维保周期</th>
        <th>当前状态</th>
        <th>执行人签字</th>
        <th>现场备注</th>
      </tr>
    </thead>
    <tbody>
      ${tableHTML}
    </tbody>
  </table>
  <div class="footer">
    <span>导出系统：电梯维保路线看板</span>
    <span>本清单由系统自动生成，请按路线顺序执行维保并签字确认。</span>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  <\/script>
</body>
</html>`;
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(html);
      printWin.document.close();
    } else {
      alert('弹窗被浏览器拦截，请允许弹出窗口后重试。');
    }
  }

  function downloadText(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleExportCSV() {
    const rows = buildRouteExportData(selectedRouteDate, currentRoutePlan);
    if (rows.length === 0) {
      alert('当前路线方案为空，无法导出。');
      return;
    }
    const headers = ['路线序号', '路线名称', '设备顺序', '楼盘', '楼栋', '电梯编号', '负责人', '维保周期', '下次维保日期', '到期风险', '状态', '现场备注'];
    const escapeCSV = (val) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };
    const csvLines = [headers.map(escapeCSV).join(',')];
    rows.forEach((r) => {
      csvLines.push([
        r.routeIndex, r.routeName, r.deviceOrder, r.estate, r.building,
        r.elevatorNo, r.owner, r.cycle, r.nextDate, r.risk, r.status, r.note
      ].map(escapeCSV).join(','));
    });
    const filename = `维保路线_${selectedRouteDate}.csv`;
    downloadText('\uFEFF' + csvLines.join('\n'), filename, 'text/csv;charset=utf-8');
  }

  function handleExportHTML() {
    const rows = buildRouteExportData(selectedRouteDate, currentRoutePlan);
    if (rows.length === 0) {
      alert('当前路线方案为空，无法导出。');
      return;
    }
    const d = new Date(selectedRouteDate);
    const weekday = weekdayLabels[(d.getDay() + 6) % 7];
    const totalCount = rows.length;
    const routeCount = currentRoutePlan.routes.length;
    const rowsByRoute = {};
    rows.forEach((r) => {
      if (!rowsByRoute[r.routeIndex]) rowsByRoute[r.routeIndex] = [];
      rowsByRoute[r.routeIndex].push(r);
    });
    const riskClass = (type) => {
      if (type === 'overdue') return 'risk-overdue';
      if (type === 'today') return 'risk-today';
      if (type === 'soon') return 'risk-soon';
      return '';
    };
    let tableHTML = '';
    Object.entries(rowsByRoute).forEach(([routeIdx, routeRows]) => {
      const r0 = routeRows[0];
      tableHTML += `
        <tr class="route-group-header">
          <td colspan="11">
            <span class="route-badge">路线 ${routeIdx}</span>
            <strong>${r0.routeName}</strong>
            <span class="route-count">共 ${routeRows.length} 台设备</span>
          </td>
        </tr>`;
      routeRows.forEach((r) => {
        tableHTML += `
          <tr>
            <td class="col-order">${r.deviceOrder}</td>
            <td>${r.estate}</td>
            <td>${r.building}</td>
            <td class="col-elevator">${r.elevatorNo}</td>
            <td>${r.owner}</td>
            <td class="col-risk ${riskClass(r.riskType)}">${r.risk}</td>
            <td>${r.nextDate}</td>
            <td>${r.cycle}</td>
            <td>${r.status}</td>
            <td class="col-signature">执行人签字：</td>
            <td class="col-note"></td>
          </tr>`;
      });
    });
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>维保路线执行清单 - ${selectedRouteDate}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "PingFang SC", "Microsoft YaHei", system-ui, sans-serif; margin: 0; padding: 24px; color: #172033; background: #fff; }
  .page-title { text-align: center; margin-bottom: 8px; font-size: 24px; font-weight: 700; }
  .page-subtitle { text-align: center; color: #5b6474; margin-bottom: 24px; font-size: 14px; }
  .summary { display: flex; gap: 24px; margin-bottom: 20px; padding: 12px 16px; background: #f8fafc; border-radius: 6px; font-size: 14px; }
  .summary-item strong { font-size: 18px; color: #2563eb; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border: 1px solid #d0d5dd; padding: 8px 10px; text-align: left; vertical-align: middle; }
  th { background: #f2f4f7; font-weight: 700; }
  .col-order { width: 50px; text-align: center; font-weight: 700; }
  .col-elevator { font-family: monospace; }
  .col-signature { width: 120px; color: #667085; font-size: 12px; }
  .col-note { min-width: 140px; height: 36px; }
  .route-group-header td { background: #eef2ff; font-weight: 600; color: #1e1b4b; }
  .route-badge { display: inline-block; background: #2563eb; color: #fff; padding: 2px 10px; border-radius: 10px; font-size: 12px; margin-right: 10px; }
  .route-count { margin-left: 12px; color: #667085; font-weight: 400; }
  .risk-overdue { color: #b91c1c; font-weight: 600; }
  .risk-today { color: #b45309; font-weight: 600; }
  .risk-soon { color: #1d4ed8; font-weight: 600; }
  .footer { margin-top: 24px; display: flex; justify-content: space-between; font-size: 12px; color: #667085; }
  @media print {
    body { padding: 12px; }
    .summary { break-inside: avoid; }
    table { font-size: 12px; }
    th, td { padding: 6px 8px; }
  }
</style>
</head>
<body>
  <h1 class="page-title">电梯维保路线执行清单</h1>
  <p class="page-subtitle">日期：${selectedRouteDate}（${weekday}） · 生成时间：${new Date().toLocaleString('zh-CN')}</p>
  <div class="summary">
    <div class="summary-item"><span>路线数：</span><strong>${routeCount}</strong> 条</div>
    <div class="summary-item"><span>设备总数：</span><strong>${totalCount}</strong> 台</div>
    <div class="summary-item"><span>负责人：</span><strong>${[...new Set(rows.map(r => r.owner).filter(Boolean))].join('、') || '—'}</strong></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>序号</th>
        <th>楼盘</th>
        <th>楼栋</th>
        <th>电梯编号</th>
        <th>负责人</th>
        <th>到期风险</th>
        <th>下次维保日期</th>
        <th>维保周期</th>
        <th>当前状态</th>
        <th>执行人签字</th>
        <th>现场备注</th>
      </tr>
    </thead>
    <tbody>
      ${tableHTML}
    </tbody>
  </table>
  <div class="footer">
    <span>导出系统：电梯维保路线看板</span>
    <span>本清单由系统自动生成，请按路线顺序执行维保并签字确认。</span>
  </div>
</body>
</html>`;
    const filename = `维保路线_${selectedRouteDate}.html`;
    downloadText(html, filename, 'text/html;charset=utf-8');
  }

  function getDeviceRouteStatus(deviceId) {
    for (const route of currentRoutePlan.routes) {
      const idx = route.deviceIds.indexOf(deviceId);
      if (idx !== -1) {
        return { routeId: route.id, routeName: route.estate, position: idx + 1 };
      }
    }
    return null;
  }

  return (
    <main className="shell" style={{ '--accent': appConfig.accent }}>
      <section className="hero">
        <div>
          <div className="eyebrow"><Building2 size={18} />{appConfig.domain}</div>
          <h1>{autoPlanView ? '维保计划自动生成器' : (routePlanningView ? '维保路线编排' : (workbenchView ? '负责人工作台' : (riskDashboardView ? '风险分级看板' : appConfig.title)))}</h1>
          <p>{autoPlanView ? '根据维保周期、负责人、楼盘分布和每日任务上限，智能生成未来30天执行计划，支持草稿编辑、确认写入和操作回滚' : (routePlanningView ? '按楼盘聚合待维保设备，灵活编排每日维保路线并保存方案' : (workbenchView ? '按负责人汇总电梯维保任务，快速掌握执行进度' : (riskDashboardView ? '汇总逾期、到期、过载与集中到期风险，点击展开查看相关记录' : appConfig.subtitle)))}</p>
        </div>
        <div className="hero-actions">
          <button className="settings-btn" onClick={() => setShowDataManager(true)} title="数据导出与恢复">
            <HardDrive size={16} />
            数据管理
          </button>
          <button className="settings-btn" onClick={openSettings} title="维保提醒设置">
            <Settings size={16} />
            提醒设置
          </button>
          <button className={'view-switch ' + (!routePlanningView && !workbenchView && !riskDashboardView && !autoPlanView ? 'active' : '')} onClick={() => { setRoutePlanningView(false); setWorkbenchView(false); setRiskDashboardView(false); setAutoPlanView(false); setSelectedOwner(null); }}>
            <LayoutGrid size={16} />
            路线看板
          </button>
          <button className={'view-switch ' + (workbenchView ? 'active' : '')} onClick={() => { setRoutePlanningView(false); setWorkbenchView(true); setRiskDashboardView(false); setAutoPlanView(false); setSelectedDate(null); }}>
            <Users size={16} />
            负责人工作台
          </button>
          <button className={'view-switch ' + (routePlanningView ? 'active' : '')} onClick={() => { setRoutePlanningView(true); setWorkbenchView(false); setRiskDashboardView(false); setAutoPlanView(false); }}>
            <Route size={16} />
            路线编排
          </button>
          <button className={'view-switch ' + (riskDashboardView ? 'active' : '')} onClick={() => { setRiskDashboardView(true); setWorkbenchView(false); setRoutePlanningView(false); setAutoPlanView(false); }}>
            <ShieldAlert size={16} />
            风险看板
          </button>
          <button className={'view-switch ' + (autoPlanView ? 'active' : '')} onClick={() => { setAutoPlanView(true); setRiskDashboardView(false); setWorkbenchView(false); setRoutePlanningView(false); }}>
            <Zap size={16} />
            计划生成器
          </button>
        </div>
      </section>

      {showBackfillModal && backfillItem && (
        <div className="modal-overlay" onClick={() => { setShowBackfillModal(false); setBackfillItem(null); }}>
          <div className="modal-panel backfill-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="panel-title">
                <CheckCircle2 size={18} />
                <h2>维保完成回填</h2>
              </div>
              <button className="modal-close" onClick={() => { setShowBackfillModal(false); setBackfillItem(null); }}>
                <X size={18} />
              </button>
            </div>
            <div className="backfill-device-info">
              <strong>{backfillItem.estate} {backfillItem.building}</strong>
              <span>{backfillItem.elevatorNo} · {backfillItem.cycle} · {backfillItem.owner}</span>
            </div>
            <div className="backfill-form">
              <label className="backfill-label">
                <span>完成时间</span>
                <input
                  type="date"
                  value={backfillForm.completedAt}
                  onChange={(e) => {
                    const newCompletedAt = e.target.value;
                    const newNextDate = computeNextDate(newCompletedAt, backfillItem.cycle);
                    setBackfillForm({ ...backfillForm, completedAt: newCompletedAt, nextDate: newNextDate || backfillForm.nextDate });
                  }}
                />
              </label>
              <label className="backfill-label">
                <span>执行人</span>
                <input
                  type="text"
                  value={backfillForm.executor}
                  onChange={(e) => setBackfillForm({ ...backfillForm, executor: e.target.value })}
                  placeholder="请输入执行人姓名"
                />
              </label>
              <label className="backfill-label wide">
                <span>现场备注</span>
                <textarea
                  value={backfillForm.notes}
                  onChange={(e) => setBackfillForm({ ...backfillForm, notes: e.target.value })}
                  placeholder="记录维保现场情况、更换部件、异常发现等"
                  rows={3}
                />
              </label>
              <label className="backfill-label">
                <span>下次维保日期</span>
                <input
                  type="date"
                  value={backfillForm.nextDate}
                  onChange={(e) => setBackfillForm({ ...backfillForm, nextDate: e.target.value })}
                />
              </label>
              {backfillItem.cycle && backfillForm.completedAt && (
                <p className="backfill-hint">
                  根据维保周期（{backfillItem.cycle}）自动推算，可手动调整
                </p>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={() => { setShowBackfillModal(false); setBackfillItem(null); }}>取消</button>
              <button type="button" className="primary" onClick={handleBackfillSubmit}>
                <CheckCircle2 size={16} />
                确认完成
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrintExportModal && (
        <div className="modal-overlay print-modal-overlay" onClick={() => setShowPrintExportModal(false)}>
          <div className="modal-panel print-export-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="panel-title">
                <ClipboardList size={18} />
                <h2>路线执行清单 · 打印 / 导出</h2>
              </div>
              <button className="modal-close" onClick={() => setShowPrintExportModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="print-export-toolbar no-print">
              <div className="print-date-info">
                <Calendar size={16} />
                <span>
                  当前日期：<strong>{selectedRouteDate}</strong>
                  （{weekdayLabels[(new Date(selectedRouteDate).getDay() + 6) % 7]}）
                </span>
                {(() => {
                  const rows = buildRouteExportData(selectedRouteDate, currentRoutePlan);
                  return (
                    <>
                      <span className="sep">·</span>
                      <span>路线数：<strong>{currentRoutePlan.routes.length}</strong> 条</span>
                      <span className="sep">·</span>
                      <span>设备总数：<strong>{rows.length}</strong> 台</span>
                    </>
                  );
                })()}
              </div>
              <div className="print-export-actions">
                <button className="secondary-btn" onClick={() => { handlePrintRoutePlan(); }}>
                  <Printer size={16} />
                  打印清单
                </button>
                <button className="secondary-btn" onClick={handleExportCSV}>
                  <FileSpreadsheet size={16} />
                  导出 CSV
                </button>
                <button className="primary" onClick={handleExportHTML}>
                  <Download size={16} />
                  导出 HTML
                </button>
              </div>
            </div>

            <div className="print-preview-area">
              {(() => {
                const rows = buildRouteExportData(selectedRouteDate, currentRoutePlan);
                const d = new Date(selectedRouteDate);
                const weekday = weekdayLabels[(d.getDay() + 6) % 7];
                if (rows.length === 0) {
                  return (
                    <div className="empty-print-preview">
                      <ClipboardList size={48} />
                      <p>当前路线方案为空，请先添加设备到路线中。</p>
                    </div>
                  );
                }
                const rowsByRoute = {};
                rows.forEach((r) => {
                  if (!rowsByRoute[r.routeIndex]) rowsByRoute[r.routeIndex] = [];
                  rowsByRoute[r.routeIndex].push(r);
                });
                const uniqueOwners = [...new Set(rows.map(r => r.owner).filter(Boolean))];
                const riskClass = (type) => {
                  if (type === 'overdue') return 'risk-overdue';
                  if (type === 'today') return 'risk-today';
                  if (type === 'soon') return 'risk-soon';
                  return '';
                };
                return (
                  <div className="print-page">
                    <h1 className="print-page-title">电梯维保路线执行清单</h1>
                    <p className="print-page-subtitle">
                      日期：{selectedRouteDate}（{weekday}） · 生成时间：{new Date().toLocaleString('zh-CN')}
                    </p>
                    <div className="print-summary">
                      <div className="print-summary-item"><span>路线数：</span><strong>{currentRoutePlan.routes.length}</strong> 条</div>
                      <div className="print-summary-item"><span>设备总数：</span><strong>{rows.length}</strong> 台</div>
                      <div className="print-summary-item"><span>负责人：</span><strong>{uniqueOwners.join('、') || '—'}</strong></div>
                    </div>
                    <table className="print-table">
                      <thead>
                        <tr>
                          <th>序号</th>
                          <th>楼盘</th>
                          <th>楼栋</th>
                          <th>电梯编号</th>
                          <th>负责人</th>
                          <th>到期风险</th>
                          <th>下次维保日期</th>
                          <th>维保周期</th>
                          <th>当前状态</th>
                          <th>执行人签字</th>
                          <th>现场备注</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(rowsByRoute).flatMap(([routeIdx, routeRows]) => {
                          const r0 = routeRows[0];
                          return [
                            <tr key={`group-${routeIdx}`} className="print-route-group-header">
                              <td colSpan={11}>
                                <span className="print-route-badge">路线 {routeIdx}</span>
                                <strong>{r0.routeName}</strong>
                                <span className="print-route-count">共 {routeRows.length} 台设备</span>
                              </td>
                            </tr>,
                            ...routeRows.map((r, idx) => (
                              <tr key={`row-${r.routeIndex}-${idx}`}>
                                <td className="print-col-order">{r.deviceOrder}</td>
                                <td>{r.estate}</td>
                                <td>{r.building}</td>
                                <td className="print-col-elevator">{r.elevatorNo}</td>
                                <td>{r.owner}</td>
                                <td className={'print-col-risk ' + riskClass(r.riskType)}>{r.risk}</td>
                                <td>{r.nextDate}</td>
                                <td>{r.cycle}</td>
                                <td>{r.status}</td>
                                <td className="print-col-signature"></td>
                                <td className="print-col-note"></td>
                              </tr>
                            ))
                          ];
                        })}
                      </tbody>
                    </table>
                    <div className="print-footer">
                      <span>导出系统：电梯维保路线看板</span>
                      <span>本清单由系统自动生成，请按路线顺序执行维保并签字确认。</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="modal-actions no-print" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="secondary-btn" onClick={() => setShowPrintExportModal(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="panel-title">
                <Settings size={18} />
                <h2>系统设置</h2>
              </div>
              <button className="modal-close" onClick={() => setShowSettings(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="dm-tabs">
              <button
                className={'dm-tab ' + (settingsTab === 'reminder' ? 'active' : '')}
                onClick={() => setSettingsTab('reminder')}
              >
                <Bell size={16} />
                维保提醒
              </button>
              <button
                className={'dm-tab ' + (settingsTab === 'risk' ? 'active' : '')}
                onClick={() => setSettingsTab('risk')}
              >
                <ShieldAlert size={16} />
                风险规则
              </button>
            </div>
            {settingsTab === 'reminder' && (
              <>
                <p className="hint">为不同维保周期分别配置提前提醒天数，系统将在到期前自动标记「即将到期」。</p>
                <div className="settings-form">
                  {Object.entries(DEFAULT_REMINDER_SETTINGS).map(([cycle, _]) => (
                    <label key={cycle} className="setting-item">
                      <span className="setting-cycle">
                        <Zap size={14} />
                        {cycle}周期
                      </span>
                      <div className="setting-input-wrap">
                        <input
                          type="number"
                          min="0"
                          max="365"
                          value={tempSettings[cycle] ?? ''}
                          onChange={(e) => setTempSettings({ ...tempSettings, [cycle]: e.target.value })}
                        />
                        <span className="setting-unit">天</span>
                      </div>
                      <span className="setting-default">（默认：{DEFAULT_REMINDER_SETTINGS[cycle]}天）</span>
                    </label>
                  ))}
                </div>
              </>
            )}
            {settingsTab === 'risk' && (
              <>
                <p className="hint">配置风险分级看板的触发规则，修改后将立即重新计算风险列表和顶部统计。</p>
                <div className="settings-form">
                  <div className="setting-section">
                    <h4 className="setting-section-title"><AlertOctagon size={14} /> 逾期规则</h4>
                    <label className="setting-item">
                      <span className="setting-label">启用规则</span>
                      <div className="setting-toggle">
                        <input
                          type="checkbox"
                          checked={tempRiskRules.overdueEnabled}
                          onChange={(e) => setTempRiskRules({ ...tempRiskRules, overdueEnabled: e.target.checked })}
                        />
                        <span className="toggle-switch"></span>
                      </div>
                    </label>
                    <label className="setting-item">
                      <span className="setting-label">规则名称</span>
                      <input
                        type="text"
                        value={tempRiskRules.overdueLabel}
                        onChange={(e) => setTempRiskRules({ ...tempRiskRules, overdueLabel: e.target.value })}
                      />
                      <span className="setting-default">（默认：{DEFAULT_RISK_RULES.overdueLabel}）</span>
                    </label>
                  </div>

                  <div className="setting-section">
                    <h4 className="setting-section-title"><Bell size={14} /> 即将到期规则</h4>
                    <label className="setting-item">
                      <span className="setting-label">启用规则</span>
                      <div className="setting-toggle">
                        <input
                          type="checkbox"
                          checked={tempRiskRules.soonExpireEnabled}
                          onChange={(e) => setTempRiskRules({ ...tempRiskRules, soonExpireEnabled: e.target.checked })}
                        />
                        <span className="toggle-switch"></span>
                      </div>
                    </label>
                    <label className="setting-item">
                      <span className="setting-label">到期天数阈值</span>
                      <div className="setting-input-wrap">
                        <input
                          type="number"
                          min="0"
                          max="365"
                          value={tempRiskRules.soonExpireDays}
                          onChange={(e) => setTempRiskRules({ ...tempRiskRules, soonExpireDays: e.target.value })}
                        />
                        <span className="setting-unit">天</span>
                      </div>
                      <span className="setting-default">（默认：{DEFAULT_RISK_RULES.soonExpireDays}天）</span>
                    </label>
                    <label className="setting-item">
                      <span className="setting-label">规则名称</span>
                      <input
                        type="text"
                        value={tempRiskRules.soonExpireLabel}
                        onChange={(e) => setTempRiskRules({ ...tempRiskRules, soonExpireLabel: e.target.value })}
                      />
                      <span className="setting-default">（默认：{DEFAULT_RISK_RULES.soonExpireLabel}）</span>
                    </label>
                  </div>

                  <div className="setting-section">
                    <h4 className="setting-section-title"><UserX size={14} /> 负责人过载规则</h4>
                    <label className="setting-item">
                      <span className="setting-label">启用规则</span>
                      <div className="setting-toggle">
                        <input
                          type="checkbox"
                          checked={tempRiskRules.overloadEnabled}
                          onChange={(e) => setTempRiskRules({ ...tempRiskRules, overloadEnabled: e.target.checked })}
                        />
                        <span className="toggle-switch"></span>
                      </div>
                    </label>
                    <label className="setting-item">
                      <span className="setting-label">任务数量阈值</span>
                      <div className="setting-input-wrap">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={tempRiskRules.overloadThreshold}
                          onChange={(e) => setTempRiskRules({ ...tempRiskRules, overloadThreshold: e.target.value })}
                        />
                        <span className="setting-unit">台</span>
                      </div>
                      <span className="setting-default">（默认：{DEFAULT_RISK_RULES.overloadThreshold}台）</span>
                    </label>
                    <label className="setting-item">
                      <span className="setting-label">规则名称</span>
                      <input
                        type="text"
                        value={tempRiskRules.overloadLabel}
                        onChange={(e) => setTempRiskRules({ ...tempRiskRules, overloadLabel: e.target.value })}
                      />
                      <span className="setting-default">（默认：{DEFAULT_RISK_RULES.overloadLabel}）</span>
                    </label>
                  </div>

                  <div className="setting-section">
                    <h4 className="setting-section-title"><Building size={14} /> 楼盘集中到期规则</h4>
                    <label className="setting-item">
                      <span className="setting-label">启用规则</span>
                      <div className="setting-toggle">
                        <input
                          type="checkbox"
                          checked={tempRiskRules.estateConcentrationEnabled}
                          onChange={(e) => setTempRiskRules({ ...tempRiskRules, estateConcentrationEnabled: e.target.checked })}
                        />
                        <span className="toggle-switch"></span>
                      </div>
                    </label>
                    <label className="setting-item">
                      <span className="setting-label">到期数量阈值</span>
                      <div className="setting-input-wrap">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={tempRiskRules.estateConcentrationThreshold}
                          onChange={(e) => setTempRiskRules({ ...tempRiskRules, estateConcentrationThreshold: e.target.value })}
                        />
                        <span className="setting-unit">台</span>
                      </div>
                      <span className="setting-default">（默认：{DEFAULT_RISK_RULES.estateConcentrationThreshold}台）</span>
                    </label>
                    <label className="setting-item">
                      <span className="setting-label">时间窗口</span>
                      <div className="setting-input-wrap">
                        <input
                          type="number"
                          min="0"
                          max="365"
                          value={tempRiskRules.estateConcentrationWindow}
                          onChange={(e) => setTempRiskRules({ ...tempRiskRules, estateConcentrationWindow: e.target.value })}
                        />
                        <span className="setting-unit">天</span>
                      </div>
                      <span className="setting-default">（默认：{DEFAULT_RISK_RULES.estateConcentrationWindow}天）</span>
                    </label>
                    <label className="setting-item">
                      <span className="setting-label">规则名称</span>
                      <input
                        type="text"
                        value={tempRiskRules.estateConcentrationLabel}
                        onChange={(e) => setTempRiskRules({ ...tempRiskRules, estateConcentrationLabel: e.target.value })}
                      />
                      <span className="setting-default">（默认：{DEFAULT_RISK_RULES.estateConcentrationLabel}）</span>
                    </label>
                  </div>
                </div>
              </>
            )}
            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={handleResetSettings}>恢复默认</button>
              <button type="button" className="primary" onClick={handleSaveSettings}>保存设置</button>
            </div>
          </div>
        </div>
      )}

      {showDataManager && (
        <div className="modal-overlay" onClick={closeDataManager}>
          <div className="modal-panel data-manager-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="panel-title">
                <HardDrive size={18} />
                <h2>数据导出与恢复</h2>
              </div>
              <button className="modal-close" onClick={closeDataManager}>
                <X size={18} />
              </button>
            </div>

            <div className="dm-tabs">
              <button
                className={'dm-tab ' + (dataManagerTab === 'export' ? 'active' : '')}
                onClick={() => { setDataManagerTab('export'); resetImportState(); resetMergeState(); }}
              >
                <Download size={16} />
                数据导出
              </button>
              <button
                className={'dm-tab ' + (dataManagerTab === 'import' ? 'active' : '')}
                onClick={() => { setDataManagerTab('import'); resetMergeState(); }}
              >
                <RefreshCw size={16} />
                数据恢复
              </button>
              <button
                className={'dm-tab ' + (dataManagerTab === 'merge' ? 'active' : '')}
                onClick={() => { setDataManagerTab('merge'); resetImportState(); }}
              >
                <Database size={16} />
                多端合并
              </button>
            </div>

            {dataManagerTab === 'export' && (
              <div className="dm-content">
                <p className="hint">将当前所有电梯维保记录、提醒配置和路线方案打包导出为JSON文件，用于备份或迁移。</p>
                <div className="dm-summary-grid">
                  <div className="dm-summary-card">
                    <Database size={28} />
                    <div>
                      <span className="dm-summary-label">维保记录</span>
                      <strong className="dm-summary-value">{records.length} 条</strong>
                    </div>
                  </div>
                  <div className="dm-summary-card">
                    <Users size={28} />
                    <div>
                      <span className="dm-summary-label">负责人数量</span>
                      <strong className="dm-summary-value">{new Set(records.map(r => r.owner).filter(Boolean)).size} 人</strong>
                    </div>
                  </div>
                  <div className="dm-summary-card">
                    <Bell size={28} />
                    <div>
                      <span className="dm-summary-label">提醒配置</span>
                      <strong className="dm-summary-value">{Object.keys(reminderSettings).length} 项</strong>
                    </div>
                  </div>
                  <div className="dm-summary-card">
                    <Route size={28} />
                    <div>
                      <span className="dm-summary-label">路线方案</span>
                      <strong className="dm-summary-value">{Object.keys(routePlans).length} 天</strong>
                    </div>
                  </div>
                </div>

                <div className="dm-export-section">
                  <div className="dm-section-title">
                    <HardDrive size={16} />
                    多端合并导出
                  </div>
                  <p className="hint">
                    导出带有设备标识的数据包，用于在多设备间进行离线冲突合并。
                    每条记录包含业务标识和更新时间，便于合并时检测冲突。
                  </p>
                </div>

                <div className="modal-actions">
                  <button type="button" className="secondary-btn" onClick={closeDataManager}>取消</button>
                  <button type="button" className="primary" onClick={handleExportData}>
                    <Download size={16} />
                    导出备份文件
                  </button>
                  <button type="button" className="primary" style={{background: '#059669'}} onClick={handleExportMergeData}>
                    <RefreshCw size={16} />
                    导出合并数据包
                  </button>
                </div>
              </div>
            )}

            {dataManagerTab === 'import' && !importConfirmStep && (
              <div className="dm-content">
                <p className="hint">选择之前导出的JSON文件，系统将验证文件格式和版本，并展示数据摘要供确认。</p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />

                <div className={'dm-dropzone ' + (importFile ? 'has-file' : '')} onClick={handleSelectFileClick}>
                  <FileJson size={42} />
                  {importFileName ? (
                    <>
                      <strong className="dm-filename">{importFileName}</strong>
                      <span className="dm-filehint">点击重新选择文件</span>
                    </>
                  ) : (
                    <>
                      <strong>点击选择JSON文件</strong>
                      <span className="dm-filehint">或拖拽文件到此处（仅支持 .json 格式）</span>
                    </>
                  )}
                </div>

                {importValidation && !importValidation.valid && (
                  <div className="dm-errors">
                    <div className="dm-section-title">
                      <XCircle size={16} />
                      验证失败
                    </div>
                    {importValidation.errors.map((err, idx) => (
                      <div key={idx} className="dm-error-item">
                        <AlertTriangle size={14} />
                        {err}
                      </div>
                    ))}

                    {importValidation.recordErrors && importValidation.recordErrors.length > 0 && (
                      <div className="dm-record-errors">
                        <div className="dm-record-errors-title">
                          <AlertOctagon size={14} />
                          记录明细错误（前 {Math.min(importValidation.recordErrors.length, 10)} 条）
                        </div>
                        <div className="dm-record-errors-list">
                          {importValidation.recordErrors.slice(0, 10).map((item, idx) => (
                            <div key={idx} className="dm-record-error-item">
                              <div className="dm-record-error-head">
                                <span className="dm-record-index">第 {item.index + 1} 条记录</span>
                                <span className="dm-record-elevator">
                                  {item.record.elevatorNo || item.record.estate || '未标识记录'}
                                </span>
                              </div>
                              <div className="dm-record-error-tags">
                                {item.errors.map((err, errIdx) => (
                                  <span key={errIdx} className="dm-error-tag">
                                    {err.type === 'missing' && `${err.field}缺失`}
                                    {err.type === 'invalidCycle' && `不支持的维保周期：${err.value}`}
                                    {err.type === 'invalidDate' && `日期格式错误：${err.value}`}
                                    {err.type === 'invalidStatus' && `无效状态：${err.value}`}
                                    {err.type === 'duplicate' && `电梯编号重复：${err.value}`}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        {importValidation.recordErrors.length > 10 && (
                          <div className="dm-more-errors-hint">
                            还有 {importValidation.recordErrors.length - 10} 条记录存在错误，请修正后重新导入
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {importValidation && importValidation.valid && (
                  <div className="dm-validation-ok">
                    <div className="dm-section-title">
                      <CheckCircle2 size={16} />
                      文件验证通过
                    </div>

                    {importValidation.warnings.length > 0 && (
                      <div className="dm-warnings">
                        {importValidation.warnings.map((warn, idx) => (
                          <div key={idx} className="dm-warning-item">
                            <AlertTriangle size={14} />
                            {warn}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="dm-preview-title">
                      <Database size={16} />
                      数据摘要
                    </div>
                    <div className="dm-preview-grid">
                      <div className="dm-preview-item">
                        <span className="dm-preview-label">维保记录数</span>
                        <strong className="dm-preview-value">{importValidation.summary.recordCount} 条</strong>
                      </div>
                      <div className="dm-preview-item">
                        <span className="dm-preview-label">负责人数量</span>
                        <strong className="dm-preview-value">{importValidation.summary.ownerCount} 人</strong>
                      </div>
                      <div className="dm-preview-item">
                        <span className="dm-preview-label">最早维保日期</span>
                        <strong className="dm-preview-value">{importValidation.summary.earliestDate || '—'}</strong>
                      </div>
                      <div className="dm-preview-item">
                        <span className="dm-preview-label">最晚维保日期</span>
                        <strong className="dm-preview-value">{importValidation.summary.latestDate || '—'}</strong>
                      </div>
                    </div>

                    <div className="dm-overwrite-warn">
                      <ShieldAlert size={20} />
                      <div>
                        <strong>数据覆盖警告</strong>
                        <p>恢复操作将<strong>完全覆盖</strong>当前本地的所有维保记录、提醒配置和路线方案，此操作不可撤销。建议先导出当前数据进行备份。</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="modal-actions">
                  <button type="button" className="secondary-btn" onClick={closeDataManager}>取消</button>
                  <button
                    type="button"
                    className="primary danger"
                    onClick={() => setImportConfirmStep(true)}
                    disabled={!importValidation?.valid}
                  >
                    <RefreshCw size={16} />
                    开始恢复
                  </button>
                </div>
              </div>
            )}

            {dataManagerTab === 'import' && importConfirmStep && (
              <div className="dm-content">
                <div className="dm-confirm-box">
                  <AlertOctagon size={48} />
                  <h3>最终确认：是否恢复数据？</h3>
                  <p>您即将从 <strong>{importFileName}</strong> 恢复以下数据：</p>
                  <ul className="dm-confirm-list">
                    <li>维保记录：<strong>{importValidation?.summary.recordCount} 条</strong></li>
                    <li>负责人：<strong>{importValidation?.summary.ownerCount} 人</strong></li>
                    <li>维保日期范围：<strong>{importValidation?.summary.earliestDate || '—'}</strong> 至 <strong>{importValidation?.summary.latestDate || '—'}</strong></li>
                  </ul>
                  <p className="dm-final-warn">⚠️ 当前所有本地数据将被永久覆盖，无法撤销！</p>
                </div>
                <div className="modal-actions">
                  <button type="button" className="secondary-btn" onClick={() => setImportConfirmStep(false)}>返回修改</button>
                  <button type="button" className="primary danger" onClick={handleConfirmRestore}>
                    <CheckCircle2 size={16} />
                    确认恢复并覆盖
                  </button>
                </div>
              </div>
            )}

            {dataManagerTab === 'merge' && mergeStep === 'upload' && (
              <div className="dm-content">
                <p className="hint">
                  导入其他设备导出的维保数据文件，系统将自动检测冲突并提供逐条合并选项。
                  每条记录以电梯编号作为稳定业务标识进行匹配。
                </p>

                <input
                  ref={mergeFileInputRef}
                  type="file"
                  accept=".json,application/json"
                  style={{ display: 'none' }}
                  onChange={handleMergeFileChange}
                />

                <div className={'dm-dropzone ' + (mergeFile ? 'has-file' : '')} onClick={handleSelectMergeFileClick}>
                  <FileJson size={42} />
                  {mergeFileName ? (
                    <>
                      <strong className="dm-filename">{mergeFileName}</strong>
                      <span className="dm-filehint">点击重新选择文件</span>
                    </>
                  ) : (
                    <>
                      <strong>点击选择JSON文件</strong>
                      <span className="dm-filehint">或拖拽文件到此处（仅支持 .json 格式）</span>
                    </>
                  )}
                </div>

                {mergeValidation && !mergeValidation.valid && (
                  <div className="dm-errors">
                    <div className="dm-section-title">
                      <XCircle size={16} />
                      验证失败
                    </div>
                    {mergeValidation.errors.map((err, idx) => (
                      <div key={idx} className="dm-error-item">
                        <AlertTriangle size={14} />
                        {err}
                      </div>
                    ))}
                  </div>
                )}

                {mergeValidation && mergeValidation.valid && (
                  <div className="dm-validation-ok">
                    <div className="dm-section-title">
                      <CheckCircle2 size={16} />
                      文件验证通过
                    </div>

                    {deviceInfo?.name && (
                      <div className="dm-device-info">
                        <div className="dm-device-info-icon"><HardDrive size={18} /></div>
                        <div>
                          <strong>来源设备：{deviceInfo.name}</strong>
                          {deviceInfo.id && <p className="hint" style={{marginTop: 4}}>设备ID：{deviceInfo.id}</p>}
                        </div>
                      </div>
                    )}

                    {mergeValidation.warnings && mergeValidation.warnings.length > 0 && (
                      <div className="dm-warnings">
                        {mergeValidation.warnings.map((warn, idx) => (
                          <div key={idx} className="dm-warning-item">
                            <AlertTriangle size={14} />
                            {warn}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="dm-preview-title">
                      <Database size={16} />
                      数据摘要
                    </div>
                    <div className="dm-preview-grid">
                      <div className="dm-preview-item">
                        <span className="dm-preview-label">维保记录数</span>
                        <strong className="dm-preview-value">{mergeValidation.summary.recordCount} 条</strong>
                      </div>
                      <div className="dm-preview-item">
                        <span className="dm-preview-label">负责人数量</span>
                        <strong className="dm-preview-value">{mergeValidation.summary.ownerCount} 人</strong>
                      </div>
                      <div className="dm-preview-item">
                        <span className="dm-preview-label">最早维保日期</span>
                        <strong className="dm-preview-value">{mergeValidation.summary.earliestDate || '—'}</strong>
                      </div>
                      <div className="dm-preview-item">
                        <span className="dm-preview-label">最晚维保日期</span>
                        <strong className="dm-preview-value">{mergeValidation.summary.latestDate || '—'}</strong>
                      </div>
                    </div>

                    <div className="dm-merge-hint">
                      <Zap size={20} />
                      <div>
                        <strong>智能合并说明</strong>
                        <p>系统将自动匹配相同电梯编号的记录，检测状态、日期和时间线冲突，您可以逐条选择处理方式。</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="modal-actions">
                  <button type="button" className="secondary-btn" onClick={closeDataManager}>取消</button>
                  <button
                    type="button"
                    className="primary"
                    onClick={handleStartMerge}
                    disabled={!mergeValidation?.valid}
                  >
                    <RefreshCw size={16} />
                    开始合并检测
                  </button>
                </div>
              </div>
            )}

            {dataManagerTab === 'merge' && mergeStep === 'resolve' && mergeConflicts.length > 0 && (
              <div className="dm-content merge-resolve-content">
                <div className="merge-steps">
                  <div className="merge-step done">
                    <span className="merge-step-num">1</span>
                    <span>上传文件</span>
                  </div>
                  <div className="merge-step-line done" />
                  <div className="merge-step active">
                    <span className="merge-step-num">2</span>
                    <span>解决冲突</span>
                  </div>
                  <div className="merge-step-line" />
                  <div className="merge-step">
                    <span className="merge-step-num">3</span>
                    <span>确认合并</span>
                  </div>
                </div>

                <div className="merge-progress">
                  <div className="merge-progress-info">
                    <span>共 <strong>{mergeConflicts.length}</strong> 条冲突记录</span>
                    <span>
                      已解决 <strong>{Object.values(conflictResolutions).filter(r => r.resolution !== 'pending').length}</strong> / {mergeConflicts.length}
                    </span>
                  </div>
                  <div className="merge-progress-bar">
                    <div 
                      className="merge-progress-fill"
                      style={{ width: `${(Object.values(conflictResolutions).filter(r => r.resolution !== 'pending').length / mergeConflicts.length) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="merge-conflict-nav">
                  <button 
                    className="secondary-btn small-btn" 
                    onClick={handlePrevConflict}
                    disabled={currentConflictIndex === 0}
                  >
                    <ChevronLeft size={16} />
                    上一条
                  </button>
                  <span className="merge-conflict-count">
                    第 {currentConflictIndex + 1} / {mergeConflicts.length} 条冲突
                  </span>
                  <button 
                    className="secondary-btn small-btn" 
                    onClick={handleNextConflict}
                    disabled={currentConflictIndex === mergeConflicts.length - 1}
                  >
                    下一条
                    <ChevronRight size={16} />
                  </button>
                </div>

                {mergeConflicts[currentConflictIndex] && (() => {
                  const conflict = mergeConflicts[currentConflictIndex];
                  const resolution = conflictResolutions[currentConflictIndex];
                  const { localRecord, importRecord, conflictTypes } = conflict;

                  return (
                    <div className="merge-conflict-detail">
                      <div className="conflict-record-header">
                        <div className="conflict-record-identity">
                          <strong>{localRecord.estate} {localRecord.building}</strong>
                          <span>{localRecord.elevatorNo} · {localRecord.cycle}</span>
                        </div>
                        <div className="conflict-type-tags">
                          {conflictTypes.map((ct, idx) => (
                            <span key={idx} className="conflict-type-tag">
                              <AlertTriangle size={12} />
                              {ct.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="conflict-compare">
                        <div className="conflict-side local-side">
                          <div className="conflict-side-header">
                            <span className="conflict-side-badge local-badge">本地记录</span>
                            {localRecord.updatedAt && (
                              <span className="conflict-side-time">
                                更新于 {new Date(localRecord.updatedAt).toLocaleString('zh-CN')}
                              </span>
                            )}
                          </div>
                          <div className="conflict-side-fields">
                            <div className="conflict-field">
                              <span className="conflict-field-label">状态</span>
                              <span className={'conflict-field-value status ' + statusClass(localRecord.status)}>
                                {localRecord.status}
                              </span>
                            </div>
                            <div className="conflict-field">
                              <span className="conflict-field-label">下次维保</span>
                              <span className="conflict-field-value">{localRecord.nextDate}</span>
                            </div>
                            <div className="conflict-field">
                              <span className="conflict-field-label">负责人</span>
                              <span className="conflict-field-value">{localRecord.owner}</span>
                            </div>
                            <div className="conflict-field">
                              <span className="conflict-field-label">时间线</span>
                              <span className="conflict-field-value">
                                {(localRecord.timeline || []).length} 条记录
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="conflict-vs">VS</div>

                        <div className="conflict-side import-side">
                          <div className="conflict-side-header">
                            <span className="conflict-side-badge import-badge">导入记录</span>
                            {importRecord.updatedAt && (
                              <span className="conflict-side-time">
                                更新于 {new Date(importRecord.updatedAt).toLocaleString('zh-CN')}
                              </span>
                            )}
                          </div>
                          <div className="conflict-side-fields">
                            <div className="conflict-field">
                              <span className="conflict-field-label">状态</span>
                              <span className={'conflict-field-value status ' + statusClass(importRecord.status)}>
                                {importRecord.status}
                              </span>
                            </div>
                            <div className="conflict-field">
                              <span className="conflict-field-label">下次维保</span>
                              <span className="conflict-field-value">{importRecord.nextDate}</span>
                            </div>
                            <div className="conflict-field">
                              <span className="conflict-field-label">负责人</span>
                              <span className="conflict-field-value">{importRecord.owner}</span>
                            </div>
                            <div className="conflict-field">
                              <span className="conflict-field-label">时间线</span>
                              <span className="conflict-field-value">
                                {(importRecord.timeline || []).length} 条记录
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="conflict-resolution-options">
                        <div className="dm-section-title">选择处理方式</div>
                        <div className="resolution-buttons">
                          <button
                            className={'resolution-btn ' + (resolution?.resolution === 'keepLocal' ? 'active' : '')}
                            onClick={() => handleResolveConflict(currentConflictIndex, 'keepLocal')}
                          >
                            <div className="resolution-btn-icon local-icon">💾</div>
                            <div className="resolution-btn-text">
                              <strong>保留本地</strong>
                              <span>使用本地字段和时间线</span>
                            </div>
                          </button>
                          <button
                            className={'resolution-btn ' + (resolution?.resolution === 'useImport' ? 'active' : '')}
                            onClick={() => handleResolveConflict(currentConflictIndex, 'useImport')}
                          >
                            <div className="resolution-btn-icon import-icon">📥</div>
                            <div className="resolution-btn-text">
                              <strong>使用导入</strong>
                              <span>使用导入字段和时间线</span>
                            </div>
                          </button>
                          <button
                            className={'resolution-btn ' + (resolution?.resolution === 'manual' ? 'active' : '')}
                            onClick={() => handleOpenManualMerge(currentConflictIndex)}
                          >
                            <div className="resolution-btn-icon manual-icon">✏️</div>
                            <div className="resolution-btn-text">
                              <strong>手动合并</strong>
                              <span>自定义选择各字段值</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="modal-actions">
                  <button type="button" className="secondary-btn" onClick={() => setMergeStep('upload')}>
                    返回上传
                  </button>
                  <button
                    type="button"
                    className="primary"
                    onClick={goToReviewStep}
                    disabled={!handleAllConflictsResolved()}
                  >
                    <CheckCircle2 size={16} />
                    全部解决，下一步
                  </button>
                </div>
              </div>
            )}

            {dataManagerTab === 'merge' && mergeStep === 'review' && (
              <div className="dm-content">
                <div className="merge-steps">
                  <div className="merge-step done">
                    <span className="merge-step-num">1</span>
                    <span>上传文件</span>
                  </div>
                  <div className="merge-step-line done" />
                  <div className="merge-step done">
                    <span className="merge-step-num">2</span>
                    <span>解决冲突</span>
                  </div>
                  <div className="merge-step-line done" />
                  <div className="merge-step active">
                    <span className="merge-step-num">3</span>
                    <span>确认合并</span>
                  </div>
                </div>

                <div className="merge-review-summary">
                  <div className="dm-section-title">
                    <CheckCircle2 size={16} />
                    合并预览
                  </div>
                  
                  <div className="merge-review-grid">
                    <div className="merge-review-item">
                      <span className="merge-review-label">本地原有记录</span>
                      <strong className="merge-review-value">{records.length} 条</strong>
                    </div>
                    <div className="merge-review-item">
                      <span className="merge-review-label">导入记录</span>
                      <strong className="merge-review-value">
                        {mergeValidation?.summary.recordCount || 0} 条
                      </strong>
                    </div>
                    <div className="merge-review-item">
                      <span className="merge-review-label">检测到冲突</span>
                      <strong className="merge-review-value conflict-count">
                        {mergeConflicts.length} 条
                      </strong>
                    </div>
                    <div className="merge-review-item">
                      <span className="merge-review-label">自动合并</span>
                      <strong className="merge-review-value success-count">
                        {(mergeNoConflicts?.importOnly?.length || 0) + 
                         (mergeNoConflicts?.localOnly?.length || 0) + 
                         (mergeNoConflicts?.autoMergeable?.length || 0)} 条
                      </strong>
                    </div>
                  </div>

                  <div className="merge-review-details">
                    {mergeNoConflicts?.importOnly && mergeNoConflicts.importOnly.length > 0 && (
                      <div className="merge-review-detail-item">
                        <span className="detail-icon plus">+</span>
                        <span>新增记录（仅导入有）：</span>
                        <strong>{mergeNoConflicts.importOnly.length} 条</strong>
                      </div>
                    )}
                    {mergeNoConflicts?.localOnly && mergeNoConflicts.localOnly.length > 0 && (
                      <div className="merge-review-detail-item">
                        <span className="detail-icon keep">K</span>
                        <span>保留记录（仅本地有）：</span>
                        <strong>{mergeNoConflicts.localOnly.length} 条</strong>
                      </div>
                    )}
                    {mergeNoConflicts?.autoMergeable && mergeNoConflicts.autoMergeable.length > 0 && (
                      <div className="merge-review-detail-item">
                        <span className="detail-icon merge">M</span>
                        <span>无冲突自动合并：</span>
                        <strong>{mergeNoConflicts.autoMergeable.length} 条</strong>
                      </div>
                    )}
                    {mergeConflicts.length > 0 && (
                      <div className="merge-review-detail-item">
                        <span className="detail-icon conflict">!</span>
                        <span>已解决冲突：</span>
                        <strong>{mergeConflicts.length} 条</strong>
                      </div>
                    )}
                  </div>

                  <div className="dm-merge-hint">
                    <ShieldAlert size={20} />
                    <div>
                      <strong>合并完成后</strong>
                      <p>合并后的记录将保存到本地，原有数据将被替换。建议先导出本地数据备份。</p>
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="secondary-btn" onClick={() => mergeConflicts.length > 0 ? setMergeStep('resolve') : setMergeStep('upload')}>
                    返回修改
                  </button>
                  <button type="button" className="primary" onClick={handleExecuteMerge}>
                    <CheckCircle2 size={16} />
                    确认并执行合并
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showManualMergeModal && mergeConflicts[currentConflictIndex] && (
        <div className="modal-overlay" onClick={() => setShowManualMergeModal(false)}>
          <div className="modal-panel manual-merge-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="panel-title">
                <Settings size={18} />
                <h2>手动合并</h2>
              </div>
              <button className="modal-close" onClick={() => setShowManualMergeModal(false)}>
                <X size={18} />
              </button>
            </div>

            <p className="hint">
              为每条字段选择您希望保留的值，时间线将自动合并两边的所有记录。
            </p>

            <div className="manual-merge-form">
              {(() => {
                const conflict = mergeConflicts[currentConflictIndex];
                const displayedFields = new Set();
                const fields = [];

                appConfig.fields.forEach((field) => {
                  displayedFields.add(field.key);
                  const localVal = conflict.localRecord[field.key];
                  const importVal = conflict.importRecord[field.key];
                  const hasConflict = localVal !== importVal;
                  fields.push(
                    <div key={field.key} className={'manual-merge-field ' + (hasConflict ? 'has-conflict' : '')}>
                      <label className="manual-merge-label">
                        <span>{field.label}</span>
                        {hasConflict && <span className="conflict-badge">冲突</span>}
                      </label>
                      <div className="manual-merge-options">
                        <button
                          type="button"
                          className={'manual-merge-option local-option ' + (manualMergeForm[field.key] === localVal ? 'selected' : '')}
                          onClick={() => setManualMergeForm({ ...manualMergeForm, [field.key]: localVal })}
                        >
                          <span className="option-badge">本地</span>
                          <span className="option-value">
                            {field.type === 'select' ? (localVal || '—') : (localVal || '—')}
                          </span>
                        </button>
                        <button
                          type="button"
                          className={'manual-merge-option import-option ' + (manualMergeForm[field.key] === importVal ? 'selected' : '')}
                          onClick={() => setManualMergeForm({ ...manualMergeForm, [field.key]: importVal })}
                        >
                          <span className="option-badge">导入</span>
                          <span className="option-value">
                            {field.type === 'select' ? (importVal || '—') : (importVal || '—')}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                });

                CONFLICT_FIELDS.forEach(({ key, label }) => {
                  if (displayedFields.has(key)) return;
                  if (!conflict.localRecord.hasOwnProperty(key) && !conflict.importRecord.hasOwnProperty(key)) return;
                  
                  displayedFields.add(key);
                  const localVal = conflict.localRecord[key];
                  const importVal = conflict.importRecord[key];
                  const hasConflict = localVal !== importVal;
                  fields.push(
                    <div key={key} className={'manual-merge-field ' + (hasConflict ? 'has-conflict' : '')}>
                      <label className="manual-merge-label">
                        <span>{label}</span>
                        {hasConflict && <span className="conflict-badge">冲突</span>}
                      </label>
                      <div className="manual-merge-options">
                        <button
                          type="button"
                          className={'manual-merge-option local-option ' + (manualMergeForm[key] === localVal ? 'selected' : '')}
                          onClick={() => setManualMergeForm({ ...manualMergeForm, [key]: localVal })}
                        >
                          <span className="option-badge">本地</span>
                          <span className="option-value">{localVal || '—'}</span>
                        </button>
                        <button
                          type="button"
                          className={'manual-merge-option import-option ' + (manualMergeForm[key] === importVal ? 'selected' : '')}
                          onClick={() => setManualMergeForm({ ...manualMergeForm, [key]: importVal })}
                        >
                          <span className="option-badge">导入</span>
                          <span className="option-value">{importVal || '—'}</span>
                        </button>
                      </div>
                    </div>
                  );
                });

                return fields;
              })()}

              <div className="manual-merge-field timeline-info">
                <div className="timeline-info-header">
                  <Clock size={16} />
                  <strong>时间线</strong>
                </div>
                <p className="hint">时间线将自动合并两边的所有记录，并按时间排序。</p>
                <div className="timeline-counts">
                  <span>本地：{(mergeConflicts[currentConflictIndex].localRecord.timeline || []).length} 条</span>
                  <span>导入：{(mergeConflicts[currentConflictIndex].importRecord.timeline || []).length} 条</span>
                  <span className="merge-total">
                    合并后：{mergeTimelines(
                      mergeConflicts[currentConflictIndex].localRecord.timeline || [],
                      mergeConflicts[currentConflictIndex].importRecord.timeline || []
                    ).length} 条
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={() => setShowManualMergeModal(false)}>取消</button>
              <button type="button" className="primary" onClick={() => handleSaveManualMerge(currentConflictIndex)}>
                <CheckCircle2 size={16} />
                确认手动合并
              </button>
            </div>
          </div>
        </div>
      )}

      {showAutoPlanConfig && (
        <div className="modal-overlay" onClick={() => setShowAutoPlanConfig(false)}>
          <div className="modal-panel auto-plan-config-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="panel-title">
                <Settings size={18} />
                <h2>生成器配置</h2>
              </div>
              <button className="modal-close" onClick={() => setShowAutoPlanConfig(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="hint">调整智能计划生成器的参数，生成新计划时将使用这些配置。</p>

            <div className="config-form">
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <label>
                  <span><CalendarDays size={14} /> 计划天数</span>
                  <input
                    type="number"
                    min="7"
                    max="90"
                    value={tempAutoPlanConfig.planDays}
                    onChange={(e) => setTempAutoPlanConfig({ ...tempAutoPlanConfig, planDays: e.target.value })}
                  />
                  <span className="hint" style={{ marginTop: 4 }}>范围 7~90 天（默认30天）</span>
                </label>
                <label>
                  <span><User size={14} /> 默认每日任务上限</span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={tempAutoPlanConfig.defaultDailyLimit}
                    onChange={(e) => setTempAutoPlanConfig({ ...tempAutoPlanConfig, defaultDailyLimit: e.target.value })}
                  />
                  <span className="hint" style={{ marginTop: 4 }}>每位负责人每日最多处理台数</span>
                </label>
              </div>

              <div className="config-toggles">
                <label className="config-toggle">
                  <input
                    type="checkbox"
                    checked={tempAutoPlanConfig.estateConcentration}
                    onChange={(e) => setTempAutoPlanConfig({ ...tempAutoPlanConfig, estateConcentration: e.target.checked })}
                  />
                  <div>
                    <strong>楼盘集中优化</strong>
                    <p>同一楼盘的设备尽量安排在同一天，减少路途损耗</p>
                  </div>
                </label>
                <label className="config-toggle">
                  <input
                    type="checkbox"
                    checked={tempAutoPlanConfig.priorityOverdue}
                    onChange={(e) => setTempAutoPlanConfig({ ...tempAutoPlanConfig, priorityOverdue: e.target.checked })}
                  />
                  <div>
                    <strong>逾期优先安排</strong>
                    <p>已逾期设备将获得最高优先级，尽量安排在最近日期</p>
                  </div>
                </label>
                <label className="config-toggle">
                  <input
                    type="checkbox"
                    checked={tempAutoPlanConfig.prioritySoon}
                    onChange={(e) => setTempAutoPlanConfig({ ...tempAutoPlanConfig, prioritySoon: e.target.checked })}
                  />
                  <div>
                    <strong>临近到期优先</strong>
                    <p>临近维保日期的设备优先安排，避免逾期</p>
                  </div>
                </label>
                <label className="config-toggle">
                  <input
                    type="checkbox"
                    checked={tempAutoPlanConfig.allowAdvanceScheduling}
                    onChange={(e) => setTempAutoPlanConfig({ ...tempAutoPlanConfig, allowAdvanceScheduling: e.target.checked })}
                  />
                  <div>
                    <strong>允许提前排期</strong>
                    <p>关闭时，设备只能在到期日或之后安排；开启时可设置最大提前天数</p>
                  </div>
                </label>
                {tempAutoPlanConfig.allowAdvanceScheduling && (
                  <label className="config-toggle config-toggle-with-input">
                    <div>
                      <strong>最大提前天数</strong>
                      <p>设备最多可提前几天安排（0表示仅到期日当天及之后）</p>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={tempAutoPlanConfig.maxAdvanceDays ?? 0}
                        onChange={(e) => setTempAutoPlanConfig({ ...tempAutoPlanConfig, maxAdvanceDays: Math.max(0, parseInt(e.target.value) || 0) })}
                        style={{ marginTop: 6, width: 100 }}
                      />
                      <span className="setting-unit" style={{ marginLeft: 6 }}>天</span>
                    </div>
                  </label>
                )}
              </div>

              <div className="owner-limits-section">
                <div className="panel-title" style={{ marginBottom: 10 }}>
                  <Users size={16} />
                  <h3>负责人个性化上限（可选）</h3>
                </div>
                <p className="hint" style={{ marginTop: 0 }}>为特定负责人设置单独的每日任务上限，留空则使用默认值。</p>
                <div className="owner-limits-grid">
                  {(() => {
                    const uniqueOwners = [...new Set(records.map(r => r.owner).filter(Boolean))];
                    return uniqueOwners.map((owner) => (
                      <label key={owner} className="owner-limit-item">
                        <span className="owner-limit-name"><User size={12} /> {owner}</span>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          placeholder={`默认：${tempAutoPlanConfig.defaultDailyLimit}`}
                          value={tempAutoPlanConfig.ownerDailyLimits?.[owner] ?? ''}
                          onChange={(e) => {
                            const newLimits = { ...(tempAutoPlanConfig.ownerDailyLimits || {}) };
                            if (e.target.value) {
                              newLimits[owner] = e.target.value;
                            } else {
                              delete newLimits[owner];
                            }
                            setTempAutoPlanConfig({ ...tempAutoPlanConfig, ownerDailyLimits: newLimits });
                          }}
                        />
                        <span className="setting-unit">台/天</span>
                      </label>
                    ));
                  })()}
                  {[...new Set(records.map(r => r.owner).filter(Boolean))].length === 0 && (
                    <p className="empty">暂无负责人记录，请先添加包含负责人的维保记录。</p>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={() => setShowAutoPlanConfig(false)}>取消</button>
              <button type="button" className="primary" onClick={saveAutoPlanConfigModal}>
                <Save size={16} />
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}

      {planEditItem && (
        <div className="modal-overlay" onClick={() => { setPlanEditItem(null); setPlanEditForm({ date: '', owner: '' }); }}>
          <div className="modal-panel plan-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="panel-title">
                <Settings size={18} />
                <h2>调整计划安排</h2>
              </div>
              <button className="modal-close" onClick={() => { setPlanEditItem(null); setPlanEditForm({ date: '', owner: '' }); }}>
                <X size={18} />
              </button>
            </div>

            <div className="plan-edit-device">
              <strong>{planEditItem.estate} {planEditItem.building}</strong>
              <p>{planEditItem.elevatorNo} · {planEditItem.cycle} · 原定日期：{planEditItem.originalNextDate}</p>
              {planEditItem.daysDiff < 0 && (
                <div className="reminder-tag reminder-overdue">
                  <AlertTriangle size={12} /> 已逾期 {Math.abs(planEditItem.daysDiff)} 天
                </div>
              )}
            </div>

            <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <label>
                <span><Calendar size={14} /> 计划维保日期</span>
                <input
                  type="date"
                  value={planEditForm.date}
                  min={today}
                  onChange={(e) => setPlanEditForm({ ...planEditForm, date: e.target.value })}
                />
              </label>
              <label>
                <span><User size={14} /> 负责人</span>
                <select
                  value={planEditForm.owner}
                  onChange={(e) => setPlanEditForm({ ...planEditForm, owner: e.target.value })}
                >
                  <option value="">（不修改）</option>
                  {[...new Set(records.map(r => r.owner).filter(Boolean))].map((owner) => (
                    <option key={owner} value={owner}>{owner}</option>
                  ))}
                </select>
              </label>
            </div>

            <p className="hint">调整后设备将重新归类到对应日期的计划中，系统不会检查上限，请合理安排。</p>

            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={() => { setPlanEditItem(null); setPlanEditForm({ date: '', owner: '' }); }}>取消</button>
              <button
                type="button"
                className="primary"
                onClick={savePlanItemEdit}
                disabled={!planEditForm.date}
              >
                <CheckCircle2 size={16} />
                确认调整
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="modal-overlay" onClick={() => { setShowImportModal(false); setParsedImport(null); setImportMeta({ fieldMapping: null, hasHeader: false, headerCells: null }); }}>
          <div className="modal-panel import-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="panel-title">
                <Upload size={18} />
                <h2>批量导入预检</h2>
              </div>
              <button className="modal-close" onClick={() => { setShowImportModal(false); setParsedImport(null); setImportMeta({ fieldMapping: null, hasHeader: false, headerCells: null }); }}>
                <X size={18} />
              </button>
            </div>
            <p className="hint">
              粘贴多行电梯维保数据，支持制表符、英文逗号、中文逗号、空格及混合分隔，自动跳过空行。可首行带表头（楼盘、楼栋、电梯编号、维保周期、下次维保日期、负责人），无表头时按默认顺序解析。
            </p>

            <label className="import-label">
              <span>数据内容</span>
              <textarea
                className="import-textarea"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="楼盘,楼栋,电梯编号,维保周期,下次维保日期,负责人&#10;星河湾,3栋,E-032,15天,2026-06-13,赵师傅&#10;海棠府 1栋 E-118 15天 2026-06-12 钱师傅"
                rows={6}
              />
            </label>

            <button type="button" className="primary" onClick={handleImportPreview} disabled={!importText.trim()}>
              <FileText size={16} />
              预览校验
            </button>

            {parsedImport && (
              <div className="import-preview">
                <div className="import-stats">
                  <div className="import-stat">
                    <span className="import-stat-label">总计</span>
                    <strong className="import-stat-value">{parsedImport.length}</strong>
                  </div>
                  <div className="import-stat success">
                    <span className="import-stat-label">可导入</span>
                    <strong className="import-stat-value">{parsedImport.filter(r => r.errors.length === 0).length}</strong>
                  </div>
                  <div className="import-stat error">
                    <span className="import-stat-label">有错误</span>
                    <strong className="import-stat-value">{parsedImport.filter(r => r.errors.length > 0).length}</strong>
                  </div>
                </div>

                <div className="import-field-mapping">
                  <div className="import-mapping-title">
                    <Database size={14} />
                    <span>字段映射</span>
                    {importMeta.hasHeader ? (
                      <span className="import-mapping-badge success">已识别表头</span>
                    ) : (
                      <span className="import-mapping-badge">按默认顺序</span>
                    )}
                  </div>
                  <div className="import-mapping-list">
                    {(() => {
                      const keyToLabel = {};
                      appConfig.fields.forEach(f => { keyToLabel[f.key] = f.label; });
                      const defaultOrder = ['estate', 'building', 'elevatorNo', 'cycle', 'nextDate', 'owner'];
                      if (importMeta.hasHeader && importMeta.fieldMapping && importMeta.headerCells) {
                        return importMeta.headerCells.map((cell, idx) => {
                          const mappedKey = importMeta.fieldMapping[idx];
                          const mappedLabel = mappedKey ? keyToLabel[mappedKey] : null;
                          return (
                            <div key={idx} className={'import-mapping-item ' + (mappedLabel ? 'mapped' : 'unmapped')}>
                              <span className="import-mapping-source">「{cell}」</span>
                              <span className="import-mapping-arrow">→</span>
                              <span className="import-mapping-target">
                                {mappedLabel || <em>未识别字段</em>}
                              </span>
                            </div>
                          );
                        });
                      } else {
                        return defaultOrder.map((key, idx) => (
                          <div key={key} className="import-mapping-item mapped">
                            <span className="import-mapping-source">第{idx + 1}列</span>
                            <span className="import-mapping-arrow">→</span>
                            <span className="import-mapping-target">{keyToLabel[key]}</span>
                          </div>
                        ));
                      }
                    })()}
                  </div>
                </div>

                <div className="import-preview-list">
                  {parsedImport.map((record, index) => (
                    <div key={index} className={'import-preview-item ' + (record.errors.length > 0 ? 'has-error' : 'is-valid')}>
                      <div className="import-preview-head">
                        <span className="import-line-no">第 {record.lineIndex + 1} 行</span>
                        {record.errors.length > 0 ? (
                          <span className="import-status error">
                            <XCircle size={14} />
                            {record.errors.length} 处错误
                          </span>
                        ) : (
                          <span className="import-status success">
                            <CheckCircle2 size={14} />
                            可导入
                          </span>
                        )}
                      </div>
                      <div className="import-preview-fields">
                        <span className="import-field">
                          <span className="import-field-label">楼盘</span>
                          <span className={'import-field-value ' + (record.errors.some(e => e.field === '楼盘') ? 'error-value' : '')}>
                            {record.estate || '—'}
                          </span>
                        </span>
                        <span className="import-field">
                          <span className="import-field-label">楼栋</span>
                          <span className={'import-field-value ' + (record.errors.some(e => e.field === '楼栋') ? 'error-value' : '')}>
                            {record.building || '—'}
                          </span>
                        </span>
                        <span className="import-field">
                          <span className="import-field-label">电梯编号</span>
                          <span className={'import-field-value ' + (record.errors.some(e => e.field === '电梯编号') ? 'error-value' : '')}>
                            {record.elevatorNo || '—'}
                          </span>
                        </span>
                        <span className="import-field">
                          <span className="import-field-label">维保周期</span>
                          <span className={'import-field-value ' + (record.errors.some(e => e.field === '维保周期') ? 'error-value' : '')}>
                            {record.cycle || '—'}
                          </span>
                        </span>
                        <span className="import-field">
                          <span className="import-field-label">下次维保日期</span>
                          <span className={'import-field-value ' + (record.errors.some(e => e.field === '下次维保日期') ? 'error-value' : '')}>
                            {record.nextDate || '—'}
                          </span>
                        </span>
                        <span className="import-field">
                          <span className="import-field-label">负责人</span>
                          <span className={'import-field-value ' + (record.errors.some(e => e.field === '负责人') ? 'error-value' : '')}>
                            {record.owner || '—'}
                          </span>
                        </span>
                      </div>
                      {record.errors.length > 0 && (
                        <div className="import-errors">
                          {record.errors.map((err, errIdx) => (
                            <span key={errIdx} className="import-error-tag">
                              <AlertTriangle size={12} />
                              {err.type === 'missing' && `${err.field}缺失`}
                              {err.type === 'duplicate' && `电梯编号重复（导入内）`}
                              {err.type === 'duplicateExisting' && `电梯编号已存在`}
                              {err.type === 'invalidDate' && `日期格式错误`}
                              {err.type === 'invalidCycle' && `不支持的维保周期`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={() => { setShowImportModal(false); setParsedImport(null); setImportMeta({ fieldMapping: null, hasHeader: false, headerCells: null }); }}>取消</button>
              <button
                type="button"
                className="primary"
                onClick={handleConfirmImport}
                disabled={!parsedImport || parsedImport.filter(r => r.errors.length === 0).length === 0}
              >
                确认导入（{parsedImport ? parsedImport.filter(r => r.errors.length === 0).length : 0} 条）
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="metrics">
        {metrics.map((metric) => (
          <article className="metric" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </section>

      {routePlanningView ? (
        <section className="route-planning">
          <div className="panel route-header-panel">
            <div className="route-date-tabs">
              {routeDates.map((date, idx) => {
                const d = new Date(date);
                const dayLabel = idx === 0 ? '今日' : weekdayLabels[(d.getDay() + 6) % 7];
                const plan = routePlans[date];
                const hasPlan = plan && plan.routes && plan.routes.length > 0;
                return (
                  <button
                    key={date}
                    className={'route-date-tab ' + (selectedRouteDate === date ? 'active' : '')}
                    onClick={() => setSelectedRouteDate(date)}
                  >
                    <span className="route-date-day">{dayLabel}</span>
                    <span className="route-date-num">{d.getMonth() + 1}/{d.getDate()}</span>
                    {hasPlan && <span className="route-date-dot" />}
                  </button>
                );
              })}
            </div>
            <div className="route-header-actions">
              <button className="secondary-btn save-route-btn" onClick={() => setShowPrintExportModal(true)}>
                <Printer size={16} />
                打印 / 导出
              </button>
              <button className="primary save-route-btn" onClick={handleSaveRoutePlan}>
                <Save size={16} />
                保存路线方案
              </button>
            </div>
          </div>

          <div className="route-layout">
            <section className="panel route-devices-panel">
              <div className="panel-title-with-actions">
                <div className="panel-title">
                  <MapPin size={18} />
                  <h2>待编排设备（今日~未来7天）</h2>
                </div>
              </div>
              <div className="search route-search">
                <Search size={16} />
                <input
                  value={routeQuery}
                  onChange={(e) => setRouteQuery(e.target.value)}
                  placeholder="搜索楼盘/楼栋/编号/负责人/日期"
                />
              </div>
              <div className="estate-groups">
                {Object.keys(pendingDevicesByEstate).length === 0 ? (
                  <p className="empty">
                    {routeQuery ? '没有匹配的设备。' : '今日到未来7天暂无待编排设备，所有设备已加入路线或已完成。'}
                  </p>
                ) : (
                  Object.entries(pendingDevicesByEstate).map(([estate, items]) => {
                    const expanded = expandedEstates[estate] !== false;
                    return (
                      <div key={estate} className="estate-group">
                        <div className="estate-group-header" onClick={() => toggleEstate(estate)}>
                          <Building2 size={16} />
                          <strong>{estate}</strong>
                          <span className="estate-count">{items.length} 台</span>
                          <ChevronDown size={16} className={'estate-chevron ' + (expanded ? 'expanded' : '')} />
                        </div>
                        {expanded && (
                          <div className="estate-devices">
                            {items.map((item) => {
                              const rs = getReminderStatus(item, reminderSettings);
                              const dateDiff = daysBetween(item.nextDate, today);
                              let dateLabel = '';
                              if (dateDiff === 0) dateLabel = '今日维保';
                              else if (dateDiff === 1) dateLabel = '明日维保';
                              else dateLabel = `+${dateDiff}天维保`;
                              return (
                                <div
                                  key={item.id}
                                  className={'estate-device ' + reminderStatusClass(rs.type) + (item.status === '已完成' ? ' completed' : '')}
                                >
                                  <div className="estate-device-info">
                                    <div className="estate-device-head">
                                      <h4>{item.building}</h4>
                                      <span className={'status ' + statusClass(item.status)}>{item.status}</span>
                                    </div>
                                    <p>{item.elevatorNo} · {item.cycle} · {item.owner}</p>
                                    <div className="device-date-row">
                                      <span className={'device-date-tag ' + (dateDiff === 0 ? 'date-today' : dateDiff === 1 ? 'date-tomorrow' : 'date-later')}>
                                        <Calendar size={12} />
                                        {item.nextDate} · {dateLabel}
                                      </span>
                                    </div>
                                    {rs.type !== 'none' && (
                                      <div className={'reminder-tag ' + reminderStatusClass(rs.type)}>
                                        {rs.type === 'overdue' && <AlertTriangle size={12} />}
                                        {rs.type === 'today' && <Zap size={12} />}
                                        {rs.type === 'soon' && <Bell size={12} />}
                                        {rs.label}
                                      </div>
                                    )}
                                  </div>
                                  <div className="estate-device-actions">
                                    {currentRoutePlan.routes.length === 0 ? (
                                      <button
                                        className="primary small-btn"
                                        onClick={() => createRoute(estate)}
                                      >
                                        <Plus size={14} />
                                        创建路线
                                      </button>
                                    ) : (
                                      <select
                                        className="add-to-route-select"
                                        defaultValue=""
                                        onChange={(e) => {
                                          if (e.target.value) {
                                            addDeviceToRoute(item.id, e.target.value);
                                            e.target.value = '';
                                          }
                                        }}
                                      >
                                        <option value="">加入路线...</option>
                                        {currentRoutePlan.routes.map((r) => (
                                          <option key={r.id} value={r.id}>{r.estate}（{r.deviceIds.length}台）</option>
                                        ))}
                                      </select>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="panel route-list-panel">
              <div className="panel-title-with-actions">
                <div className="panel-title">
                  <Route size={18} />
                  <h2>路线清单</h2>
                  {currentRoutePlan.updatedAt && (
                    <span className="route-updated">最后更新：{new Date(currentRoutePlan.updatedAt).toLocaleString('zh-CN')}</span>
                  )}
                </div>
                <button className="secondary-btn small-btn" onClick={() => createRoute('')}>
                  <Plus size={14} />
                  新增路线
                </button>
              </div>

              {currentRoutePlan.routes.length === 0 ? (
                <div className="empty-routes">
                  <Route size={48} />
                  <p>暂无路线，点击"新增路线"或从左侧设备创建路线</p>
                </div>
              ) : (
                <div className="routes-list">
                  {currentRoutePlan.routes.map((route, routeIdx) => (
                    <div key={route.id} className="route-card">
                      <div className="route-card-header">
                        <div className="route-card-title">
                          <span className="route-index">{routeIdx + 1}</span>
                          <input
                            className="route-name-input"
                            value={route.estate}
                            onChange={(e) => renameRoute(route.id, e.target.value)}
                          />
                        </div>
                        <div className="route-card-actions">
                          <span className="route-count">{route.deviceIds.length} 台</span>
                          <button
                            className="ghost-danger small-icon-btn"
                            onClick={() => {
                              if (confirm(`确定删除路线"${route.estate}"吗？路线中的设备将移出。`)) {
                                removeRoute(route.id);
                              }
                            }}
                            title="删除路线"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {route.deviceIds.length === 0 ? (
                        <p className="empty-route-devices">路线为空，从左侧设备列表添加</p>
                      ) : (
                        <div className="route-devices">
                          {route.deviceIds.map((deviceId, idx) => {
                            const item = getRecordById(deviceId);
                            if (!item) return null;
                            const rs = getReminderStatus(item, reminderSettings);
                            const isCompleted = item.status === '已完成';
                            const dateDiff = daysBetween(item.nextDate, today);
                            let dateLabel = '';
                            if (dateDiff === 0) dateLabel = '今日维保';
                            else if (dateDiff === 1) dateLabel = '明日维保';
                            else if (dateDiff > 1) dateLabel = `+${dateDiff}天维保`;
                            else dateLabel = `逾期${Math.abs(dateDiff)}天`;
                            return (
                              <div
                                key={deviceId}
                                className={'route-device ' + reminderStatusClass(rs.type) + (isCompleted ? ' completed' : '')}
                              >
                                <div className="route-device-order">
                                  <GripVertical size={16} />
                                  <span>{idx + 1}</span>
                                </div>
                                <div className="route-device-info">
                                  <div className="route-device-head">
                                    <h4>{item.estate} {item.building}</h4>
                                    {isCompleted ? (
                                      <span className="status status-c route-completed">
                                        <CheckCircle2 size={12} />
                                        已完成
                                      </span>
                                    ) : (
                                      <span className={'status ' + statusClass(item.status)}>{item.status}</span>
                                    )}
                                  </div>
                                  <p>{item.elevatorNo} · {item.cycle} · {item.owner}</p>
                                  <div className="device-date-row">
                                    <span className={'device-date-tag ' + (dateDiff === 0 ? 'date-today' : dateDiff === 1 ? 'date-tomorrow' : dateDiff > 1 ? 'date-later' : 'date-overdue')}>
                                      <Calendar size={12} />
                                      {item.nextDate} · {dateLabel}
                                    </span>
                                  </div>
                                  {rs.type !== 'none' && !isCompleted && (
                                    <div className={'reminder-tag ' + reminderStatusClass(rs.type)}>
                                      {rs.type === 'overdue' && <AlertTriangle size={12} />}
                                      {rs.type === 'today' && <Zap size={12} />}
                                      {rs.type === 'soon' && <Bell size={12} />}
                                      {rs.label}
                                    </div>
                                  )}
                                </div>
                                <div className="route-device-actions">
                                  <button
                                    className="small-icon-btn"
                                    onClick={() => moveDeviceInRoute(deviceId, route.id, 'up')}
                                    disabled={idx === 0}
                                    title="上移"
                                  >
                                    <ArrowUp size={14} />
                                  </button>
                                  <button
                                    className="small-icon-btn"
                                    onClick={() => moveDeviceInRoute(deviceId, route.id, 'down')}
                                    disabled={idx === route.deviceIds.length - 1}
                                    title="下移"
                                  >
                                    <ArrowDown size={14} />
                                  </button>
                                  <button
                                    className="ghost-danger small-icon-btn"
                                    onClick={() => removeDeviceFromRoute(deviceId, route.id)}
                                    title="移出路线"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>
      ) : workbenchView ? (
        <section className="workbench">          <section className="panel owners-panel">
            <div className="panel-title">
              <Users size={18} />
              <h2>负责人汇总</h2>
            </div>
            <div className="owner-cards">
              {groupedByOwner.map((group) => (
                <article
                  key={group.owner}
                  className={'owner-card ' + (selectedOwner === group.owner ? 'selected' : '')}
                  onClick={() => setSelectedOwner(selectedOwner === group.owner ? null : group.owner)}
                >
                  <div className="owner-card-head">
                    <div className="owner-avatar">
                      <User size={20} />
                    </div>
                    <div className="owner-info">
                      <h3>{group.owner}</h3>
                      <p>共 {group.total} 台设备</p>
                    </div>
                  </div>
                  <div className="owner-stats">
                    <div className="stat-item status-a">
                      <span className="stat-num">{group.pending}</span>
                      <span className="stat-label">待维保</span>
                    </div>
                    <div className="stat-item status-b">
                      <span className="stat-num">{group.today}</span>
                      <span className="stat-label">今日执行</span>
                    </div>
                    <div className="stat-item overdue">
                      <span className="stat-num">{group.overdue}</span>
                      <span className="stat-label">逾期</span>
                    </div>
                    <div className="stat-item status-c">
                      <span className="stat-num">{group.completed}</span>
                      <span className="stat-label">已完成</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="panel owner-detail-panel">
            <div className="panel-title">
              <CheckCircle2 size={18} />
              <h2>{selectedOwner ? `${selectedOwner} 的维保记录` : '记录详情'}</h2>
            </div>
            {selectedOwner ? (
              selectedOwnerRecords.length ? (
                <div className="owner-records">
                  {selectedOwnerRecords.map((item) => {
                    const rs = getReminderStatus(item, reminderSettings);
                    return (
                    <div key={item.id} className={'owner-record-item ' + reminderStatusClass(rs.type)}>
                      <div className="owner-record-head">
                        <div>
                          <h4>{`${item.estate} ${item.building}`}</h4>
                          <p>{`${item.elevatorNo} · ${item.cycle}`}</p>
                        </div>
                        <span className={'status ' + statusClass(item.status)}>{item.status}</span>
                      </div>
                      <p className="record-detail">{`下次维保：${item.nextDate}`}</p>
                      {rs.type !== 'none' && (
                        <div className={'reminder-tag ' + reminderStatusClass(rs.type)}>
                          {rs.type === 'overdue' && <AlertTriangle size={14} />}
                          {rs.type === 'today' && <Zap size={14} />}
                          {rs.type === 'soon' && <Bell size={14} />}
                          {rs.label}
                        </div>
                      )}
                      {rs.type === 'none' && item.nextDate < today && item.status !== '已完成' && (
                        <div className="warning"><AlertTriangle size={14} />已逾期</div>
                      )}
                      <div className="owner-record-actions">
                        {appConfig.statuses.map((status) => (
                          <button key={status} type="button" onClick={() => status === '已完成' ? openBackfillModal(item) : updateStatus(item.id, status)}>{status}</button>
                        ))}
                      </div>
                    </div>
                  );})}
                </div>
              ) : (
                <p className="empty">暂无维保记录。</p>
              )
            ) : (
              <p className="empty">点击左侧负责人卡片，查看对应维保记录并修改状态。</p>
            )}
          </aside>
        </section>
      ) : riskDashboardView ? (
        <section className="risk-dashboard">
          <div className="risk-dashboard-header">
            <h2 className="risk-dashboard-title">风险分级看板</h2>
            <div className="risk-dashboard-actions">
              <button className="secondary-btn small-btn" onClick={() => openSettings('risk')}>
                <Settings size={14} />
                风险规则设置
              </button>
            </div>
          </div>
          <div className="risk-summary-bar">
            {riskRules.overdueEnabled && (
              <div className="risk-summary-item risk-critical">
                <AlertOctagon size={20} />
                <div className="risk-summary-text">
                  <span className="risk-summary-num">{records.filter((item) => item.nextDate && item.nextDate < today && item.status !== '已完成').length}</span>
                  <span className="risk-summary-label">{riskRules.overdueLabel}</span>
                </div>
              </div>
            )}
            <div className="risk-summary-item risk-warning">
              <Clock size={20} />
              <div className="risk-summary-text">
                <span className="risk-summary-num">{records.filter((item) => item.nextDate === today && item.status !== '已完成').length}</span>
                <span className="risk-summary-label">今日到期</span>
              </div>
            </div>
            {riskRules.soonExpireEnabled && riskRules.soonExpireDays > 0 && (
              <div className="risk-summary-item risk-soon">
                <Bell size={20} />
                <div className="risk-summary-text">
                  <span className="risk-summary-num">{records.filter((item) => { if (!item.nextDate || item.status === '已完成') return false; const d = daysBetween(item.nextDate, today); return d > 0 && d <= riskRules.soonExpireDays; }).length}</span>
                  <span className="risk-summary-label">{riskRules.soonExpireDays}天内{riskRules.soonExpireLabel}</span>
                </div>
              </div>
            )}
            {riskRules.overloadEnabled && riskRules.overloadThreshold > 0 && (
              <div className="risk-summary-item risk-overload">
                <UserX size={20} />
                <div className="risk-summary-text">
                  <span className="risk-summary-num">{(() => { const m = {}; records.forEach((r) => { if (r.status === '已完成') return; const o = r.owner || '未分配'; m[o] = (m[o] || 0) + 1; }); return Object.values(m).filter((c) => c >= riskRules.overloadThreshold).length; })()}</span>
                  <span className="risk-summary-label">负责人{riskRules.overloadLabel}</span>
                </div>
              </div>
            )}
            {riskRules.estateConcentrationEnabled && riskRules.estateConcentrationWindow > 0 && riskRules.estateConcentrationThreshold > 0 && (
              <div className="risk-summary-item risk-estate">
                <Building size={20} />
                <div className="risk-summary-text">
                  <span className="risk-summary-num">{(() => { const m = {}; records.forEach((r) => { if (!r.nextDate || r.status === '已完成') return; const d = daysBetween(r.nextDate, today); if (d >= 0 && d <= riskRules.estateConcentrationWindow) { m[r.estate] = (m[r.estate] || 0) + 1; } }); return Object.values(m).filter((c) => c >= riskRules.estateConcentrationThreshold).length; })()}</span>
                  <span className="risk-summary-label">楼盘{riskRules.estateConcentrationLabel}</span>
                </div>
              </div>
            )}
          </div>

          <div className="risk-list">
            {riskItems.length === 0 ? (
              <div className="risk-empty">
                <ShieldAlert size={48} />
                <h3>暂无风险项</h3>
                <p>当前所有电梯维保状态正常，未检测到逾期、过载或集中到期风险。</p>
              </div>
            ) : (
              riskItems.map((risk) => {
                const RiskIcon = risk.icon;
                const isExpanded = risk.expanded;
                return (
                  <div key={risk.key} className={'risk-card risk-type-' + risk.type}>
                    <div className="risk-card-header" onClick={() => toggleRiskExpand(risk.key)}>
                      <div className="risk-card-title">
                        <span className={'risk-icon risk-icon-' + risk.type}><RiskIcon size={18} /></span>
                        <div>
                          <h3>{risk.label}</h3>
                          <p>{risk.summary}</p>
                          {risk.triggeredRule && (
                            <div className="risk-triggered-rule">
                              <span className="rule-badge">触发规则</span>
                              <span className="rule-desc">{risk.triggeredRule.description}</span>
                              {risk.triggeredRule.threshold !== null && (
                                <span className="rule-threshold">阈值：{risk.triggeredRule.threshold}，实际：{risk.triggeredRule.actual}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="risk-card-meta">
                        <span className="risk-count">{risk.items.length} 条记录</span>
                        <ChevronDown size={18} className={'risk-chevron ' + (isExpanded ? 'expanded' : '')} />
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="risk-card-body">
                        {risk.items.map((item) => {
                          const rs = getReminderStatus(item, reminderSettings);
                          const dateDiff = item.nextDate ? daysBetween(item.nextDate, today) : null;
                          let dateLabel = '';
                          if (dateDiff !== null) {
                            if (dateDiff < 0) dateLabel = `逾期${Math.abs(dateDiff)}天`;
                            else if (dateDiff === 0) dateLabel = '今日到期';
                            else dateLabel = `${dateDiff}天后到期`;
                          }
                          return (
                            <div
                              key={item.id}
                              className={'risk-record-item ' + reminderStatusClass(rs.type)}
                              onClick={() => setSelected(item)}
                            >
                              <div className="risk-record-head">
                                <div>
                                  <h4>{item.estate} {item.building}</h4>
                                  <p>{item.elevatorNo} · {item.cycle} · {item.owner}</p>
                                </div>
                                <span className={'status ' + statusClass(item.status)}>{item.status}</span>
                              </div>
                              <div className="risk-record-meta">
                                <span className="risk-record-date">下次维保：{item.nextDate}</span>
                                {dateLabel && <span className={'risk-date-tag risk-date-' + (dateDiff < 0 ? 'overdue' : dateDiff === 0 ? 'today' : 'soon')}>{dateLabel}</span>}
                              </div>
                              {rs.type !== 'none' && (
                                <div className={'reminder-tag ' + reminderStatusClass(rs.type)}>
                                  {rs.type === 'overdue' && <AlertTriangle size={12} />}
                                  {rs.type === 'today' && <Zap size={12} />}
                                  {rs.type === 'soon' && <Bell size={12} />}
                                  {rs.label}
                                </div>
                              )}
                              <div className="risk-record-actions">
                                {appConfig.statuses.map((status) => (
                                  <button key={status} type="button" onClick={(e) => { e.stopPropagation(); status === '已完成' ? openBackfillModal(item) : updateStatus(item.id, status); }}>{status}</button>
                                ))}
                                <button type="button" className="risk-detail-btn" onClick={(e) => { e.stopPropagation(); setSelected(item); setRiskDashboardView(false); }}>查看详情</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      ) : autoPlanView ? (
        <section className="auto-plan-view">
          <div className="panel auto-plan-controls">
            <div className="panel-title-with-actions">
              <div className="panel-title">
                <Zap size={18} />
                <h2>智能计划生成器</h2>
              </div>
              <div className="auto-plan-actions">
                <button className="secondary-btn small-btn" onClick={openAutoPlanConfigModal}>
                  <Settings size={14} />
                  生成配置
                </button>
                {autoPlanDraft && (
                  <>
                    <button className="secondary-btn small-btn" onClick={() => generateAutoPlan()}>
                      <RefreshCw size={14} />
                      重新生成
                    </button>
                    <button className="secondary-btn small-btn danger-btn" onClick={discardPlanDraft}>
                      <Trash2 size={14} />
                      放弃草稿
                    </button>
                    <button className="primary small-btn confirm-plan-btn" onClick={confirmAutoPlan}>
                      <CheckCircle2 size={14} />
                      确认并提交计划
                    </button>
                  </>
                )}
                {!autoPlanDraft && (
                  <button className="primary small-btn" onClick={() => generateAutoPlan()}>
                    <Zap size={14} />
                    生成计划
                  </button>
                )}
              </div>
            </div>
            <div className="auto-plan-config-summary">
              <div className="config-tag">
                <CalendarDays size={14} />
                计划天数：{autoPlanConfig.planDays} 天
              </div>
              <div className="config-tag">
                <User size={14} />
                每人每日上限：{autoPlanConfig.defaultDailyLimit} 台
              </div>
              <div className="config-tag">
                <Building size={14} />
                楼盘集中：{autoPlanConfig.estateConcentration ? '开启' : '关闭'}
              </div>
              <div className="config-tag">
                <AlertTriangle size={14} />
                逾期优先：{autoPlanConfig.priorityOverdue ? '开启' : '关闭'}
              </div>
            </div>
          </div>

          {!autoPlanDraft ? (
            <div className="panel auto-plan-empty">
              <div className="auto-plan-empty-inner">
                <Zap size={56} />
                <h3>尚未生成计划</h3>
                <p>点击「生成计划」按钮，系统将根据以下规则智能生成维保计划：</p>
                <ul className="auto-plan-rules">
                  <li><AlertOctagon size={16} /> 优先安排<strong>逾期</strong>和<strong>临近到期</strong>的设备</li>
                  <li><Building size={16} /> <strong>同一楼盘</strong>的设备尽量集中在同一天，减少路途消耗</li>
                  <li><UserX size={16} /> 每位负责人<strong>每日任务不超过</strong>配置的上限</li>
                  <li><CheckCircle2 size={16} /> 自动<strong>排除已完成</strong>的维保记录</li>
                  <li><ClipboardList size={16} /> 生成结果为<strong>可编辑草稿</strong>，确认后才写入记录</li>
                  <li><RotateCcw size={16} /> 所有操作保留<strong>历史记录</strong>，支持一键回滚</li>
                </ul>
              </div>
            </div>
          ) : (
            <>
              {autoPlanSummary && (
                <section className="auto-plan-metrics">
                  <article className="metric auto-metric">
                    <div className="metric-icon-wrap overdue-icon"><AlertOctagon size={20} /></div>
                    <div>
                      <span>逾期设备</span>
                      <strong>{autoPlanSummary.totalOverdue}</strong>
                    </div>
                  </article>
                  <article className="metric auto-metric">
                    <div className="metric-icon-wrap today-icon"><Clock size={20} /></div>
                    <div>
                      <span>今日到期</span>
                      <strong>{autoPlanSummary.totalToday}</strong>
                    </div>
                  </article>
                  <article className="metric auto-metric">
                    <div className="metric-icon-wrap soon-icon"><Bell size={20} /></div>
                    <div>
                      <span>即将到期</span>
                      <strong>{autoPlanSummary.totalSoon}</strong>
                    </div>
                  </article>
                  <article className="metric auto-metric">
                    <div className="metric-icon-wrap days-icon"><CalendarDays size={20} /></div>
                    <div>
                      <span>覆盖天数</span>
                      <strong>{autoPlanSummary.daysWithPlan}</strong>
                    </div>
                  </article>
                  <article className="metric auto-metric">
                    <div className="metric-icon-wrap total-icon"><ClipboardList size={20} /></div>
                    <div>
                      <span>总计划数</span>
                      <strong>{autoPlanDraft.totalCount}</strong>
                    </div>
                  </article>
                </section>
              )}

              <div className="auto-plan-layout">
                <section className="panel auto-plan-dates-panel">
                  <div className="panel-title-with-actions">
                    <div className="panel-title">
                      <Calendar size={18} />
                      <h2>计划日历（{autoPlanDraft.config.planDays}天）</h2>
                    </div>
                  </div>
                  <div className="auto-plan-dates-list">
                    {(autoPlanDraft.dateList || []).map((date, idx) => {
                      const items = autoPlanDraft.dates[date] || [];
                      const d = new Date(date);
                      const isToday = date === today;
                      const weekday = weekdayLabels[(d.getDay() + 6) % 7];
                      const isExpanded = expandedPlanDates[date] !== false;
                      const overdueCount = items.filter((it) => it.daysDiff < 0).length;
                      const ownerCounts = {};
                      items.forEach((it) => {
                        ownerCounts[it.owner] = (ownerCounts[it.owner] || 0) + 1;
                      });
                      return (
                        <div key={date} className={'auto-plan-date-card ' + (isToday ? 'is-today' : '') + (items.length > 0 ? ' has-items' : '')}>
                          <div className="auto-plan-date-header" onClick={() => togglePlanDateExpand(date)}>
                            <div className="auto-plan-date-info">
                              <div className="auto-plan-date-weekday">{weekday}</div>
                              <div className="auto-plan-date-main">
                                <strong>{d.getMonth() + 1}月{d.getDate()}日</strong>
                                {isToday && <span className="today-badge">今日</span>}
                              </div>
                            </div>
                            <div className="auto-plan-date-counts">
                              <span className="count-badge total">{items.length} 台</span>
                              {overdueCount > 0 && <span className="count-badge overdue">逾期 {overdueCount}</span>}
                            </div>
                            <ChevronDown size={18} className={'chevron-icon ' + (isExpanded ? 'expanded' : '')} />
                          </div>
                          {isExpanded && items.length > 0 && (
                            <div className="auto-plan-items">
                              <div className="auto-plan-owner-counts">
                                {Object.entries(ownerCounts).map(([owner, count]) => (
                                  <span key={owner} className="owner-count-tag">
                                    <User size={12} />
                                    {owner}: {count}台
                                    {count > getOwnerDailyLimit(owner, autoPlanDraft.config) && (
                                      <AlertTriangle size={12} className="warn-icon" title="超出每日上限" />
                                    )}
                                  </span>
                                ))}
                              </div>
                              {items.map((item) => {
                                const isOverdue = item.daysDiff < 0;
                                const isTodayDue = item.daysDiff === 0;
                                const rs = { type: 'none', label: '' };
                                if (isOverdue) rs.type = 'overdue';
                                else if (isTodayDue) rs.type = 'today';
                                else {
                                  const advanceDays = reminderSettings[item.cycle] || 0;
                                  if (item.daysDiff <= advanceDays) rs.type = 'soon';
                                }
                                let diffLabel = '';
                                if (isOverdue) diffLabel = `逾期${Math.abs(item.daysDiff)}天`;
                                else if (isTodayDue) diffLabel = '今日到期';
                                else diffLabel = `+${item.daysDiff}天`;
                                return (
                                  <div key={item.planId} className={'auto-plan-item ' + reminderStatusClass(rs.type)}>
                                    <div className="auto-plan-item-main">
                                      <div className="auto-plan-item-head">
                                        <h4>{item.estate} {item.building}</h4>
                                        <div className="auto-plan-item-tags">
                                          {isOverdue && <span className="diff-tag overdue">{diffLabel}</span>}
                                          {isTodayDue && <span className="diff-tag today">{diffLabel}</span>}
                                          {!isOverdue && !isTodayDue && item.daysDiff > 0 && <span className="diff-tag soon">{diffLabel}</span>}
                                          {item.originalNextDate !== item.plannedDate && (
                                            <span className="diff-tag moved" title={`原计划：${item.originalNextDate}`}>
                                              <RotateCcw size={10} />
                                              调整日期
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <p>{item.elevatorNo} · {item.cycle} · <User size={12} /> {item.owner}</p>
                                      <p className="auto-plan-item-original">原定日期：{item.originalNextDate} → 计划：{item.plannedDate}</p>
                                    </div>
                                    <div className="auto-plan-item-actions">
                                      <button className="small-icon-btn" onClick={() => openPlanItemEdit(item)} title="调整计划">
                                        <Settings size={14} />
                                      </button>
                                      <button className="small-icon-btn ghost-danger" onClick={() => removePlanItem(item.planId)} title="从计划移除">
                                        <X size={14} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {isExpanded && items.length === 0 && (
                            <div className="auto-plan-empty-day">
                              <p>当日暂无计划安排</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="panel auto-plan-side-panel">
                  <div className="auto-plan-side-section">
                    <div className="panel-title">
                      <Users size={16} />
                      <h3>负责人负荷</h3>
                    </div>
                    {autoPlanSummary && autoPlanSummary.topOwners.length > 0 ? (
                      <div className="owner-load-list">
                        {autoPlanSummary.topOwners.map(([owner, count]) => {
                          const limit = getOwnerDailyLimit(owner, autoPlanDraft.config);
                          const avgPerDay = (count / autoPlanSummary.daysWithPlan).toFixed(1);
                          return (
                            <div key={owner} className="owner-load-item">
                              <div className="owner-load-head">
                                <span className="owner-load-name"><User size={14} /> {owner}</span>
                                <span className="owner-load-count">{count} 台</span>
                              </div>
                              <div className="owner-load-bar-wrap">
                                <div
                                  className="owner-load-bar"
                                  style={{
                                    width: `${Math.min(100, (count / (autoPlanConfig.planDays * limit)) * 100 * 3)}%`
                                  }}
                                />
                              </div>
                              <div className="owner-load-meta">
                                <span>日均 {avgPerDay} 台</span>
                                <span>上限 {limit} 台/天</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="empty">暂无负责人数据</p>
                    )}
                  </div>

                  <div className="auto-plan-side-section">
                    <div className="panel-title">
                      <Building size={16} />
                      <h3>楼盘分布 TOP5</h3>
                    </div>
                    {autoPlanSummary && autoPlanSummary.topEstates.length > 0 ? (
                      <div className="estate-load-list">
                        {autoPlanSummary.topEstates.map(([estate, count]) => (
                          <div key={estate} className="estate-load-item">
                            <div className="estate-load-head">
                              <span className="estate-load-name"><Building2 size={14} /> {estate}</span>
                              <span className="estate-load-count">{count} 台</span>
                            </div>
                            <div className="estate-load-bar-wrap">
                              <div
                                className="estate-load-bar"
                                style={{
                                  width: `${Math.min(100, (count / autoPlanDraft.totalCount) * 100 * 2)}%`
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="empty">暂无楼盘数据</p>
                    )}
                  </div>

                  {autoPlanDraft.unassignedItems && autoPlanDraft.unassignedItems.length > 0 && (
                    <div className="auto-plan-side-section">
                      <div className="panel-title">
                        <AlertTriangle size={16} />
                        <h3>未能安排（{autoPlanDraft.unassignedItems.length}台）</h3>
                      </div>
                      <div className="unassigned-list">
                        {autoPlanDraft.unassignedItems.map((item, idx) => (
                          <div key={idx} className="unassigned-item">
                            <div>
                              <strong>{item.estate} {item.building}</strong>
                              <p>{item.elevatorNo} · {item.owner}</p>
                            </div>
                            <span className={'diff-tag ' + (item.daysDiff < 0 ? 'overdue' : 'soon')}>
                              {item.daysDiff < 0 ? `逾期${Math.abs(item.daysDiff)}天` : `+${item.daysDiff}天`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="auto-plan-side-section">
                    <div className="panel-title">
                      <RotateCcw size={16} />
                      <h3>操作历史</h3>
                    </div>
                    {autoPlanHistory.length > 0 ? (
                      <div className="plan-history-list">
                        {autoPlanHistory.slice(0, 10).map((entry) => (
                          <div key={entry.id} className={'plan-history-item history-' + entry.type}>
                            <div className="plan-history-head">
                              <span className={'history-type-badge type-' + entry.type}>
                                {entry.type === 'confirm' && <CheckCircle2 size={12} />}
                                {entry.type === 'rollback' && <RotateCcw size={12} />}
                                {entry.type === 'confirm' ? '确认计划' : '回滚操作'}
                              </span>
                              <span className="history-time">
                                {new Date(entry.timestamp).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="history-desc">{entry.description}</p>
                            {entry.type === 'confirm' && entry.snapshot && (
                              <button className="rollback-btn" onClick={() => rollbackHistoryEntry(entry.id)}>
                                <RotateCcw size={12} />
                                回滚此操作
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="empty">暂无操作历史</p>
                    )}
                  </div>
                </section>
              </div>
            </>
          )}
        </section>
      ) : (
        <>
        <section className="workspace">
        <form className="panel form-panel" onSubmit={addRecord}>
          <div className="panel-title">
            <ClipboardList size={18} />
            <h2>新增记录</h2>
          </div>
          <div className="form-grid">
            {appConfig.fields.map((field) => {
              if (field.key === 'estate') {
                return (
                  <label key={field.key} className="autocomplete-wrapper">
                    <span>{field.label}</span>
                    <input
                      type="text"
                      value={estateInputValue}
                      onChange={(e) => {
                        setEstateInputValue(e.target.value);
                        setForm({ ...form, estate: e.target.value });
                        setShowEstateSuggestions(true);
                      }}
                      onFocus={() => setShowEstateSuggestions(true)}
                      onClick={(e) => { e.stopPropagation(); setShowEstateSuggestions(true); }}
                      placeholder={field.placeholder}
                      autoComplete="off"
                    />
                    {showEstateSuggestions && filteredEstateSuggestions.length > 0 && (
                      <div className="autocomplete-dropdown">
                        {filteredEstateSuggestions.map((estate) => (
                          <div
                            key={estate}
                            className="autocomplete-item"
                            onClick={(e) => { e.stopPropagation(); handleEstateSelect(estate); }}
                          >
                            <Building size={14} className="autocomplete-item-icon" />
                            <span>{estate}</span>
                            {estateMetadata[estate] && (
                              <span className="autocomplete-item-meta">
                                {(() => {
                                  const meta = estateMetadata[estate];
                                  const recentOwner = Object.entries(meta.ownerLastUsed)
                                    .filter(([o]) => o)
                                    .sort((a, b) => b[1].localeCompare(a[1]))[0];
                                  const recentCycle = Object.entries(meta.cycleLastUsed)
                                    .filter(([c]) => c)
                                    .sort((a, b) => b[1].localeCompare(a[1]))[0];
                                  return (
                                    <>
                                      最近负责人：{recentOwner ? `${recentOwner[0]}（${formatRelativeDate(recentOwner[1])}）` : '—'}
                                      <span style={{ margin: '0 6px' }}>·</span>
                                      周期：{recentCycle ? recentCycle[0] : '—'}
                                    </>
                                  );
                                })()}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </label>
                );
              }
              if (field.key === 'owner') {
                return (
                  <label key={field.key} className="autocomplete-wrapper">
                    <span>{field.label}</span>
                    <input
                      type="text"
                      value={ownerInputValue}
                      onChange={(e) => {
                        setOwnerInputValue(e.target.value);
                        setForm({ ...form, owner: e.target.value });
                        setShowOwnerSuggestions(true);
                      }}
                      onFocus={() => setShowOwnerSuggestions(true)}
                      onClick={(e) => { e.stopPropagation(); setShowOwnerSuggestions(true); }}
                      placeholder={field.placeholder}
                      autoComplete="off"
                    />
                    {showOwnerSuggestions && filteredOwnerSuggestions.length > 0 && (
                      <div className="autocomplete-dropdown">
                        {filteredOwnerSuggestions.map((owner) => {
                          const isEstateOwner = form.estate && estateMetadata[form.estate]?.ownerLastUsed?.[owner];
                          return (
                            <div
                              key={owner}
                              className={'autocomplete-item ' + (isEstateOwner ? 'is-estate-owner' : '')}
                              onClick={(e) => { e.stopPropagation(); handleOwnerSelect(owner); }}
                            >
                              <User size={14} className="autocomplete-item-icon" />
                              <span>{owner}</span>
                              {isEstateOwner && (
                                <span className="autocomplete-item-tag">最近</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </label>
                );
              }
              return (
                <label key={field.key} className={field.type === 'textarea' ? 'wide' : ''}>
                  <span>{field.label}</span>
                  {field.type === 'textarea' ? (
                    <textarea value={form[field.key] || ''} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} placeholder={field.placeholder} />
                  ) : field.type === 'select' ? (
                    <select value={form[field.key] || ''} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}>
                      {field.options.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  ) : (
                    <input type={field.type} value={form[field.key] || ''} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} placeholder={field.placeholder} />
                  )}
                </label>
              );
            })}
            <label>
              <span>当前状态</span>
              <select value={form.status || appConfig.primaryStatus} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                {appConfig.statuses.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
          </div>
          <button className="primary" type="submit"><Plus size={18} />新增</button>
          <button type="button" className="secondary-btn import-btn" onClick={() => setShowImportModal(true)}>
            <Upload size={16} />
            批量导入
          </button>
          <p className="hint">{appConfig.note}</p>
        </form>

        <section className="panel list-panel">
          <div className="toolbar">
            <div className="search">
              <Search size={16} />
              <input value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder={appConfig.filters[0]?.label || '搜索'} />
            </div>
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option>全部</option>
              {appConfig.statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </div>

          <div className="records">
            {filteredRecords.map((item) => {
              const rs = getReminderStatus(item, reminderSettings);
              return (
              <article className={'record ' + (item.conflict || hasOverlap(item, records) ? 'conflict ' : '') + reminderStatusClass(rs.type)} key={item.id} onClick={() => setSelected(item)}>
                <div className="record-head">
                  <div>
                    <h3>{`${item.estate} ${item.building}`}</h3>
                    <p>{`${item.elevatorNo} · ${item.cycle} · ${item.owner}`}</p>
                  </div>
                  <span className={'status ' + statusClass(item.status)}>{item.status}</span>
                </div>
                <p className="record-detail">{`下次维保：${item.nextDate}`}</p>
                {rs.type !== 'none' && (
                  <div className={'reminder-tag ' + reminderStatusClass(rs.type)}>
                    {rs.type === 'overdue' && <AlertTriangle size={14} />}
                    {rs.type === 'today' && <Zap size={14} />}
                    {rs.type === 'soon' && <Bell size={14} />}
                    {rs.label}
                  </div>
                )}
                {(item.conflict || hasOverlap(item, records)) && <div className="warning"><AlertTriangle size={15} />发现冲突</div>}
                <div className="actions" onClick={(event) => event.stopPropagation()}>
                  {appConfig.statuses.map((status) => (
                    <button key={status} type="button" onClick={() => status === '已完成' ? openBackfillModal(item) : updateStatus(item.id, status)}>{status}</button>
                  ))}
                  {appConfig.action === 'copyRecipe' && <button type="button" onClick={() => duplicateRecord(item)}><RotateCcw size={14} />复制</button>}
                  {appConfig.chart && <button type="button" onClick={() => addTemperature(item)}>加温度</button>}
                  <button className="ghost-danger" type="button" onClick={() => removeRecord(item.id)}><Trash2 size={14} /></button>
                </div>
              </article>
            );})}
          </div>
        </section>
      </section>

      <section className="insights">
        <div className="panel">
          <div className="panel-title-with-actions">
            <div className="panel-title">
              <CalendarDays size={18} />
              <h2>{viewMode === 'calendar' ? '路线日历' : (appConfig.directory ? '证据目录预览' : appConfig.board ? '床位看板' : '分组视图')}</h2>
            </div>
            <div className="view-toggle">
              <button className={'toggle-btn ' + (viewMode === 'group' ? 'active' : '')} onClick={() => setViewMode('group')} title="分组视图">
                <LayoutGrid size={15} />
              </button>
              <button className={'toggle-btn ' + (viewMode === 'calendar' ? 'active' : '')} onClick={() => { setViewMode('calendar'); setSelectedDate(null); }} title="路线日历">
                <Calendar size={15} />
              </button>
            </div>
          </div>

          {viewMode === 'calendar' ? (
            <div className="calendar-view">
              <div className="calendar-header">
                <button className="week-nav" onClick={() => setWeekOffset(weekOffset - 1)}><ChevronLeft size={16} /></button>
                <span className="week-label">{getWeekLabel(weekOffset)}</span>
                <button className="week-nav" onClick={() => setWeekOffset(weekOffset + 1)}><ChevronRight size={16} /></button>
                <button className="week-today" onClick={() => setWeekOffset(0)}>本周</button>
              </div>
              <div className="calendar-filters">
                <div className="calendar-filter-item">
                  <User size={14} />
                  <select
                    value={calendarFilters.owner}
                    onChange={(e) => setCalendarFilters({ ...calendarFilters, owner: e.target.value })}
                  >
                    <option value="全部">全部负责人</option>
                    {uniqueOwners.map((owner) => (
                      <option key={owner} value={owner}>{owner}</option>
                    ))}
                  </select>
                </div>
                <div className="calendar-filter-item">
                  <Zap size={14} />
                  <select
                    value={calendarFilters.cycle}
                    onChange={(e) => setCalendarFilters({ ...calendarFilters, cycle: e.target.value })}
                  >
                    <option value="全部">全部周期</option>
                    {uniqueCycles.map((cycle) => (
                      <option key={cycle} value={cycle}>{cycle}</option>
                    ))}
                  </select>
                </div>
                {(calendarFilters.owner !== '全部' || calendarFilters.cycle !== '全部') && (
                  <button
                    className="calendar-filter-reset"
                    onClick={() => setCalendarFilters({ owner: '全部', cycle: '全部' })}
                  >
                    <X size={12} />
                    重置筛选
                  </button>
                )}
              </div>
              <div className="calendar-grid">
                {weekDates.map((date, idx) => {
                  const items = calendarByDate[date] || [];
                  const isTodayCell = date === today;
                  const isSelected = date === selectedDate;
                  const overdueCount = items.filter((it) => it.nextDate < today && it.status !== '已完成').length;
                  return (
                    <div
                      key={date}
                      className={'calendar-cell ' + (isTodayCell ? 'today ' : '') + (isSelected ? 'selected ' : '') + (items.length ? 'has-items' : '')}
                      onClick={() => setSelectedDate(isSelected ? null : date)}
                    >
                      <div className="cell-head">
                        <span className="weekday">{weekdayLabels[idx]}</span>
                        <span className="daynum">{new Date(date).getDate()}</span>
                      </div>
                      <div className="cell-items">
                        {items.slice(0, 3).map((item) => {
                          const rs = getReminderStatus(item, reminderSettings);
                          return (
                          <div key={item.id} className={'cell-item ' + statusClass(item.status) + ' ' + reminderStatusClass(rs.type)} title={`${item.estate} ${item.building} · ${item.elevatorNo} · ${item.owner} · ${item.status}${rs.label ? ' · ' + rs.label : ''}`}>
                            <span className="cell-item-estate">{item.estate}</span>
                            <span className="cell-item-no">{item.elevatorNo}</span>
                          </div>
                        );})}
                        {items.length > 3 && <div className="cell-more">+{items.length - 3}</div>}
                      </div>
                      {overdueCount > 0 && <div className="cell-overdue">逾期 {overdueCount}</div>}
                      {(() => {
                        const soonCount = items.filter((it) => getReminderStatus(it, reminderSettings).type === 'soon').length;
                        return soonCount > 0 && overdueCount === 0 ? <div className="cell-soon">即将到期 {soonCount}</div> : null;
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : appConfig.directory ? (
            <div className="directory">
              {Object.entries(directory).map(([issue, items]) => (
                <div key={issue} className="directory-group">
                  <strong>{issue}</strong>
                  {items.map((item, index) => <span key={item.id}>{index + 1}. {item.evidence}｜{item.purpose}</span>)}
                </div>
              ))}
            </div>
          ) : (
            <div className="date-groups">
              {Object.entries(groupedByDate).map(([date, items]) => (
                <div key={date} className="date-group">
                  <strong>{date}</strong>
                  <span>{items.length}条记录</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="panel detail-panel">
          <div className="panel-title">
            <CheckCircle2 size={18} />
            <h2>{selectedDate ? `${selectedDate} 待处理设备` : (selected ? '详情' : '详情')}</h2>
          </div>
          {selectedDate ? (
            selectedDateRecords.length ? (
              <div className="date-detail-list">
                {selectedDateRecords.map((item) => {
                  const rs = getReminderStatus(item, reminderSettings);
                  return (
                  <div key={item.id} className={'date-detail-item ' + reminderStatusClass(rs.type)} onClick={() => setSelected(item)}>
                    <div className="date-detail-head">
                      <h3>{`${item.estate} ${item.building}`}</h3>
                      <span className={'status ' + statusClass(item.status)}>{item.status}</span>
                    </div>
                    <p>{`${item.elevatorNo} · ${item.cycle} · ${item.owner}`}</p>
                    {rs.type !== 'none' && (
                      <div className={'reminder-tag ' + reminderStatusClass(rs.type)}>
                        {rs.type === 'overdue' && <AlertTriangle size={14} />}
                        {rs.type === 'today' && <Zap size={14} />}
                        {rs.type === 'soon' && <Bell size={14} />}
                        {rs.label}
                      </div>
                    )}
                  </div>
                );})}
              </div>
            ) : (
              <p className="empty">{selectedDate} 暂无待处理设备。</p>
            )
          ) : selected ? (
            <div className="detail">
              {editing ? (
                <>
                  <div className="panel-title" style={{marginBottom: '12px'}}>
                    <h2 style={{fontSize: '16px'}}>编辑设备信息</h2>
                  </div>
                  <form ref={editFormRef} className="form-grid" style={{gridTemplateColumns: '1fr'}}>
                    {appConfig.fields.map((field) => (
                      <label key={field.key}>
                        <span>{field.label}</span>
                        {field.type === 'select' ? (
                          <select
                            name={field.key}
                            value={editForm[field.key] || ''}
                            onChange={(event) => setEditForm({ ...editForm, [field.key]: event.target.value })}
                          >
                            {field.options.map((option) => <option key={option}>{option}</option>)}
                          </select>
                        ) : (
                          <input
                            name={field.key}
                            type={field.type}
                            value={editForm[field.key] || ''}
                            onChange={(event) => setEditForm({ ...editForm, [field.key]: event.target.value })}
                            placeholder={field.placeholder}
                          />
                        )}
                      </label>
                    ))}
                    <label>
                      <span>当前状态</span>
                      <select
                        name="status"
                        value={editForm.status || ''}
                        onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}
                      >
                        {appConfig.statuses.map((status) => <option key={status}>{status}</option>)}
                      </select>
                    </label>
                  </form>
                  <div className="modal-actions" style={{justifyContent: 'flex-start', marginTop: '16px'}}>
                    <button type="button" className="primary" style={{width: 'auto', marginTop: 0, padding: '10px 20px'}} onClick={saveEdit}>保存</button>
                    <button type="button" className="secondary-btn" onClick={cancelEdit}>取消</button>
                  </div>
                  <p className="hint">修改「下次维保日期」可以快速验证逾期、今日到期、即将到期三类状态的显示效果。</p>
                </>
              ) : (
                <>
                  <div className="detail-actions">
                    <button className="edit-btn" type="button" onClick={() => startEdit(selected)}>
                      <Settings size={14} />
                      编辑
                    </button>
                  </div>
                  <h3>{`${selected.estate} ${selected.building}`}</h3>
                  <p>{`${selected.elevatorNo} · ${selected.cycle} · ${selected.owner}`}</p>
                  <p>{`下次维保：${selected.nextDate}`}</p>
                  {(() => {
                    const rs = getReminderStatus(selected, reminderSettings);
                    if (rs.type === 'none') return null;
                    return (
                      <div className={'reminder-tag ' + reminderStatusClass(rs.type)}>
                        {rs.type === 'overdue' && <AlertTriangle size={14} />}
                        {rs.type === 'today' && <Zap size={14} />}
                        {rs.type === 'soon' && <Bell size={14} />}
                        {rs.label}
                      </div>
                    );
                  })()}
                  <p className="reminder-explain">
                    {(() => {
                      const rs = getReminderStatus(selected, reminderSettings);
                      const advanceDays = reminderSettings[selected.cycle] || 0;
                      if (selected.status === '已完成') return '当前状态：已完成维保';
                      if (rs.daysLeft === null) return '';
                      if (rs.type === 'overdue') return `已逾期 ${Math.abs(rs.daysLeft)} 天，请尽快安排维保`;
                      if (rs.type === 'today') return `今天是维保日期，请按计划执行`;
                      if (rs.type === 'soon') return `距离维保还有 ${rs.daysLeft} 天（${selected.cycle}周期配置提前${advanceDays}天提醒）`;
                      return `距离维保还有 ${rs.daysLeft} 天，当前周期配置提前 ${advanceDays} 天提醒`;
                    })()}
                  </p>
                  {selected.temps && (
                    <div className="temp-chart">
                      {selected.temps.map((value, index) => <i key={index} style={{ height: Math.max(10, 56 + Number(value) * 8) }} title={String(value)} />)}
                    </div>
                  )}
                  <div className="timeline">
                    {(selected.timeline || []).map((step, index) => (
                      <div key={index} className={'timeline-entry ' + (step.backfill ? 'timeline-backfill' : '')}>
                        <div className="timeline-main">
                          <span className="timeline-status">{step.status}</span>
                          <span className="timeline-at">{step.at}</span>
                          <span className="timeline-by">{step.by}</span>
                        </div>
                        {step.backfill && (
                          <div className="timeline-backfill-detail">
                            {step.backfill.executor && <span className="backfill-field"><strong>执行人：</strong>{step.backfill.executor}</span>}
                            {step.backfill.notes && <span className="backfill-field"><strong>现场备注：</strong>{step.backfill.notes}</span>}
                            {step.backfill.nextDate && <span className="backfill-field"><strong>下次维保：</strong>{step.backfill.nextDate}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="empty">点击任意记录查看详情和状态流转，或切换到日历视图点击某日查看当天待处理设备。</p>
          )}
        </aside>
      </section>
        </>
      )}
    </main>
  );
}

export default App;
