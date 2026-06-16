import { describe, it, expect } from 'vitest';
import {
  splitLineByMixedDelimiters,
  detectFieldMapping,
  isHeaderLine,
  parseImportText,
  validateImportRecords
} from './textImport.js';

const appConfigForTextImport = {
  fields: [
    { key: 'estate', label: '楼盘' },
    { key: 'building', label: '楼栋' },
    { key: 'elevatorNo', label: '电梯编号' },
    { key: 'cycle', label: '维保周期', options: ['15天', '30天', '季度'] },
    { key: 'nextDate', label: '下次维保日期' },
    { key: 'owner', label: '负责人' }
  ]
};

describe('splitLineByMixedDelimiters', () => {
  it('使用制表符分隔', () => {
    expect(splitLineByMixedDelimiters('A\tB\tC')).toEqual(['A', 'B', 'C']);
  });

  it('使用英文逗号分隔', () => {
    expect(splitLineByMixedDelimiters('A,B,C')).toEqual(['A', 'B', 'C']);
  });

  it('使用中文逗号分隔', () => {
    expect(splitLineByMixedDelimiters('A，B，C')).toEqual(['A', 'B', 'C']);
  });

  it('使用空白符分隔', () => {
    expect(splitLineByMixedDelimiters('A B  C   D')).toEqual(['A', 'B', 'C', 'D']);
  });

  it('混合分隔符', () => {
    expect(splitLineByMixedDelimiters('A,B\tC D')).toEqual(['A', 'B', 'C', 'D']);
  });

  it('前后空白被 trim', () => {
    expect(splitLineByMixedDelimiters('  A ,  B  ')).toEqual(['A', 'B']);
  });

  it('空字符串返回空数组', () => {
    expect(splitLineByMixedDelimiters('')).toEqual([]);
  });

  it('仅分隔符返回空数组', () => {
    expect(splitLineByMixedDelimiters(',,,\t\t  ')).toEqual([]);
  });
});

describe('detectFieldMapping', () => {
  it('中文表头正确映射', () => {
    const headers = ['楼盘', '楼栋', '电梯编号'];
    const mapping = detectFieldMapping(headers, appConfigForTextImport);
    expect(mapping[0]).toBe('estate');
    expect(mapping[1]).toBe('building');
    expect(mapping[2]).toBe('elevatorNo');
  });

  it('字段映射仅匹配中文 label（不匹配英文 key）', () => {
    const headers = ['estate', 'building', 'elevatorNo'];
    const mapping = detectFieldMapping(headers, appConfigForTextImport);
    expect(mapping[0]).toBeUndefined();
    expect(mapping[1]).toBeUndefined();
    expect(mapping[2]).toBeUndefined();
  });

  it('未知表头不进入映射', () => {
    const headers = ['楼盘', '未知字段', '电梯编号'];
    const mapping = detectFieldMapping(headers, appConfigForTextImport);
    expect(mapping[0]).toBe('estate');
    expect(mapping[1]).toBeUndefined();
    expect(mapping[2]).toBe('elevatorNo');
  });

  it('表头含多余空白仍能匹配', () => {
    const headers = ['  楼盘  ', '  电梯编号  '];
    const mapping = detectFieldMapping(headers, appConfigForTextImport);
    expect(mapping[0]).toBe('estate');
    expect(mapping[1]).toBe('elevatorNo');
  });
});

describe('isHeaderLine', () => {
  it('两个及以上匹配字段判定为表头', () => {
    const cells = ['楼盘', '楼栋', '电梯编号'];
    expect(isHeaderLine(cells, appConfigForTextImport)).toBe(true);
  });

  it('仅一个匹配不判定为表头', () => {
    const cells = ['楼盘', '随便一个值', '另一个值'];
    expect(isHeaderLine(cells, appConfigForTextImport)).toBe(false);
  });

  it('零个匹配不是表头', () => {
    const cells = ['X', 'Y', 'Z'];
    expect(isHeaderLine(cells, appConfigForTextImport)).toBe(false);
  });

  it('混合 key 和 label 也可以累计匹配', () => {
    const cells = ['estate', '楼栋', 'C'];
    expect(isHeaderLine(cells, appConfigForTextImport)).toBe(true);
  });
});

describe('parseImportText', () => {
  it('空文本返回空数组', () => {
    const result = parseImportText('', appConfigForTextImport);
    expect(result.records).toEqual([]);
    expect(result.hasHeader).toBe(false);
    expect(result.fieldMapping).toBeNull();
  });

  it('全是空白行返回空数组', () => {
    const result = parseImportText('\n\n   \n\n', appConfigForTextImport);
    expect(result.records).toEqual([]);
  });

  it('带表头的数据正确解析', () => {
    const text = [
      '楼盘,楼栋,电梯编号,维保周期,下次维保日期,负责人',
      'A小区,1栋,E-001,30天,2026-06-30,张三',
      'B小区,2栋,E-002,15天,2026-06-20,李四'
    ].join('\n');
    const result = parseImportText(text, appConfigForTextImport);
    expect(result.hasHeader).toBe(true);
    expect(result.records).toHaveLength(2);
    expect(result.records[0].estate).toBe('A小区');
    expect(result.records[0].building).toBe('1栋');
    expect(result.records[0].elevatorNo).toBe('E-001');
    expect(result.records[0].cycle).toBe('30天');
    expect(result.records[0].nextDate).toBe('2026-06-30');
    expect(result.records[0].owner).toBe('张三');
    expect(result.records[1].elevatorNo).toBe('E-002');
  });

  it('无表头时使用默认顺序解析', () => {
    const text = [
      'A小区,1栋,E-001,30天,2026-06-30,张三'
    ].join('\n');
    const result = parseImportText(text, appConfigForTextImport);
    expect(result.hasHeader).toBe(false);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].estate).toBe('A小区');
    expect(result.records[0].building).toBe('1栋');
    expect(result.records[0].elevatorNo).toBe('E-001');
    expect(result.records[0].cycle).toBe('30天');
    expect(result.records[0].nextDate).toBe('2026-06-30');
    expect(result.records[0].owner).toBe('张三');
  });

  it('跳过空行保留原始行号', () => {
    const text = [
      '楼盘,电梯编号,负责人',
      '',
      'A小区,E-001,张三',
      '   ',
      'B小区,E-002,李四'
    ].join('\n');
    const result = parseImportText(text, appConfigForTextImport);
    expect(result.records).toHaveLength(2);
    expect(result.records[0].lineIndex).toBe(2);
    expect(result.records[1].lineIndex).toBe(4);
  });

  it('无表头时列数不足不报错，仅填充已有字段', () => {
    const text = 'A小区,1栋,E-001\n';
    const result = parseImportText(text, appConfigForTextImport);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].estate).toBe('A小区');
    expect(result.records[0].building).toBe('1栋');
    expect(result.records[0].elevatorNo).toBe('E-001');
    expect(result.records[0].cycle).toBe('');
    expect(result.records[0].nextDate).toBe('');
    expect(result.records[0].owner).toBe('');
  });

  it('有表头时列顺序自由排列', () => {
    const text = [
      '负责人,电梯编号,楼盘',
      '张三,E-001,A小区'
    ].join('\n');
    const result = parseImportText(text, appConfigForTextImport);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].owner).toBe('张三');
    expect(result.records[0].elevatorNo).toBe('E-001');
    expect(result.records[0].estate).toBe('A小区');
  });
});

describe('validateImportRecords', () => {
  const validRecord = () => ({
    estate: 'A小区',
    building: '1栋',
    elevatorNo: 'E-001',
    cycle: '30天',
    nextDate: '2026-06-30',
    owner: '张三',
    errors: []
  });

  it('所有字段有效且无重复时无错误', () => {
    const records = [validRecord()];
    const result = validateImportRecords(records, appConfigForTextImport, []);
    expect(result[0].errors).toHaveLength(0);
  });

  it('缺失楼盘报错', () => {
    const r = validRecord();
    r.estate = '';
    const result = validateImportRecords([r], appConfigForTextImport, []);
    const missingEstate = result[0].errors.some(e => e.field === '楼盘' && e.type === 'missing');
    expect(missingEstate).toBe(true);
  });

  it('缺失楼栋报错', () => {
    const r = validRecord();
    r.building = '';
    const result = validateImportRecords([r], appConfigForTextImport, []);
    const has = result[0].errors.some(e => e.field === '楼栋' && e.type === 'missing');
    expect(has).toBe(true);
  });

  it('缺失电梯编号报错', () => {
    const r = validRecord();
    r.elevatorNo = '';
    const result = validateImportRecords([r], appConfigForTextImport, []);
    const has = result[0].errors.some(e => e.field === '电梯编号' && e.type === 'missing');
    expect(has).toBe(true);
  });

  it('缺失维保周期报错', () => {
    const r = validRecord();
    r.cycle = '';
    const result = validateImportRecords([r], appConfigForTextImport, []);
    const has = result[0].errors.some(e => e.field === '维保周期' && e.type === 'missing');
    expect(has).toBe(true);
  });

  it('无效维保周期报错', () => {
    const r = validRecord();
    r.cycle = '99天';
    const result = validateImportRecords([r], appConfigForTextImport, []);
    const has = result[0].errors.some(e => e.field === '维保周期' && e.type === 'invalidCycle');
    expect(has).toBe(true);
  });

  it('缺失下次维保日期报错', () => {
    const r = validRecord();
    r.nextDate = '';
    const result = validateImportRecords([r], appConfigForTextImport, []);
    const has = result[0].errors.some(e => e.field === '下次维保日期' && e.type === 'missing');
    expect(has).toBe(true);
  });

  it('日期格式不正确报错（斜杠）', () => {
    const r = validRecord();
    r.nextDate = '2026/06/30';
    const result = validateImportRecords([r], appConfigForTextImport, []);
    const has = result[0].errors.some(e => e.field === '下次维保日期' && e.type === 'invalidDate');
    expect(has).toBe(true);
  });

  it('日期格式不正确报错（非日期）', () => {
    const r = validRecord();
    r.nextDate = 'not-a-date';
    const result = validateImportRecords([r], appConfigForTextImport, []);
    const has = result[0].errors.some(e => e.field === '下次维保日期' && e.type === 'invalidDate');
    expect(has).toBe(true);
  });

  it('缺失负责人报错', () => {
    const r = validRecord();
    r.owner = '';
    const result = validateImportRecords([r], appConfigForTextImport, []);
    const has = result[0].errors.some(e => e.field === '负责人' && e.type === 'missing');
    expect(has).toBe(true);
  });

  it('同一导入批次内电梯编号重复——仅后续重复的被标 duplicate', () => {
    const r1 = validRecord();
    const r2 = validRecord();
    r2.elevatorNo = r1.elevatorNo;
    const result = validateImportRecords([r1, r2], appConfigForTextImport, []);
    const r1Dup = result[0].errors.some(e => e.type === 'duplicate' && e.field === '电梯编号');
    const r2Dup = result[1].errors.some(e => e.type === 'duplicate' && e.field === '电梯编号');
    expect(r1Dup).toBe(false);
    expect(r2Dup).toBe(true);
  });

  it('与现有记录电梯编号重复标记 duplicateExisting', () => {
    const r = validRecord();
    const existing = [{ elevatorNo: r.elevatorNo }];
    const result = validateImportRecords([r], appConfigForTextImport, existing);
    const has = result[0].errors.some(e => e.type === 'duplicateExisting' && e.field === '电梯编号');
    expect(has).toBe(true);
  });

  it('一条记录可以有多个错误', () => {
    const r = { estate: '', building: '', elevatorNo: '', cycle: '', nextDate: '', owner: '', errors: [] };
    const result = validateImportRecords([r], appConfigForTextImport, []);
    expect(result[0].errors.length).toBeGreaterThanOrEqual(6);
  });
});
