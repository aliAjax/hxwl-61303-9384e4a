import { useMemo, useRef, useState } from 'react';
import { Building2, Plus, Search, Trash2, RotateCcw, CheckCircle2, AlertTriangle, ClipboardList, CalendarDays, ChevronLeft, ChevronRight, LayoutGrid, Calendar, Users, User, Settings, X, Bell, Zap, Upload, FileText, XCircle, Route, MapPin, ArrowUp, ArrowDown, GripVertical, Save, ChevronDown, ShieldAlert, AlertOctagon, Clock, UserX, Building, Download, HardDrive, Database, RefreshCw, FileJson } from 'lucide-react';
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

const ROUTE_PLANS_STORAGE_KEY = 'hxwl-61303-route-plans';
const DATA_EXPORT_VERSION = '1.0.0';
const DATA_EXPORT_APP_ID = 'hxwl-61303-elevator-maintenance';

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

function loadRecords() {
  const raw = localStorage.getItem(appConfig.storage);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return withIds(appConfig.seed);
    }
  }
  return withIds(appConfig.seed);
}

function buildExportData(records, reminderSettings, routePlans) {
  return {
    appId: DATA_EXPORT_APP_ID,
    version: DATA_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      records,
      reminderSettings,
      routePlans
    }
  };
}

function validateImportData(parsed) {
  const errors = [];
  const warnings = [];

  if (!parsed || typeof parsed !== 'object') {
    errors.push('文件格式错误：不是有效的JSON对象');
    return { valid: false, errors, warnings, summary: null };
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
    return { valid: false, errors, warnings, summary: null };
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

  if (errors.length > 0) {
    return { valid: false, errors, warnings, summary: null };
  }

  const summary = computeDataSummary(data.records);
  return { valid: true, errors, warnings, summary, data };
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
  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState(loadReminderSettings);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const editFormRef = useRef(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [parsedImport, setParsedImport] = useState(null);
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

  function parseImportText(text) {
    const lines = text.trim().split('\n').filter(line => line.trim());
    const records = [];
    lines.forEach((line, lineIndex) => {
      const trimmed = line.trim();
      let parts;
      if (trimmed.includes('\t')) {
        parts = trimmed.split('\t');
      } else if (trimmed.includes('，')) {
        parts = trimmed.split('，');
      } else if (trimmed.includes(',')) {
        parts = trimmed.split(',');
      } else {
        parts = trimmed.split(/\s+/);
      }
      parts = parts.map(p => p.trim());
      const [estate, building, elevatorNo, cycle, nextDate, owner] = parts;
      records.push({
        lineIndex,
        rawLine: trimmed,
        estate: estate || '',
        building: building || '',
        elevatorNo: elevatorNo || '',
        cycle: cycle || '',
        nextDate: nextDate || '',
        owner: owner || '',
        errors: []
      });
    });
    return records;
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
    const parsed = parseImportText(importText);
    const validated = validateImportRecords(parsed);
    setParsedImport(validated);
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
  }

  function persist(next) {
    setRecords(next);
    localStorage.setItem(appConfig.storage, JSON.stringify(next));
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
    setForm(appConfig.defaultValues);
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

  function openSettings() {
    setTempSettings({ ...reminderSettings });
    setShowSettings(true);
  }

  function handleSaveSettings() {
    const sanitized = {};
    Object.keys(tempSettings).forEach((key) => {
      const val = parseInt(tempSettings[key], 10);
      sanitized[key] = Number.isFinite(val) && val >= 0 ? val : DEFAULT_REMINDER_SETTINGS[key];
    });
    setReminderSettings(sanitized);
    saveReminderSettings(sanitized);
    setShowSettings(false);
  }

  function handleResetSettings() {
    setTempSettings({ ...DEFAULT_REMINDER_SETTINGS });
  }

  function handleExportData() {
    const exportData = buildExportData(records, reminderSettings, routePlans);
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
    const { records: newRecords, reminderSettings: newReminderSettings, routePlans: newRoutePlans } = importValidation.data;

    persist(newRecords);
    setReminderSettings(newReminderSettings);
    saveReminderSettings(newReminderSettings);
    setRoutePlans(newRoutePlans);
    saveRoutePlans(newRoutePlans);

    setSelected(null);
    alert('数据恢复成功！');
    closeDataManager();
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

  const metrics = [
    { label: "设备数", value: records.length },
    { label: "逾期", value: records.filter((item) => item.nextDate < today && item.status !== '已完成').length },
    { label: "今日", value: records.filter((item) => item.nextDate === today).length },
    { label: "即将到期", value: records.filter((item) => {
      const rs = getReminderStatus(item, reminderSettings);
      return rs.type === 'soon';
    }).length },
  ];

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
    filteredRecords.forEach((item) => {
      const d = item.nextDate;
      if (d && map[d]) map[d].push(item);
    });
    return map;
  }, [filteredRecords, weekDates]);

  const selectedDateRecords = useMemo(() => {
    if (!selectedDate) return [];
    return filteredRecords.filter((item) => item.nextDate === selectedDate && item.status !== '已完成');
  }, [filteredRecords, selectedDate]);

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

  const OVERLOAD_THRESHOLD = 5;
  const ESTATE_CONCENTRATION_THRESHOLD = 3;
  const ESTATE_CONCENTRATION_WINDOW = 7;

  const riskItems = useMemo(() => {
    const risks = [];

    const overdueItems = records.filter((item) => item.nextDate && item.nextDate < today && item.status !== '已完成');
    if (overdueItems.length > 0) {
      risks.push({
        key: 'overdue',
        type: 'critical',
        icon: AlertOctagon,
        label: '逾期未维保',
        summary: `${overdueItems.length} 台电梯已超过维保日期未完成`,
        items: overdueItems.sort((a, b) => a.nextDate.localeCompare(b.nextDate)),
        expanded: expandedRisks['overdue'] !== false
      });
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
        expanded: expandedRisks['today'] !== false
      });
    }

    const soonDueItems = records.filter((item) => {
      if (!item.nextDate || item.status === '已完成') return false;
      const diff = daysBetween(item.nextDate, today);
      return diff > 0 && diff <= 3;
    });
    if (soonDueItems.length > 0) {
      risks.push({
        key: 'soon3',
        type: 'info',
        icon: Bell,
        label: '3天内到期',
        summary: `${soonDueItems.length} 台电梯将在3天内到期`,
        items: soonDueItems.sort((a, b) => a.nextDate.localeCompare(b.nextDate)),
        expanded: expandedRisks['soon3'] !== false
      });
    }

    const ownerTaskMap = {};
    records.forEach((item) => {
      if (item.status === '已完成') return;
      const owner = item.owner || '未分配';
      if (!ownerTaskMap[owner]) ownerTaskMap[owner] = [];
      ownerTaskMap[owner].push(item);
    });
    Object.entries(ownerTaskMap).forEach(([owner, items]) => {
      if (items.length >= OVERLOAD_THRESHOLD) {
        const overdueCount = items.filter((it) => it.nextDate < today).length;
        risks.push({
          key: `overload_${owner}`,
          type: 'warning',
          icon: UserX,
          label: `${owner} 任务过载`,
          summary: `${owner} 待处理 ${items.length} 台（逾期 ${overdueCount} 台），超出负荷阈值（${OVERLOAD_THRESHOLD}）`,
          items: items.sort((a, b) => {
            if (a.nextDate < today && b.nextDate >= today) return -1;
            if (b.nextDate < today && a.nextDate >= today) return 1;
            return a.nextDate.localeCompare(b.nextDate);
          }),
          expanded: expandedRisks[`overload_${owner}`] !== false
        });
      }
    });

    const estateWindowMap = {};
    records.forEach((item) => {
      if (!item.nextDate || item.status === '已完成') return;
      const diff = daysBetween(item.nextDate, today);
      if (diff >= 0 && diff <= ESTATE_CONCENTRATION_WINDOW) {
        if (!estateWindowMap[item.estate]) estateWindowMap[item.estate] = [];
        estateWindowMap[item.estate].push(item);
      }
    });
    Object.entries(estateWindowMap).forEach(([estate, items]) => {
      if (items.length >= ESTATE_CONCENTRATION_THRESHOLD) {
        const owners = [...new Set(items.map((it) => it.owner || '未分配'))];
        risks.push({
          key: `estate_${estate}`,
          type: 'info',
          icon: Building,
          label: `${estate} 集中到期`,
          summary: `${estate} 有 ${items.length} 台电梯在 ${ESTATE_CONCENTRATION_WINDOW} 天内到期，涉及 ${owners.length} 位负责人`,
          items: items.sort((a, b) => a.nextDate.localeCompare(b.nextDate)),
          expanded: expandedRisks[`estate_${estate}`] !== false
        });
      }
    });

    const typeOrder = { critical: 0, warning: 1, info: 2 };
    risks.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
    return risks;
  }, [records, reminderSettings, expandedRisks]);

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
          <h1>{routePlanningView ? '维保路线编排' : (workbenchView ? '负责人工作台' : (riskDashboardView ? '风险分级看板' : appConfig.title))}</h1>
          <p>{routePlanningView ? '按楼盘聚合待维保设备，灵活编排每日维保路线并保存方案' : (workbenchView ? '按负责人汇总电梯维保任务，快速掌握执行进度' : (riskDashboardView ? '汇总逾期、到期、过载与集中到期风险，点击展开查看相关记录' : appConfig.subtitle))}</p>
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
          <button className={'view-switch ' + (!routePlanningView && !workbenchView && !riskDashboardView ? 'active' : '')} onClick={() => { setRoutePlanningView(false); setWorkbenchView(false); setRiskDashboardView(false); setSelectedOwner(null); }}>
            <LayoutGrid size={16} />
            路线看板
          </button>
          <button className={'view-switch ' + (workbenchView ? 'active' : '')} onClick={() => { setRoutePlanningView(false); setWorkbenchView(true); setRiskDashboardView(false); setSelectedDate(null); }}>
            <Users size={16} />
            负责人工作台
          </button>
          <button className={'view-switch ' + (routePlanningView ? 'active' : '')} onClick={() => { setRoutePlanningView(true); setWorkbenchView(false); setRiskDashboardView(false); }}>
            <Route size={16} />
            路线编排
          </button>
          <button className={'view-switch ' + (riskDashboardView ? 'active' : '')} onClick={() => { setRiskDashboardView(true); setWorkbenchView(false); setRoutePlanningView(false); }}>
            <ShieldAlert size={16} />
            风险看板
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

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="panel-title">
                <Bell size={18} />
                <h2>维保提醒设置</h2>
              </div>
              <button className="modal-close" onClick={() => setShowSettings(false)}>
                <X size={18} />
              </button>
            </div>
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
                onClick={() => { setDataManagerTab('export'); resetImportState(); }}
              >
                <Download size={16} />
                数据导出
              </button>
              <button
                className={'dm-tab ' + (dataManagerTab === 'import' ? 'active' : '')}
                onClick={() => setDataManagerTab('import')}
              >
                <RefreshCw size={16} />
                数据恢复
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
                <div className="modal-actions">
                  <button type="button" className="secondary-btn" onClick={closeDataManager}>取消</button>
                  <button type="button" className="primary" onClick={handleExportData}>
                    <Download size={16} />
                    导出JSON文件
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
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="modal-overlay" onClick={() => { setShowImportModal(false); setParsedImport(null); }}>
          <div className="modal-panel import-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="panel-title">
                <Upload size={18} />
                <h2>批量导入预检</h2>
              </div>
              <button className="modal-close" onClick={() => { setShowImportModal(false); setParsedImport(null); }}>
                <X size={18} />
              </button>
            </div>
            <p className="hint">
              粘贴多行电梯维保数据，支持制表符、逗号、空格分隔。字段顺序：楼盘、楼栋、电梯编号、维保周期、下次维保日期、负责人。
            </p>

            <label className="import-label">
              <span>数据内容</span>
              <textarea
                className="import-textarea"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="星河湾 3栋 E-032 15天 2026-06-13 赵师傅&#10;海棠府 1栋 E-118 15天 2026-06-12 钱师傅"
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

                <div className="import-preview-list">
                  {parsedImport.map((record, index) => (
                    <div key={index} className={'import-preview-item ' + (record.errors.length > 0 ? 'has-error' : 'is-valid')}>
                      <div className="import-preview-head">
                        <span className="import-line-no">第 {index + 1} 行</span>
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
              <button type="button" className="secondary-btn" onClick={() => { setShowImportModal(false); setParsedImport(null); }}>取消</button>
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
          <div className="risk-summary-bar">
            <div className="risk-summary-item risk-critical">
              <AlertOctagon size={20} />
              <div className="risk-summary-text">
                <span className="risk-summary-num">{records.filter((item) => item.nextDate && item.nextDate < today && item.status !== '已完成').length}</span>
                <span className="risk-summary-label">逾期</span>
              </div>
            </div>
            <div className="risk-summary-item risk-warning">
              <Clock size={20} />
              <div className="risk-summary-text">
                <span className="risk-summary-num">{records.filter((item) => item.nextDate === today && item.status !== '已完成').length}</span>
                <span className="risk-summary-label">今日到期</span>
              </div>
            </div>
            <div className="risk-summary-item risk-soon">
              <Bell size={20} />
              <div className="risk-summary-text">
                <span className="risk-summary-num">{records.filter((item) => { if (!item.nextDate || item.status === '已完成') return false; const d = daysBetween(item.nextDate, today); return d > 0 && d <= 3; }).length}</span>
                <span className="risk-summary-label">3天内到期</span>
              </div>
            </div>
            <div className="risk-summary-item risk-overload">
              <UserX size={20} />
              <div className="risk-summary-text">
                <span className="risk-summary-num">{(() => { const m = {}; records.forEach((r) => { if (r.status === '已完成') return; const o = r.owner || '未分配'; m[o] = (m[o] || 0) + 1; }); return Object.values(m).filter((c) => c >= OVERLOAD_THRESHOLD).length; })()}</span>
                <span className="risk-summary-label">负责人过载</span>
              </div>
            </div>
            <div className="risk-summary-item risk-estate">
              <Building size={20} />
              <div className="risk-summary-text">
                <span className="risk-summary-num">{(() => { const m = {}; records.forEach((r) => { if (!r.nextDate || r.status === '已完成') return; const d = daysBetween(r.nextDate, today); if (d >= 0 && d <= ESTATE_CONCENTRATION_WINDOW) { m[r.estate] = (m[r.estate] || 0) + 1; } }); return Object.values(m).filter((c) => c >= ESTATE_CONCENTRATION_THRESHOLD).length; })()}</span>
                <span className="risk-summary-label">楼盘集中到期</span>
              </div>
            </div>
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
      ) : (
        <>
        <section className="workspace">
        <form className="panel form-panel" onSubmit={addRecord}>
          <div className="panel-title">
            <ClipboardList size={18} />
            <h2>新增记录</h2>
          </div>
          <div className="form-grid">
            {appConfig.fields.map((field) => (
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
            ))}
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
