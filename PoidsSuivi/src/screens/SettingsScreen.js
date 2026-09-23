import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, Pressable, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';

import colors from '../theme/colors';
import {
  loadEntries, importEntries, getReference, setReference,
  getHeight, setHeight, getReminder, setReminder,
} from '../storage/store';
import { exportEntriesCSV, pickCSV } from '../utils/files';
import { scheduleDailyReminder, cancelReminder } from '../utils/notifications';
import { toDisplay } from '../utils/dates';

const pad = (n) => String(n).padStart(2, '0');
const parseNum = (t) => parseFloat(String(t).replace(',', '.'));

export default function SettingsScreen() {
  const [entries, setEntries] = useState([]);
  const [reminder, setReminderState] = useState({ enabled: false, hour: 8, minute: 0 });
  const [showTime, setShowTime] = useState(false);
  const [heightText, setHeightText] = useState('');
  const [refText, setRefText] = useState('');

  const reload = useCallback(async () => {
    setEntries(await loadEntries());
    setReminderState(await getReminder());
    const h = await getHeight();
    setHeightText(h != null ? String(h) : '');
    setRefText(String(await getReference()));
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const applyReminder = async (next) => {
    if (next.enabled) {
      const ok = await scheduleDailyReminder(next.hour, next.minute);
      if (!ok) {
        Alert.alert(
          'Notifications refusées',
          "Autorise les notifications pour « Suivi du poids » dans les paramètres Android.",
        );
        next = { ...next, enabled: false };
      }
    } else {
      await cancelReminder();
    }
    await setReminder(next);
    setReminderState(next);
    Haptics.selectionAsync();
  };

  const onTimeChange = (event, date) => {
    setShowTime(false);
    if (event.type !== 'set' || !date) return;
    applyReminder({ ...reminder, enabled: true, hour: date.getHours(), minute: date.getMinutes() });
  };

  const saveHeight = async () => {
    if (heightText.trim() === '') {
      await setHeight(null);
      return;
    }
    const v = parseNum(heightText);
    if (Number.isFinite(v) && v >= 100 && v <= 230) {
      await setHeight(v);
      Haptics.selectionAsync();
    } else {
      Alert.alert('Taille invalide', 'Saisis ta taille en centimètres (100–230).');
    }
  };

  const saveReference = async () => {
    const v = parseNum(refText);
    if (Number.isFinite(v) && v >= 30 && v <= 250) {
      await setReference(v);
      Haptics.selectionAsync();
    } else {
      Alert.alert('Valeur invalide', 'Saisis un poids de référence entre 30 et 250 kg.');
    }
  };

  const handleImport = async () => {
    try {
      const result = await pickCSV();
      if (!result) return;
      const { entries: imported, errors } = result;
      if (!imported.length) {
        Alert.alert('Import impossible', 'Aucune pesée valide trouvée dans ce fichier.');
        return;
      }
      const first = toDisplay(imported[0].date);
      const last = toDisplay(imported[imported.length - 1].date);
      const warn = errors.length ? `\n${errors.length} ligne(s) ignorée(s).` : '';
      const run = async (mode) => {
        const saved = await importEntries(imported, mode);
        setEntries(saved);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Import terminé', `${saved.length} pesées au total.`);
      };
      Alert.alert(
        'Importer les pesées',
        `${imported.length} pesées trouvées (${first} → ${last}).${warn}`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Tout remplacer', style: 'destructive', onPress: () => run('replace') },
          { text: 'Fusionner', onPress: () => run('merge') },
        ],
      );
    } catch (e) {
      Alert.alert('Erreur', `Lecture du fichier impossible : ${e.message}`);
    }
  };

  const timeLabel = `${pad(reminder.hour)}:${pad(reminder.minute)}`;
  const timeValue = new Date(2000, 0, 1, reminder.hour, reminder.minute);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Réglages</Text>

        <Section title="Rappel quotidien">
          <Row icon="notifications-outline" label="Me rappeler de me peser">
            <Switch
              value={reminder.enabled}
              onValueChange={(v) => applyReminder({ ...reminder, enabled: v })}
              trackColor={{ false: colors.border, true: colors.brut }}
              thumbColor={colors.text}
            />
          </Row>
          <Pressable onPress={() => setShowTime(true)}>
            <Row icon="time-outline" label="Heure du rappel">
              <Text style={styles.value}>{timeLabel}</Text>
            </Row>
          </Pressable>
          {showTime ? (
            <DateTimePicker value={timeValue} mode="time" is24Hour onChange={onTimeChange} />
          ) : null}
        </Section>

        <Section title="Profil">
          <Row icon="resize-outline" label="Taille (pour l'IMC)">
            <TextInput
              value={heightText}
              onChangeText={setHeightText}
              onBlur={saveHeight}
              onSubmitEditing={saveHeight}
              keyboardType="decimal-pad"
              placeholder="175"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
            />
            <Text style={styles.unit}>cm</Text>
          </Row>
          <Row icon="remove-outline" label="Ligne de référence">
            <TextInput
              value={refText}
              onChangeText={setRefText}
              onBlur={saveReference}
              onSubmitEditing={saveReference}
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <Text style={styles.unit}>kg</Text>
          </Row>
        </Section>

        <Section title={`Données · ${entries.length} pesées`}>
          <ActionButton icon="download-outline" label="Importer un CSV" onPress={handleImport} />
          <ActionButton
            icon="share-outline"
            label="Exporter en CSV"
            onPress={() => exportEntriesCSV(entries)}
          />
          <Text style={styles.hint}>
            Tes données sont stockées uniquement sur ce téléphone. Exporte régulièrement un CSV
            (Drive, mail…) : il pourra être réimporté après un changement de téléphone.
          </Text>
        </Section>

        <Text style={styles.version}>
          Suivi du poids · v{Constants.expoConfig?.version ?? '—'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({ icon, label, children }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={colors.textDim} style={styles.rowIcon} />
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ActionButton({ icon, label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={icon} size={20} color={colors.brut} />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 16, paddingBottom: 60 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: 16 },
  section: { marginBottom: 20 },
  sectionTitle: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, minHeight: 48 },
  rowIcon: { marginRight: 10 },
  rowLabel: { color: colors.text, flex: 1, fontWeight: '600' },
  value: { color: colors.brut, fontWeight: '800', fontSize: 16 },
  input: {
    color: colors.text,
    backgroundColor: colors.cardAlt,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 70,
    textAlign: 'right',
    fontWeight: '700',
  },
  unit: { color: colors.textDim, marginLeft: 6, width: 22 },
  action: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  actionText: { color: colors.text, fontWeight: '700', marginLeft: 10 },
  hint: { color: colors.textFaint, fontSize: 12, paddingBottom: 12, lineHeight: 17 },
  version: { color: colors.textFaint, textAlign: 'center', fontSize: 12, marginTop: 8 },
});
