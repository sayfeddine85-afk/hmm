import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Switch, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import colors from '../theme/colors';
import WeightChart from '../components/WeightChart';
import { loadEntries, getReference, getObjectif } from '../storage/store';
import { computeMA5 } from '../utils/calculations';

const RANGES = [
  { key: '7', label: '7 j' },
  { key: '30', label: '30 j' },
  { key: '90', label: '3 mois' },
  { key: 'all', label: 'Tout' },
];

export default function ChartScreen() {
  const [entries, setEntries] = useState([]);
  const [reference, setReference] = useState(79.5);
  const [objectif, setObjectif] = useState(null);
  const [range, setRange] = useState('30');
  const [onlyPeaks, setOnlyPeaks] = useState(false);

  const reload = useCallback(async () => {
    const data = await loadEntries();
    setEntries(computeMA5(data));
    setReference(await getReference());
    setObjectif(await getObjectif());
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Graphique</Text>

        <View style={styles.segments}>
          {RANGES.map((r) => {
            const active = r.key === range;
            return (
              <Pressable
                key={r.key}
                onPress={() => setRange(r.key)}
                style={[styles.segment, active && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {r.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.chartWrap}>
          <WeightChart
            data={entries}
            referenceLine={reference}
            objectif={objectif}
            range={range}
            height={420}
            onlyPeaks={onlyPeaks}
          />
        </View>

        <View style={styles.legend}>
          <Legend color={colors.brut} label="Poids brut" />
          <Legend color={colors.ma5} label="MA5" />
          {objectif != null ? <Legend color={colors.accent} label={`Objectif (${objectif} kg)`} /> : null}
          <Legend color={colors.reference} label={`Réf. (${reference} kg)`} />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Marquer uniquement les pics</Text>
          <Switch
            value={onlyPeaks}
            onValueChange={setOnlyPeaks}
            trackColor={{ false: colors.border, true: colors.up }}
            thumbColor={colors.text}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Legend({ color, label }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 16, paddingBottom: 60 },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
  },
  segments: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: { backgroundColor: colors.brut },
  segmentText: { color: colors.textDim, fontWeight: '700', fontSize: 13 },
  segmentTextActive: { color: colors.bg },
  chartWrap: { marginTop: 16 },
  legend: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  toggleRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleLabel: { color: colors.text, flex: 1, fontWeight: '600' },
});
