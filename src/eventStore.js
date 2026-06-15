const EVENT_STORE_VERSION = '2.0.0';
const EVENT_STORE_STORAGE_KEY = 'hxwl-61303-event-store';
const EVENT_SNAPSHOT_INTERVAL = 50;

const EVENT_TYPES = {
  RECORD_CREATE: 'RECORD_CREATE',
  RECORD_UPDATE: 'RECORD_UPDATE',
  RECORD_DELETE: 'RECORD_DELETE',
  RECORD_DUPLICATE: 'RECORD_DUPLICATE',
  STATUS_TRANSITION: 'STATUS_TRANSITION',
  BACKFILL_COMPLETE: 'BACKFILL_COMPLETE',
  BACKFILL_WITH_NEXT_CYCLE: 'BACKFILL_WITH_NEXT_CYCLE',
  ROUTE_PLAN_CREATE: 'ROUTE_PLAN_CREATE',
  ROUTE_CREATE: 'ROUTE_CREATE',
  ROUTE_RENAME: 'ROUTE_RENAME',
  ROUTE_DELETE: 'ROUTE_DELETE',
  ROUTE_ADD_DEVICE: 'ROUTE_ADD_DEVICE',
  ROUTE_REMOVE_DEVICE: 'ROUTE_REMOVE_DEVICE',
  ROUTE_REORDER_DEVICE: 'ROUTE_REORDER_DEVICE',
  ROUTE_PLAN_SAVE: 'ROUTE_PLAN_SAVE',
  AUTO_PLAN_GENERATE: 'AUTO_PLAN_GENERATE',
  AUTO_PLAN_ITEM_MOVE: 'AUTO_PLAN_ITEM_MOVE',
  AUTO_PLAN_ITEM_REMOVE: 'AUTO_PLAN_ITEM_REMOVE',
  AUTO_PLAN_CONFIRM: 'AUTO_PLAN_CONFIRM',
  AUTO_PLAN_ROLLBACK: 'AUTO_PLAN_ROLLBACK',
  MERGE_EXECUTE: 'MERGE_EXECUTE',
  MERGE_ROLLBACK: 'MERGE_ROLLBACK',
  DATA_RESTORE: 'DATA_RESTORE',
  SETTINGS_UPDATE: 'SETTINGS_UPDATE',
  BULK_IMPORT: 'BULK_IMPORT'
};

const AGGREGATE_TYPES = {
  RECORD: 'RECORD',
  ROUTE_PLAN: 'ROUTE_PLAN',
  AUTO_PLAN: 'AUTO_PLAN',
  MERGE: 'MERGE',
  SETTINGS: 'SETTINGS',
  SYSTEM: 'SYSTEM'
};

function eventUid() {
  return 'evt_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

function deviceUid() {
  let id = localStorage.getItem('hxwl-61303-device-id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2, 14);
    localStorage.setItem('hxwl-61303-device-id', id);
  }
  return id;
}

function getDeviceInfo() {
  const id = deviceUid();
  let name = localStorage.getItem('hxwl-61303-device-name');
  if (!name) {
    name = '设备-' + id.slice(-4);
  }
  return { id, name };
}

function setDeviceName(name) {
  localStorage.setItem('hxwl-61303-device-name', name);
}

function createEvent({ type, aggregateType, aggregateId, payload, actor = '操作员', causalId = null }) {
  return {
    id: eventUid(),
    type,
    aggregateType,
    aggregateId,
    timestamp: new Date().toISOString(),
    deviceId: getDeviceInfo().id,
    actor,
    causalId: causalId || null,
    payload: payload || {}
  };
}

function emptyEventStoreState() {
  return {
    version: EVENT_STORE_VERSION,
    appId: 'hxwl-61303-elevator-maintenance',
    deviceId: getDeviceInfo().id,
    events: [],
    snapshots: [],
    lastEventId: null,
    eventCount: 0
  };
}

function loadEventStore() {
  try {
    const raw = localStorage.getItem(EVENT_STORE_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.events)) {
          return {
            ...emptyEventStoreState(),
            ...parsed,
            events: parsed.events || [],
            snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
            eventCount: (parsed.events || []).length,
            lastEventId: (parsed.events && parsed.events.length > 0)
              ? parsed.events[parsed.events.length - 1].id
              : null
          };
        }
      } catch (e) {
        console.warn('[EventStore] 存储数据损坏，正在重新初始化', e);
      }
    }
  } catch (e) {
    console.warn('[EventStore] localStorage 不可用，使用内存存储', e);
  }
  return emptyEventStoreState();
}

function saveEventStore(state) {
  try {
    const toSave = {
      version: state.version,
      appId: state.appId,
      deviceId: state.deviceId,
      events: state.events,
      snapshots: state.snapshots,
      lastEventId: state.lastEventId,
      eventCount: state.eventCount
    };
    localStorage.setItem(EVENT_STORE_STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn('[EventStore] 保存失败（可能存储空间不足）:', e);
    if (state.snapshots && state.snapshots.length > 1) {
      try {
        state.snapshots = state.snapshots.slice(-2);
        const toSave = {
          version: state.version,
          appId: state.appId,
          deviceId: state.deviceId,
          events: state.events,
          snapshots: state.snapshots,
          lastEventId: state.lastEventId,
          eventCount: state.eventCount
        };
        localStorage.setItem(EVENT_STORE_STORAGE_KEY, JSON.stringify(toSave));
        console.info('[EventStore] 已裁剪快照后重新保存');
      } catch (e2) {
        console.error('[EventStore] 裁剪后仍无法保存:', e2);
      }
    }
  }
}

function createSnapshot(state, currentState) {
  const snapshotEvent = state.events.length > 0 ? state.events[state.events.length - 1] : null;
  return {
    id: 'snap_' + Date.now().toString(36),
    createdAt: new Date().toISOString(),
    atEventIndex: state.events.length,
    atEventId: snapshotEvent ? snapshotEvent.id : null,
    state: JSON.parse(JSON.stringify(currentState))
  };
}

function applyRecordCreate(state, event) {
  const record = event.payload.record;
  if (!record || !record.id) return state;
  const exists = state.records.some(r => r.id === record.id);
  if (exists) return state;
  return {
    ...state,
    records: [record, ...state.records]
  };
}

function applyRecordUpdate(state, event) {
  const { recordId, changes } = event.payload;
  if (!recordId || !changes) return state;
  return {
    ...state,
    records: state.records.map(r => {
      if (r.id !== recordId) return r;
      const updated = { ...r, ...changes };
      if (changes.updatedAt === undefined) {
        updated.updatedAt = event.timestamp;
      }
      return updated;
    })
  };
}

function applyRecordDelete(state, event) {
  const { recordId } = event.payload;
  if (!recordId) return state;
  return {
    ...state,
    records: state.records.filter(r => r.id !== recordId)
  };
}

function applyStatusTransition(state, event) {
  const { recordId, status, timelineEntry } = event.payload;
  if (!recordId) return state;
  return {
    ...state,
    records: state.records.map(r => {
      if (r.id !== recordId) return r;
      return {
        ...r,
        status,
        timeline: [...(r.timeline || []), timelineEntry],
        updatedAt: event.timestamp
      };
    })
  };
}

function applyBackfill(state, event) {
  const { recordId, finalStatus, finalNextDate, timelineEntries } = event.payload;
  if (!recordId) return state;
  return {
    ...state,
    records: state.records.map(r => {
      if (r.id !== recordId) return r;
      return {
        ...r,
        status: finalStatus,
        nextDate: finalNextDate,
        timeline: [...(r.timeline || []), ...timelineEntries],
        updatedAt: event.timestamp
      };
    })
  };
}

function applyRoutePlanChanges(state, event) {
  const { date } = event.payload;
  if (!date) return state;

  const currentPlan = state.routePlans[date] || { date, routes: [], updatedAt: null };
  let nextRoutes = [...currentPlan.routes];

  switch (event.type) {
    case EVENT_TYPES.ROUTE_CREATE:
    case EVENT_TYPES.ROUTE_PLAN_CREATE: {
      if (event.payload.routePlansPatch && event.payload.routePlansPatch.routesToAdd) {
        const existingIds = new Set(nextRoutes.map(r => r.id));
        event.payload.routePlansPatch.routesToAdd.forEach(r => {
          if (!existingIds.has(r.id)) {
            nextRoutes.push({ ...r });
            existingIds.add(r.id);
          }
        });
      }
      break;
    }

    case EVENT_TYPES.ROUTE_RENAME: {
      const { routeId, newName } = event.payload;
      if (routeId && newName) {
        nextRoutes = nextRoutes.map(r =>
          r.id === routeId ? { ...r, estate: newName } : r
        );
      }
      break;
    }

    case EVENT_TYPES.ROUTE_DELETE: {
      const { routeId } = event.payload;
      if (routeId) {
        nextRoutes = nextRoutes.filter(r => r.id !== routeId);
      } else if (event.payload.routePlansPatch && event.payload.routePlansPatch.routeIdsToRemove) {
        const removeSet = new Set(event.payload.routePlansPatch.routeIdsToRemove);
        nextRoutes = nextRoutes.filter(r => !removeSet.has(r.id));
      }
      break;
    }

    case EVENT_TYPES.ROUTE_ADD_DEVICE: {
      const { routeId, deviceId } = event.payload;
      if (routeId && deviceId) {
        nextRoutes = nextRoutes.map(r => {
          if (r.id !== routeId) return r;
          if (r.deviceIds.includes(deviceId)) return r;
          return { ...r, deviceIds: [...r.deviceIds, deviceId] };
        });
      }
      break;
    }

    case EVENT_TYPES.ROUTE_REMOVE_DEVICE: {
      const { routeId, deviceId } = event.payload;
      if (routeId && deviceId) {
        nextRoutes = nextRoutes.map(r => {
          if (r.id !== routeId) return r;
          return { ...r, deviceIds: r.deviceIds.filter(id => id !== deviceId) };
        });
      }
      break;
    }

    case EVENT_TYPES.ROUTE_REORDER_DEVICE: {
      const { routeId, fromIndex, toIndex } = event.payload;
      if (routeId && typeof fromIndex === 'number' && typeof toIndex === 'number') {
        nextRoutes = nextRoutes.map(r => {
          if (r.id !== routeId) return r;
          const ids = [...r.deviceIds];
          if (fromIndex < 0 || fromIndex >= ids.length || toIndex < 0 || toIndex >= ids.length) return r;
          [ids[fromIndex], ids[toIndex]] = [ids[toIndex], ids[fromIndex]];
          return { ...r, deviceIds: ids };
        });
      }
      break;
    }

    case EVENT_TYPES.ROUTE_PLAN_SAVE: {
      const { routePlansPatch } = event.payload;
      if (routePlansPatch) {
        if (routePlansPatch.replaceAll !== undefined) {
          nextRoutes = [...(routePlansPatch.replaceAll.routes || [])];
        } else {
          if (routePlansPatch.routesToAdd) {
            const existingIds = new Set(nextRoutes.map(r => r.id));
            routePlansPatch.routesToAdd.forEach(r => {
              if (!existingIds.has(r.id)) {
                nextRoutes.push({ ...r });
                existingIds.add(r.id);
              }
            });
          }
          if (routePlansPatch.routeIdsToRemove) {
            const removeSet = new Set(routePlansPatch.routeIdsToRemove);
            nextRoutes = nextRoutes.filter(r => !removeSet.has(r.id));
          }
        }
      }
      break;
    }

    default:
      break;
  }

  return {
    ...state,
    routePlans: {
      ...state.routePlans,
      [date]: {
        ...currentPlan,
        routes: nextRoutes,
        updatedAt: event.timestamp
      }
    }
  };
}

function applyAutoPlanConfirm(state, event) {
  const { recordUpdates, routePlans } = event.payload;
  if (!recordUpdates) return state;

  const recordMap = new Map(state.records.map(r => [r.id, { ...r }]));
  recordUpdates.forEach(update => {
    const record = recordMap.get(update.recordId);
    if (!record) return;
    Object.assign(record, update.changes || {});
    if (update.timelineEntries) {
      record.timeline = [...(record.timeline || []), ...update.timelineEntries];
    }
    record.updatedAt = event.timestamp;
    recordMap.set(update.recordId, record);
  });

  let nextRoutePlans = { ...state.routePlans };
  if (routePlans) {
    Object.entries(routePlans).forEach(([date, plan]) => {
      const existing = nextRoutePlans[date] || { date, routes: [], updatedAt: null };
      let nextRoutes = [...(existing.routes || [])];
      if (plan.routes) {
        plan.routes.forEach(newRoute => {
          const existingIdx = nextRoutes.findIndex(r => r.estate === newRoute.estate);
          if (existingIdx !== -1) {
            const existingRoute = nextRoutes[existingIdx];
            const mergedDeviceIds = [...existingRoute.deviceIds];
            newRoute.deviceIds.forEach(id => {
              if (!mergedDeviceIds.includes(id)) mergedDeviceIds.push(id);
            });
            nextRoutes[existingIdx] = { ...existingRoute, deviceIds: mergedDeviceIds };
          } else {
            nextRoutes.push({ ...newRoute });
          }
        });
      }
      nextRoutePlans[date] = { ...existing, routes: nextRoutes, updatedAt: event.timestamp };
    });
  }

  return {
    ...state,
    records: Array.from(recordMap.values()),
    routePlans: nextRoutePlans
  };
}

function applyMergeExecute(state, event) {
  const { snapshotAfter } = event.payload;
  const snap = snapshotAfter;
  if (!snap) return state;
  if (snap.records) {
    state = { ...state, records: JSON.parse(JSON.stringify(snap.records)) };
  }
  if (snap.routePlans) {
    state = { ...state, routePlans: JSON.parse(JSON.stringify(snap.routePlans)) };
  }
  if (snap.reminderSettings) {
    state = { ...state, reminderSettings: { ...state.reminderSettings, ...snap.reminderSettings } };
  }
  if (snap.riskRules) {
    state = { ...state, riskRules: { ...state.riskRules, ...snap.riskRules } };
  }
  if (snap.autoPlanConfig) {
    state = { ...state, autoPlanConfig: { ...state.autoPlanConfig, ...snap.autoPlanConfig } };
  }
  return state;
}

function applySettingsUpdate(state, event) {
  const { reminderSettings, riskRules, autoPlanConfig } = event.payload;
  const next = { ...state };
  if (reminderSettings) next.reminderSettings = { ...state.reminderSettings, ...reminderSettings };
  if (riskRules) next.riskRules = { ...state.riskRules, ...riskRules };
  if (autoPlanConfig) next.autoPlanConfig = { ...state.autoPlanConfig, ...autoPlanConfig };
  return next;
}

function applyBulkImport(state, event) {
  const { records } = event.payload;
  if (!Array.isArray(records)) return state;
  const existingKeys = new Set(state.records.map(r => r.businessKey || r.elevatorNo));
  const toAdd = records.filter(r => {
    const key = r.businessKey || r.elevatorNo;
    return !existingKeys.has(key);
  });
  return {
    ...state,
    records: [...toAdd, ...state.records]
  };
}

function replayEvents(events, baseState = null) {
  let state = baseState ? JSON.parse(JSON.stringify(baseState)) : {
    records: [],
    routePlans: {},
    reminderSettings: {},
    riskRules: {},
    autoPlanConfig: {}
  };

  for (const event of events) {
    try {
      switch (event.type) {
        case EVENT_TYPES.RECORD_CREATE:
        case EVENT_TYPES.RECORD_DUPLICATE:
          state = applyRecordCreate(state, event);
          break;
        case EVENT_TYPES.RECORD_UPDATE:
          state = applyRecordUpdate(state, event);
          break;
        case EVENT_TYPES.RECORD_DELETE:
          state = applyRecordDelete(state, event);
          break;
        case EVENT_TYPES.STATUS_TRANSITION:
          state = applyStatusTransition(state, event);
          break;
        case EVENT_TYPES.BACKFILL_COMPLETE:
        case EVENT_TYPES.BACKFILL_WITH_NEXT_CYCLE:
          state = applyBackfill(state, event);
          break;
        case EVENT_TYPES.ROUTE_PLAN_CREATE:
        case EVENT_TYPES.ROUTE_CREATE:
        case EVENT_TYPES.ROUTE_RENAME:
        case EVENT_TYPES.ROUTE_DELETE:
        case EVENT_TYPES.ROUTE_ADD_DEVICE:
        case EVENT_TYPES.ROUTE_REMOVE_DEVICE:
        case EVENT_TYPES.ROUTE_REORDER_DEVICE:
        case EVENT_TYPES.ROUTE_PLAN_SAVE:
          state = applyRoutePlanChanges(state, event);
          break;
        case EVENT_TYPES.AUTO_PLAN_CONFIRM:
          state = applyAutoPlanConfirm(state, event);
          break;
        case EVENT_TYPES.AUTO_PLAN_GENERATE:
        case EVENT_TYPES.AUTO_PLAN_ITEM_MOVE:
        case EVENT_TYPES.AUTO_PLAN_ITEM_REMOVE:
          break;
        case EVENT_TYPES.AUTO_PLAN_ROLLBACK:
        case EVENT_TYPES.MERGE_ROLLBACK:
          if (event.payload.snapshotState) {
            const snap = event.payload.snapshotState;
            state = {
              records: Array.isArray(snap.records) ? JSON.parse(JSON.stringify(snap.records)) : state.records,
              routePlans: snap.routePlans ? JSON.parse(JSON.stringify(snap.routePlans)) : state.routePlans,
              reminderSettings: snap.reminderSettings ? { ...state.reminderSettings, ...snap.reminderSettings } : state.reminderSettings,
              riskRules: snap.riskRules ? { ...state.riskRules, ...snap.riskRules } : state.riskRules,
              autoPlanConfig: snap.autoPlanConfig ? { ...state.autoPlanConfig, ...snap.autoPlanConfig } : state.autoPlanConfig
            };
          }
          break;
        case EVENT_TYPES.MERGE_EXECUTE:
          state = applyMergeExecute(state, event);
          break;
        case EVENT_TYPES.DATA_RESTORE:
          if (event.payload.snapshotState) {
            const snap = event.payload.snapshotState;
            state = {
              records: Array.isArray(snap.records) ? JSON.parse(JSON.stringify(snap.records)) : state.records,
              routePlans: snap.routePlans ? JSON.parse(JSON.stringify(snap.routePlans)) : state.routePlans,
              reminderSettings: snap.reminderSettings ? { ...state.reminderSettings, ...snap.reminderSettings } : state.reminderSettings,
              riskRules: snap.riskRules ? { ...state.riskRules, ...snap.riskRules } : state.riskRules,
              autoPlanConfig: snap.autoPlanConfig ? { ...state.autoPlanConfig, ...snap.autoPlanConfig } : state.autoPlanConfig
            };
          }
          break;
        case EVENT_TYPES.SETTINGS_UPDATE:
          state = applySettingsUpdate(state, event);
          break;
        case EVENT_TYPES.BULK_IMPORT:
          state = applyBulkImport(state, event);
          break;
        default:
          break;
      }
    } catch (err) {
      console.warn(`[EventStore] replay event ${event.id} (${event.type}) failed:`, err);
    }
  }

  return state;
}

function rebuildFromEventStore(store, appDefaults) {
  let baseState = {
    records: [],
    routePlans: {},
    reminderSettings: appDefaults?.reminderSettings || {},
    riskRules: appDefaults?.riskRules || {},
    autoPlanConfig: appDefaults?.autoPlanConfig || {}
  };

  let startIndex = 0;
  if (store.snapshots && store.snapshots.length > 0) {
    const latestSnapshot = store.snapshots[store.snapshots.length - 1];
    if (latestSnapshot.state && typeof latestSnapshot.atEventIndex === 'number') {
      baseState = latestSnapshot.state;
      startIndex = latestSnapshot.atEventIndex;
    }
  }

  const eventsToReplay = store.events.slice(startIndex);
  return replayEvents(eventsToReplay, baseState);
}

class EventStore {
  constructor(appDefaults = {}) {
    this.appDefaults = appDefaults;
    try {
      this.state = loadEventStore();
    } catch (e) {
      console.error('[EventStore] 初始化失败，使用空状态:', e);
      this.state = emptyEventStoreState();
    }
    this.listeners = new Set();
  }

  getEventCount() {
    return this.state.events.length;
  }

  getAllEvents() {
    return [...this.state.events];
  }

  getEventsByAggregate(aggregateType, aggregateId) {
    return this.state.events.filter(e =>
      e.aggregateType === aggregateType &&
      (!aggregateId || e.aggregateId === aggregateId)
    );
  }

  getEventsByType(type) {
    return this.state.events.filter(e => e.type === type);
  }

  getEventsByTypes(types) {
    const typeSet = new Set(types);
    return this.state.events.filter(e => typeSet.has(e.type));
  }

  getEventsForRecord(recordId) {
    return this.state.events.filter(e => {
      if (e.aggregateType === AGGREGATE_TYPES.RECORD && e.aggregateId === recordId) return true;
      if (e.payload && e.payload.recordId === recordId) return true;
      if (e.payload && e.payload.recordUpdates) {
        return e.payload.recordUpdates.some(u => u.recordId === recordId);
      }
      return false;
    });
  }

  getEventsAfter(eventId) {
    if (!eventId) return [...this.state.events];
    const idx = this.state.events.findIndex(e => e.id === eventId);
    return idx === -1 ? [...this.state.events] : this.state.events.slice(idx + 1);
  }

  rebuildState(fromSnapshot = true) {
    return rebuildFromEventStore(this.state, this.appDefaults);
  }

  appendEvent(event, currentState = null) {
    this.state.events.push(event);
    this.state.eventCount = this.state.events.length;
    this.state.lastEventId = event.id;

    if (this.state.eventCount % EVENT_SNAPSHOT_INTERVAL === 0 && currentState) {
      const snapshot = createSnapshot(this.state, currentState);
      this.state.snapshots.push(snapshot);
      if (this.state.snapshots.length > 5) {
        this.state.snapshots = this.state.snapshots.slice(-5);
      }
    }

    saveEventStore(this.state);
    this._notifyListeners(event);
    return event;
  }

  appendEvents(events, currentState = null) {
    const created = [];
    events.forEach(event => {
      this.state.events.push(event);
      created.push(event);
    });
    this.state.eventCount = this.state.events.length;
    this.state.lastEventId = this.state.events.length > 0
      ? this.state.events[this.state.events.length - 1].id
      : null;

    if (currentState && created.length > 0 &&
        Math.floor(this.state.eventCount / EVENT_SNAPSHOT_INTERVAL) >
        Math.floor((this.state.eventCount - created.length) / EVENT_SNAPSHOT_INTERVAL)) {
      const snapshot = createSnapshot(this.state, currentState);
      this.state.snapshots.push(snapshot);
      if (this.state.snapshots.length > 5) {
        this.state.snapshots = this.state.snapshots.slice(-5);
      }
    }

    saveEventStore(this.state);
    created.forEach(e => this._notifyListeners(e));
    return created;
  }

  importEvents(eventsToImport, mergeStrategy = 'append') {
    const existingIds = new Set(this.state.events.map(e => e.id));
    const newEvents = eventsToImport.filter(e => !existingIds.has(e.id));

    if (mergeStrategy === 'append') {
      newEvents.forEach(e => {
        this.state.events.push(e);
      });
    } else if (mergeStrategy === 'sort') {
      const combined = [...this.state.events, ...newEvents];
      combined.sort((a, b) => {
        const ta = new Date(a.timestamp).getTime();
        const tb = new Date(b.timestamp).getTime();
        if (ta !== tb) return ta - tb;
        return a.id.localeCompare(b.id);
      });
      this.state.events = combined;
    }

    this.state.eventCount = this.state.events.length;
    this.state.lastEventId = this.state.events.length > 0
      ? this.state.events[this.state.events.length - 1].id
      : null;

    saveEventStore(this.state);
    return { imported: newEvents.length, duplicates: eventsToImport.length - newEvents.length };
  }

  rebuildFromLegacyData(legacyData) {
    const events = [];
    const deviceId = this.state.deviceId;
    const now = new Date().toISOString();

    if (legacyData.reminderSettings) {
      events.push(createEvent({
        type: EVENT_TYPES.SETTINGS_UPDATE,
        aggregateType: AGGREGATE_TYPES.SETTINGS,
        aggregateId: 'reminder-settings',
        actor: '系统迁移',
        payload: { reminderSettings: legacyData.reminderSettings }
      }));
    }

    if (legacyData.riskRules) {
      events.push(createEvent({
        type: EVENT_TYPES.SETTINGS_UPDATE,
        aggregateType: AGGREGATE_TYPES.SETTINGS,
        aggregateId: 'risk-rules',
        actor: '系统迁移',
        payload: { riskRules: legacyData.riskRules }
      }));
    }

    const sortedRecords = [...(legacyData.records || [])].sort((a, b) => {
      const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ca - cb;
    });

    sortedRecords.forEach(record => {
      events.push(createEvent({
        type: EVENT_TYPES.RECORD_CREATE,
        aggregateType: AGGREGATE_TYPES.RECORD,
        aggregateId: record.id,
        actor: record.timeline && record.timeline.length > 0
          ? (record.timeline[0].by || '系统迁移')
          : '系统迁移',
        payload: { record: { ...record } }
      }));

      if (record.timeline && record.timeline.length > 1) {
        for (let i = 1; i < record.timeline.length; i++) {
          const tl = record.timeline[i];
          const evt = createEvent({
            type: EVENT_TYPES.STATUS_TRANSITION,
            aggregateType: AGGREGATE_TYPES.RECORD,
            aggregateId: record.id,
            actor: tl.by || '系统迁移',
            payload: {
              recordId: record.id,
              status: tl.status,
              timelineEntry: tl
            }
          });
          if (tl.at) {
            const atDate = new Date(tl.at + 'T00:00:00');
            if (!isNaN(atDate.getTime())) {
              evt.timestamp = atDate.toISOString();
            }
          }
          events.push(evt);
        }
      }
    });

    if (legacyData.routePlans && typeof legacyData.routePlans === 'object') {
      Object.entries(legacyData.routePlans).forEach(([date, plan]) => {
        if (!plan) return;
        events.push(createEvent({
          type: EVENT_TYPES.ROUTE_PLAN_SAVE,
          aggregateType: AGGREGATE_TYPES.ROUTE_PLAN,
          aggregateId: date,
          actor: '系统迁移',
          payload: {
            date,
            routePlansPatch: { replaceAll: { ...plan } }
          }
        }));
      });
    }

    this.state = emptyEventStoreState();
    this.state.deviceId = deviceId;
    this.appendEvents(events, null);
    return events.length;
  }

  exportForMerge(options = {}) {
    const { sinceEventId = null, includeSnapshots = false } = options;
    let events = this.state.events;
    if (sinceEventId) {
      const idx = this.state.events.findIndex(e => e.id === sinceEventId);
      events = idx === -1 ? this.state.events : this.state.events.slice(idx + 1);
    }
    return {
      version: EVENT_STORE_VERSION,
      appId: 'hxwl-61303-elevator-maintenance',
      sourceDeviceId: this.state.deviceId,
      sourceDeviceName: getDeviceInfo().name,
      exportedAt: new Date().toISOString(),
      baseEventId: sinceEventId,
      eventCount: events.length,
      lastEventId: this.state.lastEventId,
      events: events.map(e => ({ ...e })),
      snapshots: includeSnapshots ? [...this.state.snapshots] : undefined
    };
  }

  importMergeData(mergeData, currentState = null) {
    if (!mergeData || !Array.isArray(mergeData.events)) {
      return { success: false, error: 'Invalid merge data' };
    }
    const result = this.importEvents(mergeData.events, 'sort');
    if (mergeData.snapshots && mergeData.snapshots.length > 0) {
      mergeData.snapshots.forEach(snap => {
        if (!this.state.snapshots.some(s => s.id === snap.id)) {
          this.state.snapshots.push(snap);
        }
      });
      this.state.snapshots.sort((a, b) => a.atEventIndex - b.atEventIndex);
      saveEventStore(this.state);
    }
    return {
      success: true,
      imported: result.imported,
      duplicates: result.duplicates,
      newState: currentState ? this.rebuildState() : null
    };
  }

  detectConflictsWith(localEvents, importEvents) {
    const conflicts = [];
    const localByAggregate = new Map();

    localEvents.forEach(evt => {
      const key = `${evt.aggregateType}:${evt.aggregateId}`;
      if (!localByAggregate.has(key)) localByAggregate.set(key, []);
      localByAggregate.get(key).push(evt);
    });

    importEvents.forEach(importEvt => {
      const key = `${importEvt.aggregateType}:${importEvt.aggregateId}`;
      const localAggEvents = localByAggregate.get(key) || [];
      const importTime = new Date(importEvt.timestamp).getTime();

      const concurrentLocal = localAggEvents.filter(localEvt => {
        const localTime = new Date(localEvt.timestamp).getTime();
        return Math.abs(localTime - importTime) < 5000 && localEvt.type === importEvt.type;
      });

      if (concurrentLocal.length > 0) {
        conflicts.push({
          aggregateType: importEvt.aggregateType,
          aggregateId: importEvt.aggregateId,
          importEvent: importEvt,
          localEvents: concurrentLocal,
          type: 'concurrent_modification'
        });
      }
    });

    return conflicts;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notifyListeners(event) {
    this.listeners.forEach(l => {
      try { l(event); } catch (e) { console.error(e); }
    });
  }

  clearAll() {
    this.state = emptyEventStoreState();
    saveEventStore(this.state);
  }

  getLastEventId() {
    return this.state.lastEventId;
  }

  getSnapshots() {
    return [...this.state.snapshots];
  }

  rollbackToSnapshot(snapshotId) {
    const snapIdx = this.state.snapshots.findIndex(s => s.id === snapshotId);
    if (snapIdx === -1) return null;
    const snapshot = this.state.snapshots[snapIdx];
    this.state.events = this.state.events.slice(0, snapshot.atEventIndex);
    this.state.snapshots = this.state.snapshots.slice(0, snapIdx + 1);
    this.state.eventCount = this.state.events.length;
    this.state.lastEventId = this.state.events.length > 0
      ? this.state.events[this.state.events.length - 1].id
      : null;
    saveEventStore(this.state);
    return snapshot.state;
  }
}

export {
  EVENT_STORE_VERSION,
  EVENT_TYPES,
  AGGREGATE_TYPES,
  eventUid,
  deviceUid,
  getDeviceInfo,
  setDeviceName,
  createEvent,
  replayEvents,
  rebuildFromEventStore,
  EventStore
};
