import {
  computeMA5, computeTrend, isPeak, computeStats, estimateGoalDate, filterByDays,
  rangeStats, computeBMI, bmiCategory, compareMonths, phaseLabel,
} from '../src/utils/calculations';
import { toISO, toDisplay, daysBetween, addDaysISO } from '../src/utils/dates';

const series = (start, weights) =>
  weights.map((poids, i) => ({ date: addDaysISO(start, i), poids }));

describe('dates', () => {
  test('conversions ISO ↔ DD/MM', () => {
    expect(toISO('08/03', 2026)).toBe('2026-03-08');
    expect(toDisplay('2026-03-08')).toBe('08/03');
  });

  test('daysBetween traverse les mois', () => {
    expect(daysBetween('2026-02-27', '2026-03-02')).toBe(3);
  });
});

describe('computeMA5', () => {
  test('null pour les 4 premières, puis moyenne glissante', () => {
    const out = computeMA5(series('2026-01-01', [80, 81, 82, 83, 84, 85]));
    expect(out.slice(0, 4).every((e) => e.ma5 === null)).toBe(true);
    expect(out[4].ma5).toBe(82);
    expect(out[5].ma5).toBe(83);
  });
});

describe('computeTrend', () => {
  test('pente exacte sur une série linéaire (−0.1 kg/jour)', () => {
    const data = series('2026-01-01', Array.from({ length: 15 }, (_, i) => 80 - 0.1 * i));
    const t = computeTrend(data, 14);
    expect(t.slopePerDay).toBeCloseTo(-0.1, 4);
    expect(t.slopePerWeek).toBeCloseTo(-0.7, 3);
  });

  test('série plate → pente nulle et phase Maintien', () => {
    const t = computeTrend(series('2026-01-01', [80, 80, 80, 80]), 14);
    expect(t.slopePerWeek).toBe(0);
    expect(phaseLabel(t.slopePerWeek).label).toBe('Maintien');
  });

  test('moins de 2 points → 0', () => {
    expect(computeTrend([{ date: '2026-01-01', poids: 80 }]).slopePerWeek).toBe(0);
  });
});

describe('isPeak', () => {
  test('pic au-delà de MA5 + 1 kg uniquement', () => {
    expect(isPeak({ poids: 81.2, ma5: 80 })).toBe(true);
    expect(isPeak({ poids: 81.0, ma5: 80 })).toBe(false);
    expect(isPeak({ poids: 90, ma5: null })).toBe(false);
  });
});

describe('computeStats', () => {
  test('liste vide', () => {
    expect(computeStats([]).current).toBeNull();
  });

  test('min / max / courant', () => {
    const s = computeStats(computeMA5(series('2026-01-01', [80, 78, 82, 79, 81])));
    expect(s).toMatchObject({ current: 81, min: 78, max: 82, count: 5 });
  });
});

describe('estimateGoalDate', () => {
  test('null si la tendance va dans le mauvais sens', () => {
    expect(estimateGoalDate(80, 75, 0.05)).toBeNull();
  });

  test('null si pente nulle', () => {
    expect(estimateGoalDate(80, 75, 0)).toBeNull();
  });

  test('date dans le futur si la tendance va dans le bon sens', () => {
    const d = estimateGoalDate(80, 79, -0.1);
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('filterByDays / rangeStats', () => {
  test('fenêtre calendaire, pas en nombre de pesées', () => {
    const data = [
      { date: '2026-01-01', poids: 80 },
      { date: '2026-01-20', poids: 79 },
      { date: '2026-01-25', poids: 78 },
      { date: '2026-01-26', poids: 78.5 },
    ];
    expect(filterByDays(data, 7).map((d) => d.date)).toEqual(['2026-01-20', '2026-01-25', '2026-01-26']);
  });

  test('stats de période', () => {
    const r = rangeStats([{ poids: 80 }, { poids: 78 }, { poids: 79 }]);
    expect(r).toMatchObject({ avg: 79, min: 78, max: 80, delta: -1, count: 3 });
  });
});

describe('IMC', () => {
  test('calcul et catégories OMS', () => {
    expect(computeBMI(80, 180)).toBe(24.7);
    expect(bmiCategory(24.7).label).toBe('Normal');
    expect(bmiCategory(27).label).toBe('Surpoids');
    expect(bmiCategory(31).label).toBe('Obésité');
    expect(computeBMI(80, null)).toBeNull();
  });
});

describe('compareMonths', () => {
  test('moyenne du mois courant vs précédent (passage d’année)', () => {
    const data = [
      { date: '2025-12-10', poids: 80 },
      { date: '2025-12-20', poids: 82 },
      { date: '2026-01-05', poids: 79 },
    ];
    const r = compareMonths(data, '2026-01-15');
    expect(r).toMatchObject({ previous: 81, current: 79, delta: -2 });
  });
});
