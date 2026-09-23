// Calculs métier : MA5, tendance (régression linéaire), pics, stats, streak, objectif.

import { addDaysISO, daysBetween, monthKey, daysInMonthOf, todayISO, parseISO } from './dates';

export const round = (n, d = 1) => {
  if (n == null || Number.isNaN(n)) return null;
  const p = 10 ** d;
  return Math.round(n * p) / p;
};

// MA5 : moyenne des 5 entrées consécutives (index-based, pas calendaire).
// `null` pour les 4 premiers points (fenêtre incomplète).
export const computeMA5 = (data) =>
  data.map((d, i) => ({
    ...d,
    ma5:
      i < 4
        ? null
        : round(data.slice(i - 4, i + 1).reduce((s, x) => s + x.poids, 0) / 5, 2),
  }));

// Régression linéaire par moindres carrés sur les `days` dernières entrées
// (utilise l'index de jour relatif au premier point de la fenêtre).
// Retourne la pente en kg/jour ET kg/semaine.
export const computeTrend = (data, days = 14) => {
  if (!data || data.length < 2) return { slopePerDay: 0, slopePerWeek: 0, count: 0 };
  const last = data[data.length - 1].date;
  const cutoff = addDaysISO(last, -days);
  const window = data.filter((d) => d.date >= cutoff);
  if (window.length < 2) return { slopePerDay: 0, slopePerWeek: 0, count: window.length };

  const x0 = window[0].date;
  const xs = window.map((d) => daysBetween(x0, d.date));
  const ys = window.map((d) => d.poids);
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, b, i) => a + b * ys[i], 0);
  const sumXX = xs.reduce((a, b) => a + b * b, 0);
  const denom = n * sumXX - sumX * sumX;
  const slopePerDay = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  return {
    slopePerDay: round(slopePerDay, 4),
    slopePerWeek: round(slopePerDay * 7, 3),
    count: n,
  };
};

// Pic détecté quand le poids dépasse la MA5 de plus de 1 kg.
export const isPeak = (entry) => entry.ma5 != null && entry.poids > entry.ma5 + 1.0;

// Statistiques agrégées sur l'ensemble (ou une fenêtre déjà filtrée).
export const computeStats = (data) => {
  if (!data || data.length === 0) {
    return { current: null, ma5Current: null, ma5Delta: null, min: null, max: null, count: 0 };
  }
  const last = data[data.length - 1];
  const ma5Current = last.ma5 ?? null;
  // Δ MA5 = MA5 actuelle vs MA5 d'il y a 7 entrées (proxy hebdo).
  const prev = data[Math.max(0, data.length - 8)];
  const ma5Delta = ma5Current != null && prev?.ma5 != null ? round(ma5Current - prev.ma5, 2) : null;
  const poids = data.map((d) => d.poids);
  return {
    current: last.poids,
    ma5Current,
    ma5Delta,
    min: round(Math.min(...poids), 1),
    max: round(Math.max(...poids), 1),
    count: data.length,
  };
};

// Nombre de pesées consécutives (jours calendaires) terminant aujourd'hui.
// Si la dernière pesée n'est pas aujourd'hui ni hier, streak = 0.
export const computeStreak = (data) => {
  if (!data || data.length === 0) return 0;
  const today = todayISO();
  const sorted = [...data].sort((a, b) => (a.date < b.date ? 1 : -1));
  const last = sorted[0].date;
  const gap = daysBetween(last, today);
  if (gap > 1) return 0;
  let streak = 1;
  let cursor = last;
  for (let i = 1; i < sorted.length; i++) {
    if (daysBetween(sorted[i].date, cursor) === 1) {
      streak += 1;
      cursor = sorted[i].date;
    } else if (sorted[i].date === cursor) {
      continue; // doublon défensif
    } else {
      break;
    }
  }
  return streak;
};

// Régularité : ratio pesées du mois / jours dans le mois (clampé à 1).
export const computeRegularity = (data, refIso = todayISO()) => {
  const key = monthKey(refIso);
  const inMonth = data.filter((d) => monthKey(d.date) === key).length;
  const total = daysInMonthOf(refIso);
  return { count: inMonth, total, ratio: Math.min(1, inMonth / total) };
};

// Phase synthétique selon la pente hebdo (kg/sem).
export const phaseLabel = (slopePerWeek) => {
  if (slopePerWeek > 0.1) return { label: 'Prise', icon: '📈', tone: 'up' };
  if (slopePerWeek < -0.1) return { label: 'Perte', icon: '📉', tone: 'down' };
  return { label: 'Maintien', icon: '↔️', tone: 'neutral' };
};

// Verbe synthétique pour la phrase « Tu … en moyenne X kg/semaine ».
export const trendVerb = (slopePerWeek) => {
  if (slopePerWeek > 0.1) return 'prends';
  if (slopePerWeek < -0.1) return 'perds';
  return 'maintiens';
};

// Estime la date à laquelle l'objectif serait atteint au rythme actuel (slope/jour).
// Renvoie null si la pente est nulle ou pousse dans la mauvaise direction.
export const estimateGoalDate = (current, goal, slopePerDay) => {
  if (current == null || goal == null || !slopePerDay) return null;
  const delta = goal - current;
  // Si on doit perdre mais qu'on prend (slope > 0) ou inverse → inatteignable.
  if (Math.sign(delta) !== Math.sign(slopePerDay)) return null;
  const days = Math.ceil(delta / slopePerDay);
  if (days <= 0 || days > 5 * 365) return null;
  return addDaysISO(todayISO(), days);
};

// Garde les entrées des `days` derniers jours calendaires (relatif à la dernière pesée).
export const filterByDays = (data, days) => {
  if (!data?.length || !days) return data ?? [];
  const cutoff = addDaysISO(data[data.length - 1].date, -(days - 1));
  return data.filter((d) => d.date >= cutoff);
};

// Statistiques d'une fenêtre : moyenne, min, max, variation première → dernière.
export const rangeStats = (data) => {
  if (!data?.length) return null;
  const poids = data.map((d) => d.poids);
  return {
    avg: round(poids.reduce((a, b) => a + b, 0) / poids.length, 1),
    min: Math.min(...poids),
    max: Math.max(...poids),
    delta: round(poids[poids.length - 1] - poids[0], 1),
    count: poids.length,
  };
};

// IMC = poids / taille² (taille en cm).
export const computeBMI = (poids, tailleCm) => {
  if (!poids || !tailleCm) return null;
  const m = tailleCm / 100;
  return round(poids / (m * m), 1);
};

// Catégories OMS de l'IMC adulte.
export const bmiCategory = (bmi) => {
  if (bmi == null) return null;
  if (bmi < 18.5) return { label: 'Insuffisance', tone: 'accent' };
  if (bmi < 25) return { label: 'Normal', tone: 'down' };
  if (bmi < 30) return { label: 'Surpoids', tone: 'ma5' };
  return { label: 'Obésité', tone: 'up' };
};

// Compare la moyenne du mois de `refIso` avec celle du mois précédent.
export const compareMonths = (data, refIso = todayISO()) => {
  const ref = parseISO(refIso);
  const prev = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  const curKey = monthKey(refIso);
  const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  const avg = (key) => {
    const vals = data.filter((d) => monthKey(d.date) === key).map((d) => d.poids);
    return vals.length ? round(vals.reduce((a, b) => a + b, 0) / vals.length, 2) : null;
  };
  const current = avg(curKey);
  const previous = avg(prevKey);
  return {
    current,
    previous,
    delta: current != null && previous != null ? round(current - previous, 2) : null,
    prevMonthIndex: prev.getMonth(),
    curMonthIndex: ref.getMonth(),
  };
};
