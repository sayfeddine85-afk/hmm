// AsyncStorage helpers + données initiales.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { sortByDateAsc, toISO } from '../utils/dates';

const KEY_DATA = 'poids-data';
const KEY_GOAL = 'poids-objectif';
const KEY_REF = 'poids-reference';
const DEFAULT_REF = 79.5;

// 53 pesées historiques (08/03 → 15/05/2026), converties une fois en ISO.
const RAW_INITIAL = [
  ['08/03', 79.0], ['09/03', 78.3], ['11/03', 78.6], ['12/03', 78.1], ['13/03', 78.3],
  ['15/03', 78.5], ['16/03', 78.5], ['17/03', 78.5], ['18/03', 78.4], ['19/03', 78.1],
  ['20/03', 78.0], ['21/03', 78.0], ['22/03', 79.1], ['23/03', 80.0], ['24/03', 79.3],
  ['25/03', 79.3], ['26/03', 79.6], ['27/03', 79.4], ['28/03', 79.4], ['29/03', 79.2],
  ['31/03', 79.5], ['01/04', 79.8], ['02/04', 80.4], ['08/04', 80.6], ['09/04', 80.0],
  ['10/04', 79.5], ['11/04', 79.5], ['12/04', 78.9], ['13/04', 79.5], ['14/04', 80.1],
  ['15/04', 81.5], ['16/04', 80.1], ['17/04', 79.3], ['18/04', 79.3], ['19/04', 78.5],
  ['20/04', 80.2], ['22/04', 79.5], ['23/04', 80.2], ['24/04', 79.0], ['25/04', 79.8],
  ['26/04', 80.9], ['27/04', 80.5], ['28/04', 80.3], ['30/04', 79.2], ['01/05', 79.0],
  ['02/05', 79.4], ['04/05', 81.8], ['05/05', 80.5], ['06/05', 80.5], ['07/05', 80.0],
  ['08/05', 80.4], ['14/05', 79.8], ['15/05', 81.2],
];

export const INITIAL_DATA = RAW_INITIAL.map(([dd, p]) => ({ date: toISO(dd, 2026), poids: p }));

export const loadEntries = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEY_DATA);
    if (!raw) return INITIAL_DATA;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return INITIAL_DATA;
    // On garde le jeu le plus complet pour ne jamais perdre de saisies utilisateur.
    const chosen = parsed.length >= INITIAL_DATA.length ? parsed : INITIAL_DATA;
    return sortByDateAsc(chosen);
  } catch {
    return INITIAL_DATA;
  }
};

export const saveEntries = async (entries) => {
  const sorted = sortByDateAsc(entries);
  await AsyncStorage.setItem(KEY_DATA, JSON.stringify(sorted));
  return sorted;
};

export const seedIfNeeded = async () => {
  const raw = await AsyncStorage.getItem(KEY_DATA);
  if (!raw) {
    await AsyncStorage.setItem(KEY_DATA, JSON.stringify(INITIAL_DATA));
  }
};

export const addEntry = async (entry) => {
  const current = await loadEntries();
  if (current.some((e) => e.date === entry.date)) {
    throw new Error('Une pesée existe déjà pour cette date.');
  }
  return saveEntries([...current, entry]);
};

export const removeEntry = async (dateIso) => {
  const current = await loadEntries();
  return saveEntries(current.filter((e) => e.date !== dateIso));
};

export const removeLast = async () => {
  const current = await loadEntries();
  if (current.length === 0) return current;
  return saveEntries(current.slice(0, -1));
};

export const getObjectif = async () => {
  const raw = await AsyncStorage.getItem(KEY_GOAL);
  return raw ? parseFloat(raw) : null;
};

export const setObjectif = async (value) => {
  if (value == null || value === '') {
    await AsyncStorage.removeItem(KEY_GOAL);
    return null;
  }
  await AsyncStorage.setItem(KEY_GOAL, String(value));
  return value;
};

export const getReference = async () => {
  const raw = await AsyncStorage.getItem(KEY_REF);
  return raw ? parseFloat(raw) : DEFAULT_REF;
};

export const setReference = async (value) => {
  await AsyncStorage.setItem(KEY_REF, String(value));
  return value;
};

export const DEFAULT_REFERENCE = DEFAULT_REF;
