import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import colors from '../theme/colors';
import { addEntry, loadEntries, removeLast } from '../storage/store';
import { computeMA5, round } from '../utils/calculations';
import { dateToISO, toDisplay, toLongFR } from '../utils/dates';

const parsePoids = (t) => {
  const v = parseFloat(t.replace(',', '.'));
  return Number.isFinite(v) ? v : null;
};

export default function AddScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [poidsText, setPoidsText] = useState('');
  const [error, setError] = useState(null);

  // Données fraîches + formulaire remis à zéro à chaque arrivée sur l'onglet.
  useFocusEffect(
    useCallback(() => {
      loadEntries().then(setEntries);
      setDate(new Date());
      setPoidsText('');
      setError(null);
    }, []),
  );

  const dateIso = dateToISO(date);
  const poidsNum = useMemo(() => parsePoids(poidsText), [poidsText]);
  const lastEntry = entries[entries.length - 1];

  const isDuplicate = useMemo(() => entries.some((e) => e.date === dateIso), [entries, dateIso]);
  const isInRange = poidsNum != null && poidsNum >= 50 && poidsNum <= 150;
  const canSave = isInRange && !isDuplicate;

  // MA5 simulée si on insérait cette pesée maintenant.
  const previewMA5 = useMemo(() => {
    if (!isInRange) return null;
    const merged = [...entries.filter((e) => e.date !== dateIso), { date: dateIso, poids: poidsNum }]
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    return computeMA5(merged).find((e) => e.date === dateIso)?.ma5 ?? null;
  }, [entries, dateIso, poidsNum, isInRange]);

  const diffVsLast = isInRange && lastEntry && lastEntry.date !== dateIso
    ? round(poidsNum - lastEntry.poids, 1)
    : null;

  // ±0.1 kg, en partant de la dernière pesée si le champ est vide.
  const step = (delta) => {
    const base = poidsNum ?? lastEntry?.poids ?? 75;
    setPoidsText(round(base + delta, 1).toFixed(1));
    setError(null);
    Haptics.selectionAsync();
  };

  const onChangeDate = (_, selected) => {
    setShowPicker(false);
    if (selected) setDate(selected);
  };

  const handleSave = async () => {
    if (!canSave) return;
    try {
      await addEntry({ date: dateIso, poids: round(poidsNum, 1) });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Pesée enregistrée',
        `${toDisplay(dateIso)} → ${poidsNum.toFixed(1)} kg${
          previewMA5 != null ? ` (MA5 : ${previewMA5.toFixed(2)})` : ''
        }`,
        [{ text: 'OK', onPress: () => navigation.navigate('Accueil') }],
      );
    } catch (e) {
      setError(e.message);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleUndo = () => {
    if (!lastEntry) return;
    Alert.alert(
      'Annuler la dernière saisie ?',
      `Supprimer la pesée du ${toDisplay(lastEntry.date)} (${lastEntry.poids.toFixed(1)} kg) ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setEntries(await removeLast());
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Nouvelle pesée</Text>

        <Text style={styles.label}>Date</Text>
        <Pressable style={styles.dateButton} onPress={() => setShowPicker(true)}>
          <Ionicons name="calendar-outline" size={20} color={colors.brut} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={styles.dateText}>{toLongFR(dateIso)}</Text>
            <Text style={styles.dateHint}>Toucher pour changer</Text>
          </View>
        </Pressable>
        {showPicker ? (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={onChangeDate}
          />
        ) : null}

        <Text style={styles.label}>Poids (kg)</Text>
        <View style={styles.inputRow}>
          <Pressable style={styles.stepBtn} onPress={() => step(-0.1)}>
            <Ionicons name="remove" size={26} color={colors.text} />
          </Pressable>
          <TextInput
            value={poidsText}
            onChangeText={(t) => {
              setError(null);
              setPoidsText(t);
            }}
            keyboardType="decimal-pad"
            placeholder={lastEntry ? lastEntry.poids.toFixed(1) : '79.5'}
            placeholderTextColor={colors.textFaint}
            style={styles.input}
          />
          <Pressable style={styles.stepBtn} onPress={() => step(0.1)}>
            <Ionicons name="add" size={26} color={colors.text} />
          </Pressable>
        </View>
        {lastEntry ? (
          <Text style={styles.lastHint}>
            Dernière pesée : {lastEntry.poids.toFixed(1)} kg le {toDisplay(lastEntry.date)}
          </Text>
        ) : null}

        <View style={styles.previewBox}>
          {isDuplicate ? (
            <Text style={styles.previewError}>
              Une pesée existe déjà pour le {toDisplay(dateIso)}. Modifie-la depuis l'Historique.
            </Text>
          ) : poidsNum != null && !isInRange ? (
            <Text style={styles.previewError}>Entre 50 et 150 kg uniquement.</Text>
          ) : isInRange ? (
            <>
              <Text style={styles.previewLabel}>Aperçu</Text>
              <Text style={styles.previewValue}>
                {poidsNum.toFixed(1)} kg
                {previewMA5 != null ? `  •  MA5 ${previewMA5.toFixed(2)}` : ''}
              </Text>
              {diffVsLast != null ? (
                <Text
                  style={[
                    styles.diff,
                    { color: diffVsLast > 0 ? colors.up : diffVsLast < 0 ? colors.down : colors.textDim },
                  ]}
                >
                  {diffVsLast > 0 ? '▲ +' : diffVsLast < 0 ? '▼ ' : '= '}
                  {Math.abs(diffVsLast).toFixed(1)} kg vs dernière pesée
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.previewHint}>Saisis un poids ou utilise − / + pour calculer la MA5.</Text>
          )}
          {error ? <Text style={styles.previewError}>{error}</Text> : null}
        </View>

        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={({ pressed }) => [
            styles.saveBtn,
            !canSave && { opacity: 0.4 },
            pressed && canSave && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.saveText}>Enregistrer</Text>
        </Pressable>

        <Pressable onPress={handleUndo} style={styles.undoBtn} disabled={!lastEntry}>
          <Ionicons name="arrow-undo-outline" size={16} color={colors.up} />
          <Text style={styles.undoText}>Annuler la dernière saisie</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingBottom: 60 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: 8 },
  label: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: { color: colors.text, fontWeight: '700', fontSize: 16, textTransform: 'capitalize' },
  dateHint: { color: colors.textFaint, marginTop: 2, fontSize: 11 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: {
    width: 56,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    marginHorizontal: 10,
    height: 64,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  lastHint: { color: colors.textFaint, fontSize: 12, marginTop: 6, textAlign: 'center' },
  previewBox: {
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
    padding: 14,
    minHeight: 72,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewLabel: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  previewValue: { color: colors.ma5, fontSize: 18, fontWeight: '800', marginTop: 4 },
  diff: { marginTop: 4, fontWeight: '700', fontSize: 13 },
  previewHint: { color: colors.textFaint },
  previewError: { color: colors.up, fontWeight: '700' },
  saveBtn: {
    backgroundColor: colors.brut,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 18,
  },
  saveText: { color: colors.bg, fontWeight: '800', fontSize: 16 },
  undoBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    marginTop: 6,
  },
  undoText: { color: colors.up, fontWeight: '700', marginLeft: 6 },
});
