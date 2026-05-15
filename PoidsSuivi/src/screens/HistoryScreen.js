import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';

import colors from '../theme/colors';
import {
  loadEntries, removeEntry, getObjectif, setObjectif,
} from '../storage/store';
import {
  computeMA5, computeStats, computeStreak, computeRegularity,
  computeTrend, phaseLabel, trendVerb, estimateGoalDate,
} from '../utils/calculations';
import { toDisplay, toLongFR } from '../utils/dates';

export default function HistoryScreen() {
  const [entries, setEntries] = useState([]);
  const [goalText, setGoalText] = useState('');
  const [goal, setGoal] = useState(null);

  const reload = useCallback(async () => {
    const data = await loadEntries();
    const withMA = computeMA5(data);
    setEntries(withMA);
    const g = await getObjectif();
    setGoal(g);
    setGoalText(g != null ? String(g) : '');
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const stats = useMemo(() => computeStats(entries), [entries]);
  const trend7 = useMemo(() => computeTrend(entries, 7), [entries]);
  const trend30 = useMemo(() => computeTrend(entries, 30), [entries]);
  const phase = useMemo(() => phaseLabel(trend7.slopePerWeek), [trend7]);
  const streak = useMemo(() => computeStreak(entries), [entries]);
  const reg = useMemo(() => computeRegularity(entries), [entries]);
  const goalDate = useMemo(
    () => estimateGoalDate(stats.current, goal, trend30.slopePerDay),
    [stats.current, goal, trend30.slopePerDay],
  );

  const handleSaveGoal = async () => {
    const v = parseFloat(goalText.replace(',', '.'));
    if (Number.isFinite(v) && v >= 30 && v <= 200) {
      await setObjectif(v);
      setGoal(v);
      Haptics.selectionAsync();
    } else if (goalText === '') {
      await setObjectif(null);
      setGoal(null);
    } else {
      Alert.alert('Objectif invalide', 'Saisis une valeur entre 30 et 200 kg.');
    }
  };

  const handleDelete = (dateIso) => {
    Alert.alert(
      'Supprimer la pesée ?',
      `Pesée du ${toDisplay(dateIso)}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await removeEntry(dateIso);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            reload();
          },
        },
      ],
    );
  };

  const handleExport = async () => {
    const csv = ['date,poids,ma5']
      .concat(
        entries.map(
          (e) => `${e.date},${e.poids},${e.ma5 != null ? e.ma5.toFixed(2) : ''}`,
        ),
      )
      .join('\n');
    const fileUri = `${FileSystem.cacheDirectory}poids-suivi-${Date.now()}.csv`;
    await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Exporter les pesées',
      });
    } else {
      Alert.alert('Partage indisponible', `Fichier écrit : ${fileUri}`);
    }
  };

  const reversed = useMemo(() => [...entries].reverse(), [entries]);

  // Phrase synthétique
  const slope = trend7.slopePerWeek;
  const sentence =
    Math.abs(slope) < 0.01
      ? 'Ton poids est très stable cette semaine.'
      : `Tu ${trendVerb(slope)} en moyenne ${Math.abs(slope).toFixed(2)} kg/semaine.`;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <FlatList
          data={reversed}
          keyExtractor={(item) => item.date}
          ListHeaderComponent={
            <View>
              <Text style={styles.title}>Historique</Text>

              {/* Tendance */}
              <View style={styles.trendCard}>
                <View style={styles.trendRow}>
                  <Stat title="7 jours" value={`${fmtSlope(trend7.slopePerWeek)} kg/sem`} tone={tone(trend7.slopePerWeek)} />
                  <Stat title="30 jours" value={`${fmtSlope(trend30.slopePerWeek)} kg/sem`} tone={tone(trend30.slopePerWeek)} />
                  <Stat title="Phase" value={`${phase.icon} ${phase.label}`} tone={phase.tone} />
                </View>
                <Text style={styles.sentence}>{sentence}</Text>
              </View>

              {/* Régularité */}
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

              {/* Objectif */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Objectif</Text>
                <View style={styles.goalRow}>
                  <TextInput
                    value={goalText}
                    onChangeText={setGoalText}
                    onBlur={handleSaveGoal}
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
                      {goalDate
                        ? `Estimé le ${toLongFR(goalDate)}`
                        : 'Non atteignable au rythme actuel.'}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.muted}>Définis un objectif pour suivre la progression.</Text>
                )}
              </View>

              <Pressable style={styles.exportBtn} onPress={handleExport}>
                <Text style={styles.exportBtnText}>📤  Exporter en CSV</Text>
              </Pressable>

              <Text style={styles.listTitle}>{entries.length} pesées</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const prev = reversed[index + 1];
            const delta = prev ? item.poids - prev.poids : null;
            return (
              <Swipeable
                renderRightActions={() => (
                  <Pressable style={styles.swipeAction} onPress={() => handleDelete(item.date)}>
                    <Text style={styles.swipeActionText}>Supprimer</Text>
                  </Pressable>
                )}
              >
                <View style={styles.row}>
                  <Text style={styles.rowDate}>{toDisplay(item.date)}</Text>
                  <Text style={styles.rowPoids}>{item.poids.toFixed(1)} kg</Text>
                  <Text
                    style={[
                      styles.rowDelta,
                      {
                        color:
                          delta == null
                            ? colors.textFaint
                            : delta > 0
                            ? colors.up
                            : delta < 0
                            ? colors.down
                            : colors.textDim,
                      },
                    ]}
                  >
                    {delta == null
                      ? ''
                      : `${delta > 0 ? '▲ +' : delta < 0 ? '▼ ' : '· '}${Math.abs(delta).toFixed(1)}`}
                  </Text>
                  <Text style={styles.rowMa5}>
                    {item.ma5 != null ? `MA5 ${item.ma5.toFixed(2)}` : ''}
                  </Text>
                </View>
              </Swipeable>
            );
          }}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

function Stat({ title, value, tone }) {
  const color =
    tone === 'up' ? colors.up : tone === 'down' ? colors.down : colors.text;
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
  trendCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  trendRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statTitle: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  sentence: { color: colors.text, fontSize: 13, fontStyle: 'italic' },
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
  regRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  regBig: { color: colors.accent, fontSize: 32, fontWeight: '800' },
  regLabel: { color: colors.text, fontSize: 14, marginLeft: 4 },
  barBg: {
    height: 8,
    backgroundColor: colors.cardAlt,
    borderRadius: 4,
    overflow: 'hidden',
  },
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
  goalBtn: {
    backgroundColor: colors.brut,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  goalBtnText: { color: colors.bg, fontWeight: '800' },
  goalRemain: { color: colors.text, fontSize: 14, marginTop: 4 },
  goalEta: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  muted: { color: colors.textFaint, fontSize: 12 },
  exportBtn: {
    backgroundColor: colors.cardAlt,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exportBtnText: { color: colors.text, fontWeight: '700' },
  listTitle: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
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
  swipeActionText: { color: colors.bg, fontWeight: '800' },
});
