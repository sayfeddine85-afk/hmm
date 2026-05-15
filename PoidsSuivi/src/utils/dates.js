// Helpers de date — stockage interne ISO (YYYY-MM-DD), affichage DD/MM.

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

const DAYS_FR = [
  'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi',
];

const pad = (n) => (n < 10 ? `0${n}` : `${n}`);

// "08/03" + 2026 → "2026-03-08"
export const toISO = (ddmm, year = 2026) => {
  const [dd, mm] = ddmm.split('/').map((s) => parseInt(s, 10));
  return `${year}-${pad(mm)}-${pad(dd)}`;
};

// "2026-03-08" → "08/03"
export const toDisplay = (iso) => {
  if (!iso) return '';
  const [, mm, dd] = iso.split('-');
  return `${dd}/${mm}`;
};

// "2026-03-08" → "samedi 8 mars 2026"
export const toLongFR = (iso) => {
  const d = parseISO(iso);
  return `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
};

export const parseISO = (iso) => {
  const [y, m, d] = iso.split('-').map((s) => parseInt(s, 10));
  return new Date(y, m - 1, d);
};

export const dateToISO = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const todayISO = () => dateToISO(new Date());

// Différence en jours calendaires entre deux dates ISO.
export const daysBetween = (isoA, isoB) => {
  const a = parseISO(isoA).getTime();
  const b = parseISO(isoB).getTime();
  return Math.round((b - a) / 86400000);
};

export const sortByDateAsc = (entries) =>
  [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

export const sortByDateDesc = (entries) =>
  [...entries].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

// Ajoute n jours à une date ISO et retourne une nouvelle ISO.
export const addDaysISO = (iso, n) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return dateToISO(d);
};

// Renvoie le nombre de jours dans le mois d'une ISO donnée.
export const daysInMonthOf = (iso) => {
  const d = parseISO(iso);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
};

// "2026-05-15" → "2026-05"
export const monthKey = (iso) => iso.slice(0, 7);
