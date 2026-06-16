function splitLineByMixedDelimiters(line) {
  return line
    .split(/[\t，,\s]+/)
    .map(p => p.trim())
    .filter(p => p !== '');
}

function detectFieldMapping(headerCells, appConfig) {
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

function isHeaderLine(cells, appConfig) {
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

function parseImportText(text, appConfig) {
  const rawLines = text.split('\n');
  const nonEmptyLines = rawLines
    .map((line, originalIdx) => ({ line: line.trim(), originalIdx }))
    .filter(item => item.line !== '');

  if (nonEmptyLines.length === 0) {
    return { records: [], fieldMapping: null, hasHeader: false };
  }

  const firstLineCells = splitLineByMixedDelimiters(nonEmptyLines[0].line);
  const hasHeader = isHeaderLine(firstLineCells, appConfig);
  let fieldMapping = null;
  let dataStartIndex = 0;

  if (hasHeader) {
    fieldMapping = detectFieldMapping(firstLineCells, appConfig);
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

function validateImportRecords(parsedRecords, appConfig, existingRecords = []) {
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

  const existingRecordNos = new Set(existingRecords.map(r => r.elevatorNo));
  recordsWithErrors.forEach((record) => {
    if (record.elevatorNo && existingRecordNos.has(record.elevatorNo)) {
      record.errors.push({ type: 'duplicateExisting', field: '电梯编号', value: record.elevatorNo });
    }
  });

  return recordsWithErrors;
}

export {
  splitLineByMixedDelimiters,
  detectFieldMapping,
  isHeaderLine,
  parseImportText,
  validateImportRecords
};
