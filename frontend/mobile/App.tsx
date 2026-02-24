import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Alert, Platform, StatusBar as RNStatusBar, Image } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import UploadScreen from './src/screens/UploadScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import { uploadAndAnalyze, getAnalysis, getImageUrl, listAnalyses, deleteAnalysis, synthesizeSpeech } from './src/services/api';
import type { AnalysisListItem, AnalysisResponse } from './src/services/api';
import { colors } from './src/theme/colors';
const fiapLogo = require('./assets/fiap-logo.jpg');

type AppState = 'idle' | 'loading' | 'done' | 'error';
type SpeechSection = 'description' | 'threats' | 'bottom';

const PRELOAD_TTS_ON_RESULT = true;
const EMPTY_SPEECH_FILES: Record<SpeechSection, string> = {
  description: '',
  threats: '',
  bottom: '',
};

export default function App() {
  const [state, setState] = useState<AppState>('idle');
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState('');
  const [filename, setFilename] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [loadingStage, setLoadingStage] = useState('Extraindo componentes, grupos e fluxos...');
  const [history, setHistory] = useState<AnalysisListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [speechFiles, setSpeechFiles] = useState<Record<SpeechSection, string>>(EMPTY_SPEECH_FILES);
  const speechRequestRef = useRef(0);
  const speechFilesRef = useRef<Record<SpeechSection, string>>(EMPTY_SPEECH_FILES);

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

  const deleteAudioFile = async (uri: string) => {
    if (!uri) return;
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      // nao interromper fluxo principal
    }
  };

  const clearSpeechFiles = async (files: Record<SpeechSection, string>) => {
    await Promise.all(Object.values(files).map((uri) => deleteAudioFile(uri)));
  };

  useEffect(() => {
    speechFilesRef.current = speechFiles;
  }, [speechFiles]);

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
      void prepareSpeechCache(data);
      setState('done');
      void loadHistory();
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido');
      setState('error');
    }
  };

  const handleOpenAnalysis = async (analysisId: number) => {
    setState('loading');
    setFilename(`Análise #${analysisId}`);
    setImageUri('');
    setLoadingStage('Carregando processamento salvo...');
    setError('');

    try {
      const data = await getAnalysis(analysisId);
      if (data.status !== 'done' || !data.diagram || !data.stride) {
        const message = data.status === 'error'
          ? (data.error_message || 'A análise falhou e não possui resultado para abertura.')
          : 'A análise ainda está em processamento. Tente novamente em instantes.';
        throw new Error(message);
      }
      setResult(data);
      setImageUri(data.image_url || getImageUrl(data.id));
      void prepareSpeechCache(data);
      setState('done');
    } catch (err: any) {
      setError(err.message || 'Falha ao abrir análise');
      setState('error');
    }
  };

  const handleReset = () => {
    speechRequestRef.current += 1;
    const previousFiles = speechFiles;
    setSpeechFiles({ ...EMPTY_SPEECH_FILES });
    void clearSpeechFiles(previousFiles);

    setState('idle');
    setResult(null);
    setError('');
    setFilename('');
    setImageUri('');
    setLoadingStage('Extraindo componentes, grupos e fluxos...');
    void loadHistory();
  };

  useEffect(() => {
    return () => {
      if (sound) {
        void sound.unloadAsync();
      }
    };
  }, [sound]);

  useEffect(() => {
    return () => {
      void clearSpeechFiles(speechFilesRef.current);
    };
  }, []);

  const buildDescriptionNarration = (analysis: AnalysisResponse): string => {
    const diagram = analysis.diagram;
    const stride = analysis.stride;
    if (!diagram || !stride) return '';

    return [
      `Descrição do projeto: ${diagram.context_summary || 'Contexto não identificado.'}`,
      (
        `Criticidade geral: total ${stride.summary.total_threats} ameaças. ` +
        `Críticas ${stride.summary.critical}, altas ${stride.summary.high}, ` +
        `médias ${stride.summary.medium}, baixas ${stride.summary.low}.`
      ),
    ].join(' ');
  };

  const buildThreatsNarration = (analysis: AnalysisResponse): string => {
    const stride = analysis.stride;
    if (!stride) return '';

    const severityPt: Record<string, string> = {
      critical: 'crítica',
      high: 'alta',
      medium: 'média',
      low: 'baixa',
    };

    const items = stride.threats.map((t, idx) => {
      const sev = severityPt[t.severity] ?? t.severity;
      return (
        `Item ${idx + 1}, ${t.target_name}, categoria ${t.stride_category}. ` +
        `Criticidade ${sev}. ` +
        `Ponto de atenção: ${t.description}. ` +
        `Como mitigar: ${t.mitigation}.`
      );
    });

    return items.length > 0 ? items.join(' ') : 'Não há ameaças registradas.';
  };

  const buildBottomNarration = (analysis: AnalysisResponse): string => {
    const stride = analysis.stride;
    if (!stride) return '';
    if (stride.recommendations.length === 0) return 'Não há recomendações adicionais.';

    return stride.recommendations
      .map((rec, index) => `Recomendação ${index + 1}: ${rec}.`)
      .join(' ');
  };

  const playAudioFile = async (uri: string) => {
    if (!uri) return;
    try {
      if (sound) {
        await sound.unloadAsync();
      }
      const next = new Audio.Sound();
      await next.loadAsync({ uri }, { shouldPlay: true });
      setSound(next);
    } catch {
      // nao interromper fluxo principal
    }
  };

  const playSectionAudio = async (section: SpeechSection, text: string) => {
    const cached = speechFiles[section];
    if (cached) {
      await playAudioFile(cached);
      return;
    }

    const normalized = text.trim();
    if (!normalized) return;

    try {
      const { audioBase64 } = await synthesizeSpeech(normalized);
      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) return;

      const fileUri = `${cacheDir}tts-${section}-${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(fileUri, audioBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setSpeechFiles((prev) => ({ ...prev, [section]: fileUri }));
      await playAudioFile(fileUri);
    } catch {
      // nao interromper fluxo principal
    }
  };

  async function prepareSpeechCache(analysis: AnalysisResponse) {
    if (!PRELOAD_TTS_ON_RESULT) return;
    if (!analysis.diagram || !analysis.stride) return;

    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) return;

    const requestId = ++speechRequestRef.current;
    const previousFiles = speechFiles;
    setSpeechFiles({ ...EMPTY_SPEECH_FILES });
    void clearSpeechFiles(previousFiles);

    const segments: Record<SpeechSection, string> = {
      description: buildDescriptionNarration(analysis),
      threats: buildThreatsNarration(analysis),
      bottom: buildBottomNarration(analysis),
    };

    await Promise.all(
      (Object.entries(segments) as [SpeechSection, string][])
        .filter(([, text]) => text.trim().length > 0)
        .map(async ([section, text]) => {
          try {
            const { audioBase64 } = await synthesizeSpeech(text);
            if (speechRequestRef.current !== requestId) return;

            const fileUri = `${cacheDir}tts-${analysis.id}-${section}-${Date.now()}.mp3`;
            await FileSystem.writeAsStringAsync(fileUri, audioBase64, {
              encoding: FileSystem.EncodingType.Base64,
            });

            if (speechRequestRef.current !== requestId) {
              await deleteAudioFile(fileUri);
              return;
            }

            setSpeechFiles((prev) => ({ ...prev, [section]: fileUri }));
          } catch {
            // manter fluxo principal mesmo se pre-cache falhar
          }
        }),
    );
  }

  const handleSpeakDescription = () => {
    if (!result) return;
    void playSectionAudio('description', buildDescriptionNarration(result));
  };

  const handleSpeakThreatsAndMitigations = () => {
    if (!result) return;
    void playSectionAudio('threats', buildThreatsNarration(result));
  };

  const handleSpeakBottom = () => {
    if (!result) return;
    void playSectionAudio('bottom', buildBottomNarration(result));
  };

  const handleDeleteAnalysis = (analysisId: number) => {
    Alert.alert(
      'Excluir análise',
      `Deseja excluir a análise #${analysisId}?`,
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
              setError(err.message || 'Falha ao excluir análise');
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
        <View style={styles.headerBrand}>
          <Image
            source={fiapLogo}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>
            <Text style={styles.headerAccent}>FIAP Software Security</Text>
          </Text>
        </View>
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
          onSpeakDescription={handleSpeakDescription}
          onSpeakThreatsAndMitigations={handleSpeakThreatsAndMitigations}
          onSpeakBottom={handleSpeakBottom}
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
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 6,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogo: {
    width: 64,
    height: 22,
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
