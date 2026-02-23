import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  SafeAreaView,
} from 'react-native';
import { colors } from '../theme/colors';
import SummaryCards from '../components/SummaryCards';
import ThreatCard from '../components/ThreatCard';
import type { AnalysisResponse } from '../services/api';
import { getPdfUrl } from '../services/api';

interface Props {
  result: AnalysisResponse;
  onReset: () => void;
}

export default function ResultsScreen({ result, onReset }: Props) {
  const { diagram, stride } = result;

  if (!diagram || !stride) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No results available.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={onReset}>
          <Text style={styles.btnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleDownloadPdf = () => {
    Linking.openURL(getPdfUrl(result.id));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Header */}
        <Text style={styles.heading}>Analysis Results</Text>
        <Text style={styles.filename}>{result.image_filename}</Text>

        {/* Summary */}
        <SummaryCards summary={stride.summary} />

        {/* Architecture info */}
        <Text style={styles.sectionTitle}>
          Architecture: {diagram.components.length} components, {diagram.groups.length} groups, {diagram.flows.length} flows
        </Text>

        {/* Threats */}
        <Text style={styles.sectionTitle}>Threats</Text>
        {stride.threats.map((threat) => (
          <ThreatCard key={threat.id} threat={threat} />
        ))}

        {/* Recommendations */}
        {stride.recommendations.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recommendations</Text>
            {stride.recommendations.map((rec, i) => (
              <Text key={i} style={styles.recommendation}>
                {i + 1}. {rec}
              </Text>
            ))}
          </>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleDownloadPdf}>
            <Text style={styles.btnText}>📄 Download PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onReset}>
            <Text style={styles.secondaryBtnText}>+ New Analysis</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  heading: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  filename: {
    color: colors.primary,
    fontSize: 13,
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recommendation: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
    paddingLeft: 4,
  },
  actions: {
    marginTop: 24,
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryBtn: {
    backgroundColor: colors.surface,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
    marginBottom: 16,
  },
});
