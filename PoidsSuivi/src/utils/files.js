// Échanges de fichiers : export CSV via le menu de partage, import via le sélecteur.

import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

import { buildCSV, parseCSV, exportFileName } from './csv';
import { computeMA5 } from './calculations';

export const exportEntriesCSV = async (entries) => {
  const uri = `${FileSystem.cacheDirectory}${exportFileName()}`;
  await FileSystem.writeAsStringAsync(uri, buildCSV(computeMA5(entries)), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Exporter les pesées' });
  } else {
    Alert.alert('Partage indisponible', `Fichier écrit : ${uri}`);
  }
};

// Ouvre le sélecteur ; retourne null si annulé, sinon { entries, errors }.
export const pickCSV = async () => {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel', '*/*'],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.length) return null;
  const text = await FileSystem.readAsStringAsync(res.assets[0].uri);
  return parseCSV(text);
};
