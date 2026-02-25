/** Renderiza um card de ameaca com severidade, categoria STRIDE e detalhes. */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, severityColor } from '../theme/colors';
import type { Threat } from '../services/api';
import { decodeEscapedUnicode } from '../utils/text';

interface Props {
  threat: Threat;
}

/** Executa a funcao ThreatCard. */
export default function ThreatCard({ threat }: Props) {
  const borderColor = severityColor(threat.severity);
  const severityLabel: Record<string, string> = {
    critical: 'CR\u00cdTICO',
    high: 'ALTO',
    medium: 'M\u00c9DIO',
    low: 'BAIXO',
  };
  const strideLabel: Record<string, string> = {
    Spoofing: 'Falsifica\u00e7\u00e3o de Identidade',
    Tampering: 'Viola\u00e7\u00e3o de Integridade',
    Repudiation: 'Rep\u00fadio',
    'Information Disclosure': 'Divulga\u00e7\u00e3o de Informa\u00e7\u00e3o',
    'Denial of Service': 'Nega\u00e7\u00e3o de Servi\u00e7o',
    'Elevation of Privilege': 'Eleva\u00e7\u00e3o de Privil\u00e9gio',
  };
  const description = decodeEscapedUnicode(threat.description);
  const mitigation = decodeEscapedUnicode(threat.mitigation);
  const evidence = threat.evidence.map((item) => decodeEscapedUnicode(item));
  const referenceIds = threat.reference_ids.map((item) => decodeEscapedUnicode(item));
  const targetName = decodeEscapedUnicode(threat.target_name);

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
      <Text style={styles.target}>{targetName}</Text>
      <Text style={styles.description}>{description}</Text>
      <Text style={styles.mitigation}>
        <Text style={styles.bold}>{'Mitiga\u00e7\u00e3o: '}</Text>
        {mitigation}
      </Text>
      {threat.affected_flows.length > 0 && (
        <Text style={styles.flows}>
          <Text style={styles.bold}>Fluxos: </Text>
          {threat.affected_flows.join(', ')}
        </Text>
      )}
      {evidence.length > 0 && (
        <Text style={styles.flows}>
          <Text style={styles.bold}>{'Evid\u00eancias: '}</Text>
          {evidence.join(' | ')}
        </Text>
      )}
      {referenceIds.length > 0 && (
        <Text style={styles.flows}>
          <Text style={styles.bold}>{'Refer\u00eancias: '}</Text>
          {referenceIds.join(', ')}
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
