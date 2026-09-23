import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import colors from '../theme/colors';
import {
  loadEntries, removeEntry, restoreEntry, updateEntry, getObjectif, setObjectif,
} from '../storage/store';
import {
  computeMA5, computeStats, computeStreak, computeRegularity, compareMonths,
  computeTrend, phaseLabel, trendVerb, estimateGoalDate, round,
} from '../utils/calculations';
import { toDisplay, toLongFR, monthNameFR } from '../utils/dates';
import { exportEntriesCSV } from '../utils/files';

const UNDO_MS = 5000;

export default function HistoryScreen() {
  const [entries, setEntries] = useState([]);
  const [goalText, setGoalText] = useState('');
  const [goal, setGoal] = useState(null);
  const [deleted, setDeleted] = useState(null);
  const [editing, setEditing] = useState(null);
  const undoTimer = useRef(null);

  const reload = useCallback(async () => {
    setEntries(computeMA5(await loadEntries()));
    const g = await getObjectif();
    setGoal(g);
    setGoalText(g != null ? String(g) : '');
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  useEffect(() => () => clearTimeout(undoTimer.current), []);

  const stats = useMemo(() => computeStats(entries), [entries]);
  const trend7 = useMemo(() => computeTrend(entries, 7), [entries]);
  const trend30 = useMemo(() => computeTrend(entries, 30), [entries]);
  const phase = useMemo(() => phaseLabel(trend7.slopePerWeek), [trend7]);
  const streak = useMemo(() => computeStreak(entries), [entries]);
  const reg = useMemo(() => computeRegularity(entries), [entries]);
  const months = useMemo(() => compareMonths(entries), [entries]);
  const goalDate = useMemo(
    () => estimateGoalDate(stats.current, goal, trend30.slopePerDay),
    [stats.current, goal, trend30.slopePerDay],
  );
  const reversed = useMemo(() => [...entries].reverse(), [entries]);

  const handleSaveGoal = async () => {
    if (goalText.trim() === '') {
      await setObjectif(null);
      setGoal(null);
      return;
    }
    const v = parseFloat(goalText.replace(',', '.'));
    if (Number.isFinite(v) && v >= 30 && v <= 200) {
      await setObjectif(v);
      setGoal(v);
      Haptics.selectionAsync();
    } else {
      Alert.alert('Objectif invalide', 'Saisis une valeur entre 30 et 200 kg.');
    }
  };

  // Suppression immédiate + barre « Annuler » pendant 5 s.
  const handleDelete = async (entry) => {
    await removeEntry(entry.date);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setDeleted(entry);
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setDeleted(null), UNDO_MS);
    reload();
  };

  const handleUndo = async () => {
    if (!deleted) return;
    clearTimeout(undoTimer.current);
    await restoreEntry(deleted);
    setDeleted(null);
    Haptics.selectionAsync();
    reload();
  };

  const handleEditSave = async (poids) => {
    await updateEntry(editing.date, poids);
    setEditing(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    reload();
  };

  const slope = trend7.slopePerWeek;
  const sentence =
    Math.abs(slope) < 0.01
      ? 'Ton poids est très stable cette semaine.'
      : `Tu ${trendVerb(slope)} en moyenne ${Math.abs(slope).toFixed(2)} kg/semaine.`;

  const header = (
    <View>
      <Text style={styles.title}>Historique</Text>

      <View style={styles.card}>
        <View style={styles.trendRow}>
          <Stat title="7 jours" value={`${fmtSlope(trend7.slopePerWeek)} kg/sem`} tone={tone(trend7.slopePerWeek)} />
          <Stat title="30 jours" value={`${fmtSlope(trend30.slopePerWeek)} kg/sem`} tone={tone(trend30.slopePerWeek)} />
          <Stat title="Phase" value={`${phase.icon} ${phase.label}`} tone={phase.tone} />
        </View>
        <Text style={styles.sentence}>{sentence}</Text>
      </View>

      {months.current != null || months.previous != null ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Comparaison mensuelle</Text>
          <View style={styles.trendRow}>
            <Stat
              title={monthNameFR(months.prevMonthIndex)}
              value={months.previous != null ? `${months.previous.toFixed(1)} kg` : '—'}
            />
            <Stat
              title={monthNameFR(months.curMonthIndex)}
              value={months.current != null ? `${months.current.toFixed(1)} kg` : '—'}
            />
            <Stat
              title="Écart"
              value={months.delta != null ? `${months.delta > 0 ? '+' : ''}${months.delta.toFixed(2)} kg` : '—'}
              tone={months.delta == null ? 'neutral' : tone(months.delta * 10)}
            />
          </View>
          <Text style={styles.muted}>Moyenne des pesées de chaque mois.</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Régularité</Text>
        <View style={styles.regRow}>
          <Text style={styles.regBig}>{streak}</Text>
          <Text style={styles.regLabel}> jour{streak > 1 ? 's' : ''} consécutif{streak > 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${reg.ratio * 100}%` }]} />
        </View>
        <Text style={styles.barLabel}>
          {reg.count} pesée{reg.count > 1 ? 's' : ''} sur {reg.total} jours ce mois
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Objectif</Text>
        <View style={styles.goalRow}>
          <TextInput
            value={goalText}
            onChangeText={setGoalText}
            onBlur={handleSaveGoal}
            onSubmitEditing={handleSaveGoal}
            placeholder="—"
            placeholderTextColor={colors.textFaint}
            keyboardType="decimal-pad"
            style={styles.goalInput}
          />
          <Text style={styles.goalUnit}>kg</Text>
          <Pressable style={styles.goalBtn} onPress={handleSaveGoal}>
            <Text style={styles.goalBtnText}>OK</Text>
          </Pressable>
        </View>
        {goal != null && stats.current != null ? (
          <>
            <Text style={styles.goalRemain}>
              Reste à {goal < stats.current ? 'perdre' : 'prendre'} :{' '}
              <Text style={{ color: colors.accent, fontWeight: '800' }}>
                {Math.abs(goal - stats.current).toFixed(1)} kg
              </Text>
            </Text>
            <Text style={styles.goalEta}>
              {goalDate ? `Estimé le ${toLongFR(goalDate)}` : 'Non atteignable au rythme actuel (30 j).'}
            </Text>
          </>
        ) : (
          <Text style={styles.muted}>Définis un objectif pour suivre la progression.</Text>
        )}
      </View>

      <Pressable style={styles.exportBtn} onPress={() => exportEntriesCSV(entries)}>
        <Ionicons name="share-outline" size={18} color={colors.text} />
        <Text style={styles.exportBtnText}>Exporter en CSV</Text>
      </Pressable>

      <Text style={styles.listTitle}>
        {entries.length} pesées · touche pour modifier, glisse pour supprimer
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={reversed}
        keyExtractor={(item) => item.date}
        ListHeaderComponent={header}
        renderItem={({ item, index }) => (
          <HistoryRow
            item={item}
            prev={reversed[index + 1]}
            onEdit={() => setEditing(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        keyboardShouldPersistTaps="handled"
      />

      {deleted ? (
        <View style={styles.snackbar}>
          <Text style={styles.snackText}>
            Pesée du {toDisplay(deleted.date)} supprimée
          </Text>
          <Pressable onPress={handleUndo} hitSlop={10}>
            <Text style={styles.snackAction}>ANNULER</Text>
          </Pressable>
        </View>
      ) : null}

      <EditModal entry={editing} onCancel={() => setEditing(null)} onSave={handleEditSave} />
    </SafeAreaView>
  );
}

function HistoryRow({ item, prev, onEdit, onDelete }) {
  const swipeRef = useRef(null);
  const delta = prev ? round(item.poids - prev.poids, 1) : null;
  const deltaColor =
    delta == null ? colors.textFaint : delta > 0 ? colors.up : delta < 0 ? colors.down : colors.textDim;
  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={() => (
        <Pressable
          style={styles.swipeAction}
          onPress={() => {
            swipeRef.current?.close();
            onDelete();
          }}
        >
          <Ionicons name="trash-outline" size={20} color={colors.bg} />
          <Text style={styles.swipeActionText}>Supprimer</Text>
        </Pressable>
      )}
    >
      <Pressable onPress={onEdit} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
        <Text style={styles.rowDate}>{toDisplay(item.date)}</Text>
        <Text style={styles.rowPoids}>{item.poids.toFixed(1)} kg</Text>
        <Text style={[styles.rowDelta, { color: deltaColor }]}>
          {delta == null ? '' : `${delta > 0 ? '▲ +' : delta < 0 ? '▼ ' : '· '}${Math.abs(delta).toFixed(1)}`}
        </Text>
        <Text style={styles.rowMa5}>{item.ma5 != null ? `MA5 ${item.ma5.toFixed(2)}` : ''}</Text>
      </Pressable>
    </Swipeable>
  );
}

function EditModal({ entry, onCancel, onSave }) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (entry) setText(entry.poids.toFixed(1));
  }, [entry]);

  const value = parseFloat(text.replace(',', '.'));
  const valid = Number.isFinite(value) && value >= 50 && value <= 150;

  return (
    <Modal visible={!!entry} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>
            Modifier la pesée{entry ? ` du ${toDisplay(entry.date)}` : ''}
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            keyboardType="decimal-pad"
            autoFocus
            selectTextOnFocus
            style={styles.modalInput}
          />
          {!valid ? <Text style={styles.modalError}>Entre 50 et 150 kg.</Text> : null}
          <View style={styles.modalButtons}>
            <Pressable onPress={onCancel} style={styles.modalBtn}>
              <Text style={styles.modalCancel}>Annuler</Text>
            </Pressable>
            <Pressable
              onPress={() => valid && onSave(round(value, 1))}
              disabled={!valid}
              style={[styles.modalBtn, styles.modalSave, !valid && { opacity: 0.4 }]}
            >
              <Text style={styles.modalSaveText}>Enregistrer</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Stat({ title, value, tone: t }) {
  const color = t === 'up' ? colors.up : t === 'down' ? colors.down : colors.text;
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const fmtSlope = (s) => `${s > 0 ? '+' : ''}${s.toFixed(2)}`;
const tone = (s) => (s > 0.1 ? 'up' : s < -0.1 ? 'down' : 'neutral');

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: 16 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    color: colors.textDim,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  trendRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  statTitle: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  sentence: { color: colors.text, fontSize: 13, fontStyle: 'italic' },
  regRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  regBig: { color: colors.accent, fontSize: 32, fontWeight: '800' },
  regLabel: { color: colors.text, fontSize: 14, marginLeft: 4 },
  barBg: { height: 8, backgroundColor: colors.cardAlt, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: colors.down, borderRadius: 4 },
  barLabel: { color: colors.textDim, fontSize: 11, marginTop: 6 },
  goalRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  goalInput: {
    flex: 1,
    backgroundColor: colors.cardAlt,
    color: colors.text,
    padding: 10,
    borderRadius: 8,
    fontWeight: '700',
    fontSize: 18,
    textAlign: 'right',
  },
  goalUnit: { color: colors.textDim, marginHorizontal: 8 },
  goalBtn: { backgroundColor: colors.brut, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  goalBtnText: { color: colors.bg, fontWeight: '800' },
  goalRemain: { color: colors.text, fontSize: 14, marginTop: 4 },
  goalEta: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  muted: { color: colors.textFaint, fontSize: 12 },
  exportBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exportBtnText: { color: colors.text, fontWeight: '700', marginLeft: 8 },
  listTitle: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowDate: { color: colors.textDim, fontWeight: '700', width: 56 },
  rowPoids: { color: colors.text, fontWeight: '800', fontSize: 16, width: 80 },
  rowDelta: { fontWeight: '700', width: 70 },
  rowMa5: { color: colors.ma5, marginLeft: 'auto', fontWeight: '700', fontSize: 12 },
  swipeAction: {
    backgroundColor: colors.up,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    marginBottom: 6,
    borderRadius: 10,
  },
  swipeActionText: { color: colors.bg, fontWeight: '800', fontSize: 12, marginTop: 2 },
  snackbar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 8,
  },
  snackText: { color: colors.text, flex: 1, fontWeight: '600' },
  snackAction: { color: colors.brut, fontWeight: '800', marginLeft: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 14 },
  modalInput: {
    backgroundColor: colors.cardAlt,
    color: colors.text,
    borderRadius: 12,
    padding: 14,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalError: { color: colors.up, marginTop: 8, fontWeight: '600' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, marginLeft: 8 },
  modalCancel: { color: colors.textDim, fontWeight: '700' },
  modalSave: { backgroundColor: colors.brut },
  modalSaveText: { color: colors.bg, fontWeight: '800' },
});
