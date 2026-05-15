import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CartesianChart, Line, Scatter, useChartPressState } from 'victory-native';
import { Circle, DashPathEffect } from '@shopify/react-native-skia';
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated';

import colors from '../theme/colors';
import { isPeak } from '../utils/calculations';
import { toDisplay } from '../utils/dates';

// `data` doit déjà inclure `ma5`. `range` = '7' | '30' | '90' | 'all'.
// `referenceLine` (number) et `objectif` (number|null) tracent des horizontales.
export default function WeightChart({
  data,
  referenceLine,
  objectif = null,
  range = 'all',
  compact = false,
  height = compact ? 200 : 360,
  onlyPeaks = false,
}) {
  const filtered = useMemo(() => filterByRange(data, range), [data, range]);

  // Index numérique pour l'axe X (CartesianChart aime les numériques).
  const series = useMemo(
    () =>
      filtered.map((d, i) => ({
        i,
        poids: d.poids,
        ma5: d.ma5 ?? null,
        ref: referenceLine,
        goal: objectif ?? null,
        date: d.date,
        peak: isPeak(d) ? 1 : 0,
      })),
    [filtered, referenceLine, objectif],
  );

  const peaksOnly = useMemo(() => series.filter((s) => s.peak === 1), [series]);
  const yKeys = ['poids', 'ma5', 'ref', ...(objectif != null ? ['goal'] : [])];

  const { state, isActive } = useChartPressState({
    x: 0,
    y: { poids: 0, ma5: 0 },
  });

  const [active, setActive] = useState(null);

  // Synchronise la position pressée vers l'état React pour la tooltip.
  useAnimatedReaction(
    () => state.x.value.value,
    (idx) => {
      const i = Math.round(idx);
      if (i >= 0 && i < series.length) {
        runOnJS(setActive)(series[i]);
      }
    },
    [series.length],
  );

  if (!filtered.length) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>Pas encore de données pour cette période.</Text>
      </View>
    );
  }

  // Domaine Y avec marge ±0.5 kg.
  const allY = series.flatMap((s) => [s.poids, s.ma5 ?? s.poids, s.ref, s.goal ?? s.poids]);
  const yMin = Math.floor((Math.min(...allY) - 0.5) * 2) / 2;
  const yMax = Math.ceil((Math.max(...allY) + 0.5) * 2) / 2;

  return (
    <View>
      <View style={{ height, paddingHorizontal: 4 }}>
        <CartesianChart
          data={series}
          xKey="i"
          yKeys={yKeys}
          domain={{ y: [yMin, yMax] }}
          domainPadding={{ left: 12, right: 12, top: 16, bottom: 16 }}
          chartPressState={state}
        >
          {({ points }) => (
            <>
              {/* Référence horizontale */}
              <Line
                points={points.ref}
                color={colors.reference}
                strokeWidth={1}
              >
                <DashPathEffect intervals={[4, 6]} />
              </Line>

              {/* Objectif (cyan dashed) */}
              {objectif != null && points.goal ? (
                <Line points={points.goal} color={colors.accent} strokeWidth={1.5}>
                  <DashPathEffect intervals={[6, 4]} />
                </Line>
              ) : null}

              {/* MA5 (orange) */}
              <Line
                points={points.ma5}
                color={colors.ma5}
                strokeWidth={2.5}
                curveType="natural"
                connectMissingData={false}
              />

              {/* Poids brut (violet) */}
              <Line
                points={points.poids}
                color={colors.brut}
                strokeWidth={2}
                curveType="linear"
              />

              {/* Points : violets, plus gros et rouges sur pic */}
              <Scatter
                points={points.poids}
                shape="circle"
                radius={3}
                style="fill"
                color={colors.brut}
              />
              {(onlyPeaks ? series.filter((s) => s.peak === 1) : series).map((s) =>
                s.peak === 1 ? (
                  <PeakDot key={s.i} point={points.poids[s.i]} />
                ) : null,
              )}

              {/* Marqueur de la position pressée */}
              {isActive ? (
                <Circle
                  cx={state.x.position}
                  cy={state.y.poids.position}
                  r={6}
                  color={colors.accent}
                />
              ) : null}
            </>
          )}
        </CartesianChart>
      </View>

      {/* Tooltip : affichée sous le graph */}
      <Tooltip active={active} fallback={series[series.length - 1]} />
    </View>
  );
}

function PeakDot({ point }) {
  if (!point) return null;
  return <Circle cx={point.x} cy={point.y} r={5} color={colors.up} />;
}

function Tooltip({ active, fallback }) {
  const point = active ?? fallback;
  if (!point) return null;
  return (
    <View style={styles.tooltip}>
      <Text style={styles.ttDate}>{toDisplay(point.date)}</Text>
      <View style={styles.ttRow}>
        <Dot color={colors.brut} />
        <Text style={styles.ttLabel}>Poids</Text>
        <Text style={styles.ttValue}>{point.poids?.toFixed(1)} kg</Text>
      </View>
      <View style={styles.ttRow}>
        <Dot color={colors.ma5} />
        <Text style={styles.ttLabel}>MA5</Text>
        <Text style={styles.ttValue}>
          {point.ma5 != null ? `${point.ma5.toFixed(2)} kg` : '—'}
        </Text>
      </View>
    </View>
  );
}

function Dot({ color }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

function filterByRange(data, range) {
  if (!data?.length) return [];
  if (range === 'all') return data;
  const days = range === '7' ? 7 : range === '30' ? 30 : range === '90' ? 90 : null;
  if (!days) return data;
  // On filtre par index proche : on garde les `days` dernières entrées (proxy simple).
  // Comme les pesées ne sont pas exactement quotidiennes, on garde au moins `days` entrées.
  return data.slice(-Math.min(data.length, days));
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textDim,
  },
  tooltip: {
    marginTop: 6,
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ttDate: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  ttRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  ttLabel: {
    color: colors.text,
    fontSize: 12,
    flex: 1,
    marginLeft: 6,
  },
  ttValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
