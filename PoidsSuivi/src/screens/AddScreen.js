import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';

import colors from '../theme/colors';
import { addEntry, loadEntries, removeLast } from '../storage/store';
import { computeMA5, round } from '../utils/calculations';
import { dateToISO, toDisplay, toLongFR, parseISO } from '../utils/dates';

export default function AddScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [poidsText, setPoidsText] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    loadEntries().then(setEntries);
  }, []);

  const dateIso = dateToISO(date);
  const poidsNum = useMemo(() => {
    const v = parseFloat(poidsText.replace(',', '.'));
    return Number.isFinite(v) ? v : null;
  }, [poidsText]);

  const isDuplicate = useMemo(
    () => entries.some((e) => e.date === dateIso),
    [entries, dateIso],
  );
  const isInRange = poidsNum != null && poidsNum >= 50 && poidsNum <= 150;
  const canSave = isInRange && !isDuplicate;

  // MA5 simulée si on insérait cette pesée maintenant.
  const previewMA5 = useMemo(() => {
    if (!isInRange) return null;
    const merged = [...entries.filter((e) => e.date !== dateIso), { date: dateIso, poids: poidsNum }]
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    const withMA = computeMA5(merged);
    const inserted = withMA.find((e) => e.date === dateIso);
    return inserted?.ma5 ?? null;
  }, [entries, dateIso, poidsNum, isInRange]);

  const onChangeDate = (_, selected) => {
    setShowPicker(Platform.OS === 'ios');
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
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      setError(e.message);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleUndo = async () => {
    if (entries.length === 0) return;
    Alert.alert(
      'Annuler la dernière saisie ?',
      `Supprimer la pesée du ${toDisplay(entries[entries.length - 1].date)} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await removeLast();
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setEntries(await loadEntries());
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>Nouvelle pesée</Text>

        <Text style={styles.label}>Date</Text>
        <Pressable style={styles.dateButton} onPress={() => setShowPicker(true)}>
          <Text style={styles.dateText}>{toLongFR(dateIso)}</Text>
          <Text style={styles.dateHint}>Toucher pour changer</Text>
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
        <TextInput
          value={poidsText}
          onChangeText={(t) => {
            setError(null);
            setPoidsText(t);
          }}
          keyboardType="decimal-pad"
          placeholder="79.5"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
        />

        <View style={styles.previewBox}>
          {isDuplicate ? (
            <Text style={styles.previewError}>
              ⚠️ Une pesée existe déjà pour le {toDisplay(dateIso)}.
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
            </>
          ) : (
            <Text style={styles.previewHint}>Saisis un poids pour calculer la MA5.</Text>
          )}
          {error ? <Text style={styles.previewError}>{error}</Text> : null}
        </View>

        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={[styles.saveBtn, !canSave && { opacity: 0.4 }]}
        >
          <Text style={styles.saveText}>Enregistrer</Text>
        </Pressable>

        <Pressable onPress={handleUndo} style={styles.undoBtn}>
          <Text style={styles.undoText}>Annuler la dernière saisie</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, gap: 8 },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
  },
  label: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dateButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
    textTransform: 'capitalize',
  },
  dateHint: {
    color: colors.textFaint,
    marginTop: 2,
    fontSize: 11,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'right',
  },
  previewBox: {
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
    padding: 14,
    minHeight: 64,
    marginTop: 12,
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
  previewValue: {
    color: colors.ma5,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
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
    padding: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  undoText: {
    color: colors.up,
    fontWeight: '700',
  },
});
