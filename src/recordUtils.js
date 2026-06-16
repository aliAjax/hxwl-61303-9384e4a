import { migrateRecord, migrateRecords } from './dataImportExport.js';

function isValueEqual(prevVal, nextVal) {
  if (Array.isArray(prevVal) && Array.isArray(nextVal)) {
    return JSON.stringify(prevVal) === JSON.stringify(nextVal);
  }
  if (typeof prevVal === 'object' && prevVal !== null && typeof nextVal === 'object' && nextVal !== null) {
    return JSON.stringify(prevVal) === JSON.stringify(nextVal);
  }
  return prevVal === nextVal;
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
      if (!isValueEqual(prevVal, nextVal)) {
        return true;
      }
    }
  }
  return false;
}

function computeChangedIds(prevRecords, nextRecords) {
  const changedIds = new Set();
  if (!recordsChanged(prevRecords, nextRecords)) {
    return changedIds;
  }

  const prevMap = new Map(prevRecords.map(r => [r.id, r]));
  nextRecords.forEach((r) => {
    const prev = prevMap.get(r.id);
    if (!prev) {
      changedIds.add(r.id);
      return;
    }
    const allKeys = new Set([...Object.keys(prev), ...Object.keys(r)]);
    for (const key of allKeys) {
      if (key === 'updatedAt') continue;
      const prevVal = prev[key];
      const nextVal = r[key];
      if (!isValueEqual(prevVal, nextVal)) {
        changedIds.add(r.id);
        break;
      }
    }
  });

  return changedIds;
}

function normalizeRecordsForPersistence(nextRecords, prevRecords, options = {}) {
  const { now = new Date().toISOString() } = options;
  const changedIds = computeChangedIds(prevRecords, nextRecords);

  const normalized = nextRecords.map((record) => {
    const migrated = migrateRecord(record);
    if (changedIds.has(migrated.id)) {
      migrated.updatedAt = now;
    }
    if (!migrated.businessKey) {
      migrated.businessKey = migrated.elevatorNo || migrated.id;
    }
    return migrated;
  });

  return normalized;
}

export {
  isValueEqual,
  recordsChanged,
  computeChangedIds,
  normalizeRecordsForPersistence
};
