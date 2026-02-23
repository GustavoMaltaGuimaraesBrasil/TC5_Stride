import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, severityColor } from '../theme/colors';
import type { Threat } from '../services/api';

interface Props {
  threat: Threat;
}

export default function ThreatCard({ threat }: Props) {
  const borderColor = severityColor(threat.severity);
  const severityLabel: Record<string, string> = {
    critical: 'CRITICO',
    high: 'ALTO',
    medium: 'MEDIO',
    low: 'BAIXO',
  };
  const strideLabel: Record<string, string> = {
    Spoofing: 'Falsificacao de Identidade',
    Tampering: 'Violacao de Integridade',
    Repudiation: 'Repudio',
    'Information Disclosure': 'Divulgacao de Informacao',
    'Denial of Service': 'Negacao de Servico',
    'Elevation of Privilege': 'Elevacao de Privilegio',
  };

  return (
    <View style={[styles.card, { borderLeftColor: borderColor }]}>
      <View style={styles.badges}>
        <View style={[styles.severityBadge, { backgroundColor: borderColor }]}>
          <Text style={styles.badgeText}>{severityLabel[threat.severity] ?? threat.severity.toUpperCase()}</Text>
        </View>
        <View style={styles.strideBadge}>
          <Text style={styles.strideText}>{strideLabel[threat.stride_category] ?? threat.stride_category}</Text>
        </View>
      </View>
      <Text style={styles.target}>{threat.target_name}</Text>
      <Text style={styles.description}>{threat.description}</Text>
      <Text style={styles.mitigation}>
        <Text style={styles.bold}>Mitigacao: </Text>
        {threat.mitigation}
      </Text>
      {threat.affected_flows.length > 0 && (
        <Text style={styles.flows}>
          <Text style={styles.bold}>Fluxos: </Text>
          {threat.affected_flows.join(', ')}
        </Text>
      )}
      {threat.evidence.length > 0 && (
        <Text style={styles.flows}>
          <Text style={styles.bold}>Evidencias: </Text>
          {threat.evidence.join(' | ')}
        </Text>
      )}
      {threat.reference_ids.length > 0 && (
        <Text style={styles.flows}>
          <Text style={styles.bold}>Referencias: </Text>
          {threat.reference_ids.join(', ')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  strideBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  strideText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  target: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
  },
  mitigation: {
    color: colors.success,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
  },
  flows: {
    color: colors.textMuted,
    fontSize: 12,
  },
  bold: {
    fontWeight: '700',
  },
});
