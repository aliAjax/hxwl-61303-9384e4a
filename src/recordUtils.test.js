import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isValueEqual,
  recordsChanged,
  computeChangedIds,
  normalizeRecordsForPersistence
} from './recordUtils.js';

vi.mock('./dataImportExport.js', () => ({
  migrateRecord: vi.fn((record) => ({ ...record }))
}));

import { migrateRecord } from './dataImportExport.js';

beforeEach(() => {
  vi.clearAllMocks();
  migrateRecord.mockImplementation(record => ({ ...record }));
});

describe('isValueEqual', () => {
  it('基本类型相等比较', () => {
    expect(isValueEqual(1, 1)).toBe(true);
    expect(isValueEqual('a', 'a')).toBe(true);
    expect(isValueEqual(null, null)).toBe(true);
    expect(isValueEqual(undefined, undefined)).toBe(true);
    expect(isValueEqual(true, true)).toBe(true);
  });

  it('基本类型不相等比较', () => {
    expect(isValueEqual(1, 2)).toBe(false);
    expect(isValueEqual('a', 'b')).toBe(false);
    expect(isValueEqual(null, undefined)).toBe(false);
    expect(isValueEqual(1, '1')).toBe(false);
  });

  it('数组相等（深比较）', () => {
    expect(isValueEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(isValueEqual([1, [2, 3]], [1, [2, 3]])).toBe(true);
    expect(isValueEqual([1, 2], [2, 1])).toBe(false);
    expect(isValueEqual([], [])).toBe(true);
  });

  it('对象相等（深比较，基于 JSON.stringify）', () => {
    expect(isValueEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    expect(isValueEqual({ a: 1 }, { a: 1, b: undefined })).toBe(true);
    expect(isValueEqual({ nested: { deep: 1 } }, { nested: { deep: 1 } })).toBe(true);
  });

  it('JSON.stringify 对键顺序敏感，顺序不同视为不相等', () => {
    expect(isValueEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(false);
  });
});

describe('recordsChanged', () => {
  it('长度不同返回 true', () => {
    expect(recordsChanged([{ id: '1' }], [{ id: '1' }, { id: '2' }])).toBe(true);
  });

  it('空数组相同返回 false', () => {
    expect(recordsChanged([], [])).toBe(false);
  });

  it('记录内容完全相同返回 false', () => {
    const r1 = { id: '1', name: 'A' };
    expect(recordsChanged([r1], [r1])).toBe(false);
  });

  it('记录 updatedAt 不同但其他相同视为未变', () => {
    const prev = [{ id: '1', updatedAt: '2026-06-15T10:00:00.000Z' }];
    const next = [{ id: '1', updatedAt: '2026-06-16T10:00:00.000Z' }];
    expect(recordsChanged(prev, next)).toBe(false);
  });

  it('记录内容发生变更返回 true', () => {
    const prev = [{ id: '1', status: 'pending' }];
    const next = [{ id: '1', status: 'done' }];
    expect(recordsChanged(prev, next)).toBe(true);
  });

  it('新增记录返回 true', () => {
    const prev = [{ id: '1' }];
    const next = [{ id: '1' }, { id: '2' }];
    expect(recordsChanged(prev, next)).toBe(true);
  });

  it('删除记录返回 true', () => {
    const prev = [{ id: '1' }, { id: '2' }];
    const next = [{ id: '1' }];
    expect(recordsChanged(prev, next)).toBe(true);
  });

  it('多记录其中一条变更返回 true', () => {
    const prev = [{ id: '1', status: 'pending' }, { id: '2', status: 'pending' }];
    const next = [{ id: '1', status: 'pending' }, { id: '2', status: 'done' }];
    expect(recordsChanged(prev, next)).toBe(true);
  });

  it('嵌套对象属性变更检测', () => {
    const prev = [{ id: '1', data: { a: 1, b: 2 } }];
    const next = [{ id: '1', data: { a: 1, b: 3 } }];
    expect(recordsChanged(prev, next)).toBe(true);
  });
});

describe('computeChangedIds', () => {
  it('无变更返回空 Set', () => {
    const prev = [{ id: '1' }, { id: '2' }];
    const next = [{ id: '1' }, { id: '2' }];
    const result = computeChangedIds(prev, next);
    expect(result instanceof Set).toBe(true);
    expect(result.size).toBe(0);
  });

  it('记录未变 updatedAt 不计入变更', () => {
    const prev = [{ id: '1', updatedAt: 'old' }];
    const next = [{ id: '1', updatedAt: 'new' }];
    const result = computeChangedIds(prev, next);
    expect(result.size).toBe(0);
  });

  it('新增记录 id 在变更集合', () => {
    const prev = [{ id: '1' }];
    const next = [{ id: '1' }, { id: '2' }];
    const result = computeChangedIds(prev, next);
    expect(result.has('2')).toBe(true);
    expect(result.has('1')).toBe(false);
    expect(result.size).toBe(1);
  });

  it('内容变更的 id 在变更集合', () => {
    const prev = [{ id: '1', status: 'pending' }, { id: '2', status: 'pending' }];
    const next = [{ id: '1', status: 'done' }, { id: '2', status: 'pending' }];
    const result = computeChangedIds(prev, next);
    expect(result.has('1')).toBe(true);
    expect(result.has('2')).toBe(false);
  });

  it('删除的记录不会出现在结果中（前有后无）', () => {
    const prev = [{ id: '1' }, { id: '2' }];
    const next = [{ id: '1' }];
    const result = computeChangedIds(prev, next);
    expect(result.size).toBe(0);
  });

  it('多字段变更只记录一次 id', () => {
    const prev = [{ id: '1', a: 1, b: 2 }];
    const next = [{ id: '1', a: 10, b: 20 }];
    const result = computeChangedIds(prev, next);
    expect(result.size).toBe(1);
    expect(result.has('1')).toBe(true);
  });
});

describe('normalizeRecordsForPersistence', () => {
  const now = '2026-06-16T10:00:00.000Z';

  it('变更的记录 updatedAt 被设置为 now', () => {
    const prev = [{ id: '1', status: 'pending' }];
    const next = [{ id: '1', status: 'done' }];
    migrateRecord.mockImplementation(r => ({ ...r }));
    const result = normalizeRecordsForPersistence(next, prev, { now });
    expect(result[0].updatedAt).toBe(now);
  });

  it('未变更的记录保留原 updatedAt', () => {
    const prev = [{ id: '1', status: 'pending', updatedAt: 'original-ts' }];
    const next = [{ id: '1', status: 'pending', updatedAt: 'original-ts' }];
    const result = normalizeRecordsForPersistence(next, prev, { now });
    expect(result[0].updatedAt).toBe('original-ts');
  });

  it('缺少 businessKey 时用 elevatorNo 填充', () => {
    const prev = [];
    const next = [{ id: '1', elevatorNo: 'E-001' }];
    const result = normalizeRecordsForPersistence(next, prev, { now });
    expect(result[0].businessKey).toBe('E-001');
  });

  it('缺少 businessKey 和 elevatorNo 时用 id 填充', () => {
    const prev = [];
    const next = [{ id: 'r1' }];
    const result = normalizeRecordsForPersistence(next, prev, { now });
    expect(result[0].businessKey).toBe('r1');
  });

  it('已有 businessKey 时保留', () => {
    const prev = [];
    const next = [{ id: '1', businessKey: 'custom-key' }];
    const result = normalizeRecordsForPersistence(next, prev, { now });
    expect(result[0].businessKey).toBe('custom-key');
  });

  it('多条记录混合变更和未变更', () => {
    const prev = [
      { id: '1', status: 'pending' },
      { id: '2', status: 'pending', updatedAt: 'keep-this' }
    ];
    const next = [
      { id: '1', status: 'done' },
      { id: '2', status: 'pending', updatedAt: 'keep-this' }
    ];
    const result = normalizeRecordsForPersistence(next, prev, { now });
    expect(result[0].updatedAt).toBe(now);
    expect(result[1].updatedAt).toBe('keep-this');
  });

  it('now 参数不传时使用默认值', () => {
    const prev = [];
    const next = [{ id: '1', status: 'new' }];
    const result = normalizeRecordsForPersistence(next, prev);
    expect(result[0].updatedAt).toBeDefined();
    expect(new Date(result[0].updatedAt).getTime()).not.toBeNaN();
  });
});
