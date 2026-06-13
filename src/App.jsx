import { useMemo, useState } from 'react';
import { Building2, Plus, Search, Trash2, RotateCcw, CheckCircle2, AlertTriangle, ClipboardList, CalendarDays, ChevronLeft, ChevronRight, LayoutGrid, Calendar } from 'lucide-react';
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

const today = new Date().toISOString().slice(0, 10);

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
  const date = new Date(dateText);
  const now = new Date(today);
  const diff = (date.getTime() - now.getTime()) / 86400000;
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
    return filteredRecords.filter((item) => item.nextDate === selectedDate);
  }, [filteredRecords, selectedDate]);

  return (
    <main className="shell" style={{ '--accent': appConfig.accent }}>
      <section className="hero">
        <div>
          <div className="eyebrow"><Building2 size={18} />{appConfig.domain}</div>
          <h1>{appConfig.title}</h1>
          <p>{appConfig.subtitle}</p>
        </div>
        <div className="port-card">
          <span>Local Port</span>
          <strong>{appConfig.port}</strong>
        </div>
      </section>

      <section className="metrics">
        {metrics.map((metric) => (
          <article className="metric" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </section>

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
            {filteredRecords.map((item) => (
              <article className={'record ' + (item.conflict || hasOverlap(item, records) ? 'conflict' : '')} key={item.id} onClick={() => setSelected(item)}>
                <div className="record-head">
                  <div>
                    <h3>{`${item.estate} ${item.building}`}</h3>
                    <p>{`${item.elevatorNo} · ${item.cycle} · ${item.owner}`}</p>
                  </div>
                  <span className={'status ' + statusClass(item.status)}>{item.status}</span>
                </div>
                <p className="record-detail">{`下次维保：${item.nextDate}`}</p>
                {(item.conflict || hasOverlap(item, records)) && <div className="warning"><AlertTriangle size={15} />发现冲突</div>}
                <div className="actions" onClick={(event) => event.stopPropagation()}>
                  {appConfig.statuses.map((status) => (
                    <button key={status} type="button" onClick={() => updateStatus(item.id, status)}>{status}</button>
                  ))}
                  {appConfig.action === 'copyRecipe' && <button type="button" onClick={() => duplicateRecord(item)}><RotateCcw size={14} />复制</button>}
                  {appConfig.chart && <button type="button" onClick={() => addTemperature(item)}>加温度</button>}
                  <button className="ghost-danger" type="button" onClick={() => removeRecord(item.id)}><Trash2 size={14} /></button>
                </div>
              </article>
            ))}
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
                        {items.slice(0, 3).map((item) => (
                          <div key={item.id} className={'cell-item ' + statusClass(item.status)} title={`${item.estate} ${item.building} · ${item.elevatorNo} · ${item.owner} · ${item.status}`}>
                            <span className="cell-item-estate">{item.estate}</span>
                            <span className="cell-item-no">{item.elevatorNo}</span>
                          </div>
                        ))}
                        {items.length > 3 && <div className="cell-more">+{items.length - 3}</div>}
                      </div>
                      {overdueCount > 0 && <div className="cell-overdue">逾期 {overdueCount}</div>}
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
                {selectedDateRecords.map((item) => (
                  <div key={item.id} className="date-detail-item" onClick={() => setSelected(item)}>
                    <div className="date-detail-head">
                      <h3>{`${item.estate} ${item.building}`}</h3>
                      <span className={'status ' + statusClass(item.status)}>{item.status}</span>
                    </div>
                    <p>{`${item.elevatorNo} · ${item.cycle} · ${item.owner}`}</p>
                    {item.nextDate < today && item.status !== '已完成' && (
                      <div className="warning"><AlertTriangle size={14} />已逾期</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty">{selectedDate} 暂无待处理设备。</p>
            )
          ) : selected ? (
            <div className="detail">
              <h3>{`${selected.estate} ${selected.building}`}</h3>
              <p>{`${selected.elevatorNo} · ${selected.cycle} · ${selected.owner}`}</p>
              <p>{`下次维保：${selected.nextDate}`}</p>
              {selected.temps && (
                <div className="temp-chart">
                  {selected.temps.map((value, index) => <i key={index} style={{ height: Math.max(10, 56 + Number(value) * 8) }} title={String(value)} />)}
                </div>
              )}
              <div className="timeline">
                {(selected.timeline || []).map((step, index) => (
                  <span key={index}>{step.at} · {step.status} · {step.by}</span>
                ))}
              </div>
            </div>
          ) : (
            <p className="empty">点击任意记录查看详情和状态流转，或切换到日历视图点击某日查看当天待处理设备。</p>
          )}
        </aside>
      </section>
    </main>
  );
}

export default App;
