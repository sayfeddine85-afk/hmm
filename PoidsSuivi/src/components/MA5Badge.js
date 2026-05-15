import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { toDisplay } from '../utils/dates';
import { round } from '../utils/calculations';

export default function MA5Badge({ entry, prev }) {
  if (!entry || entry.ma5 == null) return null;
  const delta = prev?.ma5 != null ? round(entry.ma5 - prev.ma5, 2) : null;
  const arrow = delta == null ? '' : delta > 0 ? '▲' : delta < 0 ? '▼' : '·';
  const tone = delta == null ? colors.textDim : delta > 0 ? colors.up : delta < 0 ? colors.down : colors.textDim;

  return (
    <View style={styles.badge}>
      <Text style={styles.date}>{toDisplay(entry.date)}</Text>
      <Text style={styles.value}>{entry.ma5.toFixed(2)}</Text>
      <Text style={[styles.delta, { color: tone }]}>
        {arrow}
        {delta != null ? ` ${delta > 0 ? '+' : ''}${delta.toFixed(2)}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    minWidth: 84,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  date: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '600',
  },
  value: {
    color: colors.ma5,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  delta: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
