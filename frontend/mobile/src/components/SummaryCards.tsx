import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, severityColor } from '../theme/colors';
import type { ThreatSummary } from '../services/api';

interface Props {
  summary: ThreatSummary;
}

export default function SummaryCards({ summary }: Props) {
  const cards = [
    { label: 'Total', value: summary.total_threats, color: colors.text },
    { label: 'Critical', value: summary.critical, color: severityColor('critical') },
    { label: 'High', value: summary.high, color: severityColor('high') },
    { label: 'Medium', value: summary.medium, color: severityColor('medium') },
    { label: 'Low', value: summary.low, color: severityColor('low') },
  ];

  return (
    <View style={styles.row}>
      {cards.map((card) => (
        <View key={card.label} style={styles.card}>
          <Text style={[styles.count, { color: card.color }]}>{card.value}</Text>
          <Text style={styles.label}>{card.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    minWidth: 60,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  count: {
    fontSize: 22,
    fontWeight: '700',
  },
  label: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: 2,
    letterSpacing: 0.5,
  },
});
