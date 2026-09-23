import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import colors from '../theme/colors';
import StatCard from '../components/StatCard';
import MA5Badge from '../components/MA5Badge';
import WeightChart from '../components/WeightChart';
import {
  loadEntries, getReference, getHeight, getObjectif, DEFAULT_REFERENCE,
} from '../storage/store';
import {
  computeMA5, computeStats, computeBMI, bmiCategory,
} from '../utils/calculations';
import { toLongFR, todayISO, daysBetween } from '../utils/dates';

export default function HomeScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  const [reference, setRef] = useState(DEFAULT_REFERENCE);
  const [height, setHeightState] = useState(null);
  const [objectif, setObjectif] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    setEntries(computeMA5(await loadEntries()));
    setRef(await getReference());
    setHeightState(await getHeight());
    setObjectif(await getObjectif());
  }, []);

  // Recharge à chaque retour sur l'onglet (après ajout/suppression/réglages).
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const stats = computeStats(entries);
  const last = entries[entries.length - 1];
  const last20 = entries.slice(-20);
  const ma5History = entries.filter((e) => e.ma5 != null).slice(-10);
  const bmi = computeBMI(last?.poids, height);
  const bmiCat = bmiCategory(bmi);
  const weighedToday = last?.date === todayISO();
  const daysSince = last ? daysBetween(last.date, todayISO()) : null;

  const ma5DeltaTone =
    stats.ma5Delta == null ? colors.textDim : stats.ma5Delta > 0 ? colors.up : colors.down;

  const goAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Ajouter');
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
          <Text style={styles.kicker}>{weighedToday ? "AUJOURD'HUI" : 'DERNIÈRE PESÉE'}</Text>
          <Text style={styles.date}>{last ? toLongFR(last.date) : 'Aucune pesée'}</Text>
          <View style={styles.bigRow}>
            <Text style={styles.bigValue}>{last?.poids?.toFixed(1) ?? '—'}</Text>
            <Text style={styles.bigUnit}>kg</Text>
          </View>
        </View>

        {!weighedToday ? (
          <Pressable onPress={goAdd} style={styles.banner}>
            <Ionicons name="scale-outline" size={20} color={colors.accent} />
            <Text style={styles.bannerText}>
              {daysSince != null && daysSince > 1
                ? `Pas de pesée depuis ${daysSince} jours — ajoute celle du jour`
                : "Pas encore de pesée aujourd'hui — touche pour l'ajouter"}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
          </Pressable>
        ) : null}

        <View style={styles.grid}>
          <View style={styles.row}>
            <StatCard
              title="MA5"
              value={stats.ma5Current != null ? stats.ma5Current.toFixed(2) : '—'}
              subtitle="moyenne 5 pesées"
              color={colors.ma5}
            />
            <View style={styles.gap} />
            <StatCard
              title="Δ MA5 (7 pesées)"
              value={
                stats.ma5Delta != null
                  ? `${stats.ma5Delta > 0 ? '+' : ''}${stats.ma5Delta.toFixed(2)}`
                  : '—'
              }
              subtitle="kg"
              color={ma5DeltaTone}
            />
          </View>
          <View style={styles.vgap} />
          <View style={styles.row}>
            <StatCard
              title="Min — Max"
              value={stats.min != null ? `${stats.min.toFixed(1)} – ${stats.max.toFixed(1)}` : '—'}
              subtitle={`${stats.count} pesées`}
              color={colors.accent}
            />
            <View style={styles.gap} />
            {bmi != null ? (
              <StatCard
                title="IMC"
                value={bmi.toFixed(1)}
                subtitle={bmiCat.label}
                color={colors[bmiCat.tone]}
              />
            ) : objectif != null && stats.current != null ? (
              <StatCard
                title="Objectif"
                value={`${Math.abs(stats.current - objectif).toFixed(1)}`}
                subtitle={`kg restants → ${objectif}`}
                color={colors.brut}
              />
            ) : (
              <StatCard
                title="IMC"
                value="—"
                subtitle="Taille dans Réglages"
                color={colors.textDim}
              />
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>20 dernières pesées</Text>
          <WeightChart data={last20} referenceLine={reference} objectif={objectif} compact />
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

      <Pressable style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]} onPress={goAdd}>
        <Ionicons name="add" size={32} color={colors.bg} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16 },
  header: { marginBottom: 14 },
  kicker: { color: colors.textDim, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  date: { color: colors.text, fontSize: 14, marginTop: 2, textTransform: 'capitalize' },
  bigRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 },
  bigValue: { color: colors.text, fontSize: 56, fontWeight: '800', letterSpacing: -1 },
  bigUnit: { color: colors.textDim, fontSize: 18, marginLeft: 8, marginBottom: 12, fontWeight: '700' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: 12,
    marginBottom: 16,
  },
  bannerText: { color: colors.text, flex: 1, marginHorizontal: 10, fontWeight: '600', fontSize: 13 },
  grid: { marginBottom: 18 },
  row: { flexDirection: 'row' },
  gap: { width: 12 },
  vgap: { height: 12 },
  section: { marginBottom: 18 },
  sectionTitle: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
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
  },
});
