import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import colors from '../theme/colors';
import StatCard from '../components/StatCard';
import MA5Badge from '../components/MA5Badge';
import WeightChart from '../components/WeightChart';
import {
  loadEntries, getReference, setReference, DEFAULT_REFERENCE,
} from '../storage/store';
import { computeMA5, computeStats, round } from '../utils/calculations';
import { toDisplay, toLongFR } from '../utils/dates';

export default function HomeScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  const [reference, setRef] = useState(DEFAULT_REFERENCE);
  const [refInput, setRefInput] = useState(String(DEFAULT_REFERENCE));
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    const data = await loadEntries();
    const ref = await getReference();
    setEntries(computeMA5(data));
    setRef(ref);
    setRefInput(String(ref));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Recharge à chaque retour sur l'onglet (après ajout/suppression).
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const stats = computeStats(entries);
  const last = entries[entries.length - 1];
  const last20 = entries.slice(-20);
  const ma5History = entries.filter((e) => e.ma5 != null).slice(-10);

  const ma5DeltaTone =
    stats.ma5Delta == null ? colors.textDim : stats.ma5Delta > 0 ? colors.up : colors.down;

  const commitReference = async () => {
    const v = parseFloat(refInput.replace(',', '.'));
    if (!Number.isNaN(v) && v >= 30 && v <= 200) {
      await setReference(v);
      setRef(v);
      Haptics.selectionAsync();
    } else {
      setRefInput(String(reference));
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>Aujourd'hui</Text>
          <Text style={styles.date}>{last ? toLongFR(last.date) : ''}</Text>
          <View style={styles.bigRow}>
            <Text style={styles.bigValue}>{last?.poids?.toFixed(1) ?? '—'}</Text>
            <Text style={styles.bigUnit}>kg</Text>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.row}>
            <StatCard
              title="Poids actuel"
              icon="⚖️"
              value={stats.current != null ? `${stats.current.toFixed(1)}` : '—'}
              subtitle="kg"
              color={colors.brut}
            />
            <View style={{ width: 12 }} />
            <StatCard
              title="MA5"
              icon="📊"
              value={stats.ma5Current != null ? stats.ma5Current.toFixed(2) : '—'}
              subtitle="moyenne 5 entrées"
              color={colors.ma5}
            />
          </View>
          <View style={{ height: 12 }} />
          <View style={styles.row}>
            <StatCard
              title="Δ MA5 (vs J-7)"
              icon="📈"
              value={
                stats.ma5Delta != null
                  ? `${stats.ma5Delta > 0 ? '+' : ''}${stats.ma5Delta.toFixed(2)}`
                  : '—'
              }
              subtitle="kg sur la fenêtre"
              color={ma5DeltaTone}
            />
            <View style={{ width: 12 }} />
            <StatCard
              title="Min — Max"
              icon="🎯"
              value={
                stats.min != null
                  ? `${stats.min.toFixed(1)} – ${stats.max.toFixed(1)}`
                  : '—'
              }
              subtitle={`${stats.count} pesées`}
              color={colors.accent}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>20 dernières pesées</Text>
          <WeightChart
            data={last20}
            referenceLine={reference}
            compact
            range="all"
          />
        </View>

        <View style={styles.refRow}>
          <Text style={styles.refLabel}>Référence</Text>
          <TextInput
            value={refInput}
            onChangeText={setRefInput}
            onBlur={commitReference}
            keyboardType="decimal-pad"
            style={styles.refInput}
            placeholder="79.5"
            placeholderTextColor={colors.textFaint}
          />
          <Text style={styles.refUnit}>kg</Text>
          <Pressable onPress={commitReference} style={styles.refBtn}>
            <Text style={styles.refBtnText}>OK</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historique MA5</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {ma5History.map((e, i) => (
              <MA5Badge key={e.date} entry={e} prev={ma5History[i - 1]} />
            ))}
          </ScrollView>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <Pressable
        style={styles.fab}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          navigation.navigate('Ajouter');
        }}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16 },
  header: { marginBottom: 18 },
  kicker: { color: colors.textDim, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  date: { color: colors.text, fontSize: 14, marginTop: 2, textTransform: 'capitalize' },
  bigRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 },
  bigValue: { color: colors.text, fontSize: 56, fontWeight: '800', letterSpacing: -1 },
  bigUnit: { color: colors.textDim, fontSize: 18, marginLeft: 8, marginBottom: 12, fontWeight: '700' },
  grid: { marginBottom: 18 },
  row: { flexDirection: 'row' },
  section: { marginBottom: 18 },
  sectionTitle: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  refLabel: { color: colors.text, fontWeight: '700', flex: 1 },
  refInput: {
    color: colors.text,
    backgroundColor: colors.cardAlt,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 70,
    textAlign: 'right',
    fontWeight: '700',
  },
  refUnit: { color: colors.textDim, marginHorizontal: 8 },
  refBtn: {
    backgroundColor: colors.brut,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refBtnText: { color: colors.bg, fontWeight: '800' },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.brut,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  fabText: { color: colors.bg, fontSize: 32, fontWeight: '800', marginTop: -2 },
});
