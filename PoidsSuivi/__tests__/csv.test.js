import { buildCSV, parseCSV, parseDate } from '../src/utils/csv';

describe('parseDate', () => {
  test('formats acceptés', () => {
    expect(parseDate('2026-03-08')).toBe('2026-03-08');
    expect(parseDate('08/03/2026')).toBe('2026-03-08');
    expect(parseDate('8/3/26')).toBe('2026-03-08');
    expect(parseDate('08/03', 2025)).toBe('2025-03-08');
  });

  test('dates impossibles rejetées', () => {
    expect(parseDate('31/02/2026')).toBeNull();
    expect(parseDate('bonjour')).toBeNull();
  });
});

describe('parseCSV', () => {
  test("relit exactement l'export de l'app", () => {
    const entries = [
      { date: '2026-03-08', poids: 79, ma5: null },
      { date: '2026-03-09', poids: 78.3, ma5: 78.52 },
    ];
    const { entries: out, errors } = parseCSV(buildCSV(entries));
    expect(errors).toEqual([]);
    expect(out).toEqual([
      { date: '2026-03-08', poids: 79 },
      { date: '2026-03-09', poids: 78.3 },
    ]);
  });

  test('séparateur ; avec virgule décimale, BOM et CRLF', () => {
    const text = '﻿Date;Poids\r\n08/03/2026;79,4\r\n09/03/2026;78,9\r\n';
    expect(parseCSV(text).entries).toEqual([
      { date: '2026-03-08', poids: 79.4 },
      { date: '2026-03-09', poids: 78.9 },
    ]);
  });

  test('lignes invalides signalées, doublons fusionnés, tri par date', () => {
    const text = 'date,poids\n2026-03-09,78\nn/a,80\n2026-03-08,79\n2026-03-09,78.5\n2026-03-10,500';
    const { entries, errors } = parseCSV(text);
    expect(entries).toEqual([
      { date: '2026-03-08', poids: 79 },
      { date: '2026-03-09', poids: 78.5 },
    ]);
    expect(errors).toEqual([3, 6]);
  });
});
