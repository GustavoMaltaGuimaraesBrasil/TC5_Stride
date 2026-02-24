/** Raiz do app mobile: orquestra upload, historico, resultados e reproducao TTS. */

import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Platform, StatusBar as RNStatusBar, Image } from 'react-native';
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

/** Executa a funcao App. */
export default function App() {
  // Estado global da tela mobile.
  const [state, setState] = useState<AppState>('idle');
  // Resultado completo retornado da API.
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  // Mensagem de erro para renderizacao do fallback.
  const [error, setError] = useState('');
  // Nome amigavel da analise/arquivo em foco.
  const [filename, setFilename] = useState('');
  // URI da imagem para preview no resultado.
  const [imageUri, setImageUri] = useState('');
  // Texto de status exibido na tela de carregamento.
  const [loadingStage, setLoadingStage] = useState('Extraindo componentes, grupos e fluxos...');
  // Historico de analises persistidas no backend.
  const [history, setHistory] = useState<AnalysisListItem[]>([]);
  // Controle de carregamento do historico.
  const [historyLoading, setHistoryLoading] = useState(false);
  // Referencia de audio ativo no player Expo.
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  // Cache de arquivos mp3 por secao da narracao.
  const [speechFiles, setSpeechFiles] = useState<Record<SpeechSection, string>>(EMPTY_SPEECH_FILES);
  // Token incremental para invalidação de pre-cache antigo.
  const speechRequestRef = useRef(0);
  // Referencia com snapshot dos arquivos para cleanup no unmount.
  const speechFilesRef = useRef<Record<SpeechSection, string>>(EMPTY_SPEECH_FILES);

  useEffect(() => {
    void loadHistory();
  }, []);

  /** Executa a funcao loadHistory. */
  const loadHistory = async () => {
    // Exibe loading de historico.
    setHistoryLoading(true);
    try {
      // Busca lista de analises salvas.
      const data = await listAnalyses();
      setHistory(data);
    } catch {
      // Em erro, limpa lista para evitar dados stale.
      setHistory([]);
    } finally {
      // Finaliza loading em qualquer resultado.
      setHistoryLoading(false);
    }
  };

  /** Executa a funcao deleteAudioFile. */
  const deleteAudioFile = async (uri: string) => {
    // Ignora URI vazia.
    if (!uri) return;
    try {
      // Remove arquivo de cache de forma idempotente.
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      // nao interromper fluxo principal
    }
  };

  /** Executa a funcao clearSpeechFiles. */
  const clearSpeechFiles = async (files: Record<SpeechSection, string>) => {
    // Remove todos os mp3 temporarios da analise atual/anterior.
    await Promise.all(Object.values(files).map((uri) => deleteAudioFile(uri)));
  };

  useEffect(() => {
    speechFilesRef.current = speechFiles;
  }, [speechFiles]);

  /** Executa a funcao handleImageSelected. */
  const handleImageSelected = async (uri: string, name: string, mimeType?: string) => {
    // Entra em modo de processamento de nova imagem.
    setState('loading');
    setFilename(name);
    setImageUri(uri);
    setLoadingStage('Extraindo componentes, grupos e fluxos...');
    setError('');

    try {
      // Chama pipeline completo no backend.
      const data = await uploadAndAnalyze(uri, name, mimeType);
      // Salva resultado para renderizacao.
      setResult(data);
      setImageUri(data.image_url || getImageUrl(data.id));
      // Prepara audios em segundo plano.
      void prepareSpeechCache(data);
      setState('done');
      // Atualiza historico apos sucesso.
      void loadHistory();
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido');
      setState('error');
    }
  };

  /** Executa a funcao handleOpenAnalysis. */
  const handleOpenAnalysis = async (analysisId: number) => {
    // Carrega processamento salvo ja persistido.
    setState('loading');
    setFilename(`An\u00e1lise #${analysisId}`);
    setImageUri('');
    setLoadingStage('Carregando processamento salvo...');
    setError('');

    try {
      const data = await getAnalysis(analysisId);
      // Permite abrir apenas registros completos com diagrama + stride.
      if (data.status !== 'done' || !data.diagram || !data.stride) {
        const message = data.status === 'error'
          ? (data.error_message || 'A an\u00e1lise falhou e n\u00e3o possui resultado para abertura.')
          : 'A an\u00e1lise ainda est\u00e1 em processamento. Tente novamente em instantes.';
        throw new Error(message);
      }
      setResult(data);
      setImageUri(data.image_url || getImageUrl(data.id));
      // Pre-cache de audio para resposta instantanea dos botoes.
      void prepareSpeechCache(data);
      setState('done');
    } catch (err: any) {
      setError(err.message || 'Falha ao abrir an\u00e1lise');
      setState('error');
    }
  };

  /** Executa a funcao handleReset. */
  const handleReset = () => {
    // Invalida pre-cache antigo.
    speechRequestRef.current += 1;
    const previousFiles = speechFiles;
    // Limpa cache de arquivos de fala da analise anterior.
    setSpeechFiles({ ...EMPTY_SPEECH_FILES });
    void clearSpeechFiles(previousFiles);

    // Restaura estado inicial da tela.
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

  /** Executa a funcao buildDescriptionNarration. */
  const buildDescriptionNarration = (analysis: AnalysisResponse): string => {
    // Gera texto da secao de contexto + criticidade.
    const diagram = analysis.diagram;
    const stride = analysis.stride;
    if (!diagram || !stride) return '';

    return [
      `Descri\u00e7\u00e3o do projeto: ${diagram.context_summary || 'Contexto n\u00e3o identificado.'}`,
      (
        `Criticidade geral: total ${stride.summary.total_threats} amea\u00e7as. ` +
        `Cr\u00edticas ${stride.summary.critical}, altas ${stride.summary.high}, ` +
        `m\u00e9dias ${stride.summary.medium}, baixas ${stride.summary.low}.`
      ),
    ].join(' ');
  };

  /** Executa a funcao buildThreatsNarration. */
  const buildThreatsNarration = (analysis: AnalysisResponse): string => {
    // Gera texto detalhado por ameaca.
    const stride = analysis.stride;
    if (!stride) return '';

    const severityPt: Record<string, string> = {
      critical: 'cr\u00edtica',
      high: 'alta',
      medium: 'm\u00e9dia',
      low: 'baixa',
    };

    const items = stride.threats.map((t, idx) => {
      const sev = severityPt[t.severity] ?? t.severity;
      return (
        `Item ${idx + 1}, ${t.target_name}, categoria ${t.stride_category}. ` +
        `Criticidade ${sev}. ` +
        `Ponto de aten\u00e7\u00e3o: ${t.description}. ` +
        `Como mitigar: ${t.mitigation}.`
      );
    });

    return items.length > 0 ? items.join(' ') : 'N\u00e3o h\u00e1 amea\u00e7as registradas.';
  };

  /** Executa a funcao buildBottomNarration. */
  const buildBottomNarration = (analysis: AnalysisResponse): string => {
    // Gera texto da secao de recomendacoes.
    const stride = analysis.stride;
    if (!stride) return '';
    if (stride.recommendations.length === 0) return 'N\u00e3o h\u00e1 recomenda\u00e7\u00f5es adicionais.';

    return stride.recommendations
      .map((rec, index) => `Recomenda\u00e7\u00e3o ${index + 1}: ${rec}.`)
      .join(' ');
  };

  /** Executa a funcao playAudioFile. */
  const playAudioFile = async (uri: string) => {
    // Ignora URI vazia.
    if (!uri) return;
    try {
      // Finaliza audio anterior para evitar sobreposicao.
      if (sound) {
        await sound.unloadAsync();
      }
      // Carrega arquivo no player do Expo e inicia reproducao.
      const next = new Audio.Sound();
      await next.loadAsync({ uri }, { shouldPlay: true });
      setSound(next);
    } catch {
      // nao interromper fluxo principal
    }
  };

  /** Executa a funcao playSectionAudio. */
  const playSectionAudio = async (section: SpeechSection, text: string) => {
    // Reaproveita cache de arquivo se ja existir.
    const cached = speechFiles[section];
    if (cached) {
      await playAudioFile(cached);
      return;
    }

    // Evita requisicao de TTS com string vazia.
    const normalized = text.trim();
    if (!normalized) return;

    try {
      // Solicita audio base64 ao backend.
      const { audioBase64 } = await synthesizeSpeech(normalized);
      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) return;

      // Salva mp3 local para reutilizacao imediata.
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
    // Permite desativar pre-cache para reduzir custo.
    if (!PRELOAD_TTS_ON_RESULT) return;
    if (!analysis.diagram || !analysis.stride) return;

    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) return;

    // Invalida cachês anteriores e limpa arquivos antigos.
    const requestId = ++speechRequestRef.current;
    const previousFiles = speechFiles;
    setSpeechFiles({ ...EMPTY_SPEECH_FILES });
    void clearSpeechFiles(previousFiles);

    const segments: Record<SpeechSection, string> = {
      // Segmento do contexto geral.
      description: buildDescriptionNarration(analysis),
      // Segmento de ameaças e mitigacoes.
      threats: buildThreatsNarration(analysis),
      // Segmento final de recomendacoes.
      bottom: buildBottomNarration(analysis),
    };

    await Promise.all(
      (Object.entries(segments) as [SpeechSection, string][])
        .filter(([, text]) => text.trim().length > 0)
        .map(async ([section, text]) => {
          try {
            const { audioBase64 } = await synthesizeSpeech(text);
            // Cancela gravacao caso outra analise assuma o foco.
            if (speechRequestRef.current !== requestId) return;

            const fileUri = `${cacheDir}tts-${analysis.id}-${section}-${Date.now()}.mp3`;
            await FileSystem.writeAsStringAsync(fileUri, audioBase64, {
              encoding: FileSystem.EncodingType.Base64,
            });

            if (speechRequestRef.current !== requestId) {
              // Remove arquivo se ficou obsoleto durante corrida assincorna.
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

  /** Executa a funcao handleSpeakDescription. */
  const handleSpeakDescription = () => {
    if (!result) return;
    void playSectionAudio('description', buildDescriptionNarration(result));
  };

  /** Executa a funcao handleSpeakThreatsAndMitigations. */
  const handleSpeakThreatsAndMitigations = () => {
    if (!result) return;
    void playSectionAudio('threats', buildThreatsNarration(result));
  };

  /** Executa a funcao handleSpeakBottom. */
  const handleSpeakBottom = () => {
    if (!result) return;
    void playSectionAudio('bottom', buildBottomNarration(result));
  };

  /** Executa a funcao handleDeleteAnalysis. */
  const handleDeleteAnalysis = (analysisId: number) => {
    // Solicita confirmacao explicita antes de excluir.
    Alert.alert(
      'Excluir an\u00e1lise',
      `Deseja excluir a an\u00e1lise #${analysisId}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAnalysis(analysisId);
              // Se excluiu item aberto, volta para tela inicial.
              if (result?.id === analysisId) {
                handleReset();
                return;
              }
              await loadHistory();
            } catch (err: any) {
              setError(err.message || 'Falha ao excluir an\u00e1lise');
              setState('error');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
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
    </View>
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
