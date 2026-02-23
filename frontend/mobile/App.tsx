import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Alert, Platform, StatusBar as RNStatusBar } from 'react-native';
import UploadScreen from './src/screens/UploadScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import { uploadAndAnalyze, getAnalysis, getImageUrl, listAnalyses, deleteAnalysis } from './src/services/api';
import type { AnalysisListItem, AnalysisResponse } from './src/services/api';
import { colors } from './src/theme/colors';

type AppState = 'idle' | 'loading' | 'done' | 'error';

export default function App() {
  const [state, setState] = useState<AppState>('idle');
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState('');
  const [filename, setFilename] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [loadingStage, setLoadingStage] = useState('Extraindo componentes, grupos e fluxos...');
  const [history, setHistory] = useState<AnalysisListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    void loadHistory();
  }, []);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await listAnalyses();
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleImageSelected = async (uri: string, name: string, mimeType?: string) => {
    setState('loading');
    setFilename(name);
    setImageUri(uri);
    setLoadingStage('Extraindo componentes, grupos e fluxos...');
    setError('');

    try {
      const data = await uploadAndAnalyze(uri, name, mimeType);
      setResult(data);
      setImageUri(data.image_url || getImageUrl(data.id));
      setState('done');
      void loadHistory();
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido');
      setState('error');
    }
  };

  const handleOpenAnalysis = async (analysisId: number) => {
    setState('loading');
    setFilename(`Analise #${analysisId}`);
    setImageUri('');
    setLoadingStage('Carregando processamento salvo...');
    setError('');

    try {
      const data = await getAnalysis(analysisId);
      if (data.status !== 'done' || !data.diagram || !data.stride) {
        const message = data.status === 'error'
          ? (data.error_message || 'A analise falhou e nao possui resultado para abertura.')
          : 'A analise ainda esta em processamento. Tente novamente em instantes.';
        throw new Error(message);
      }
      setResult(data);
      setImageUri(data.image_url || getImageUrl(data.id));
      setState('done');
    } catch (err: any) {
      setError(err.message || 'Falha ao abrir analise');
      setState('error');
    }
  };

  const handleReset = () => {
    setState('idle');
    setResult(null);
    setError('');
    setFilename('');
    setImageUri('');
    setLoadingStage('Extraindo componentes, grupos e fluxos...');
    void loadHistory();
  };

  const handleDeleteAnalysis = (analysisId: number) => {
    Alert.alert(
      'Excluir analise',
      `Deseja excluir a analise #${analysisId}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAnalysis(analysisId);
              if (result?.id === analysisId) {
                handleReset();
                return;
              }
              await loadHistory();
            } catch (err: any) {
              setError(err.message || 'Falha ao excluir analise');
              setState('error');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          <Text style={styles.headerAccent}>STRIDE</Text> Modelador de Ameacas
        </Text>
      </View>

      {state === 'idle' && (
        <UploadScreen
          onImageSelected={handleImageSelected}
          analyses={history}
          historyLoading={historyLoading}
          onOpenAnalysis={handleOpenAnalysis}
          onDeleteAnalysis={handleDeleteAnalysis}
          onRefreshHistory={loadHistory}
        />
      )}

      {state === 'loading' && (
        <LoadingScreen
          filename={filename}
          stage={loadingStage}
        />
      )}

      {state === 'error' && (
        <View style={styles.errorContainer}>
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>Erro: {error}</Text>
          </View>
          <TouchableOpacity style={styles.retryBtn} onPress={handleReset}>
            <Text style={styles.retryBtnText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      )}

      {state === 'done' && result && (
        <ResultsScreen
          result={result}
          imageUri={imageUri}
          onReset={handleReset}
          onDelete={handleDeleteAnalysis}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 18 : 42,
    paddingBottom: 18,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    marginTop: 6,
  },
  headerAccent: {
    color: colors.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  retryBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
