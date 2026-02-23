import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  SafeAreaView,
  Image,
} from 'react-native';
import { colors } from '../theme/colors';
import SummaryCards from '../components/SummaryCards';
import ThreatCard from '../components/ThreatCard';
import type { AnalysisResponse } from '../services/api';
import { getPdfUrl } from '../services/api';

interface Props {
  result: AnalysisResponse;
  imageUri?: string;
  onReset: () => void;
  onDelete: (analysisId: number) => void;
}

export default function ResultsScreen({ result, imageUri, onReset, onDelete }: Props) {
  const { diagram, stride } = result;

  if (!diagram || !stride) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Nenhum resultado disponivel.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={onReset}>
          <Text style={styles.btnText}>Tentar Novamente</Text>
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
        <Text style={styles.heading}>Resultado da Analise</Text>
        <Text style={styles.filename}>{result.image_filename}</Text>

        <SummaryCards summary={stride.summary} />

        {imageUri ? (
          <>
            <Text style={styles.sectionTitle}>Diagrama Enviado</Text>
            <Image source={{ uri: imageUri }} style={styles.diagramImage} resizeMode="contain" />
          </>
        ) : null}

        {diagram.context_summary ? (
          <>
            <Text style={styles.sectionTitle}>Contexto da Infraestrutura</Text>
            <Text style={styles.recommendation}>{diagram.context_summary}</Text>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>
          Arquitetura: {diagram.components.length} componentes, {diagram.groups.length} grupos, {diagram.flows.length} fluxos
        </Text>

        <Text style={styles.sectionTitle}>Ameacas</Text>
        {stride.threats.map((threat) => (
          <ThreatCard key={threat.id} threat={threat} />
        ))}

        {stride.recommendations.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recomendacoes</Text>
            {stride.recommendations.map((rec, i) => (
              <Text key={i} style={styles.recommendation}>
                {i + 1}. {rec}
              </Text>
            ))}
          </>
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleDownloadPdf}>
            <Text style={styles.btnText}>Baixar PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onReset}>
            <Text style={styles.secondaryBtnText}>+ Nova Analise</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dangerBtn} onPress={() => onDelete(result.id)}>
            <Text style={styles.dangerBtnText}>Excluir Analise</Text>
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
  diagramImage: {
    width: '100%',
    height: 220,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 10,
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
  dangerBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: colors.danger,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  dangerBtnText: {
    color: '#fecaca',
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
    marginBottom: 16,
  },
});
