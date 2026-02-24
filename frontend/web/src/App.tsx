import { useEffect, useRef, useState } from 'react'
import UploadZone from './components/UploadZone'
import ResultsView from './components/ResultsView'
import { uploadAndAnalyze, getPdfUrl, getAnalysis, getImageUrl, listAnalyses, deleteAnalysis, synthesizeSpeech } from './services/api'
import type { AnalysisListItem, AnalysisResponse } from './services/api'
import fiapLogo from './assets/fiap-logo.jpg'

type AppState = 'idle' | 'uploading' | 'opening' | 'done' | 'error'
type SpeechSection = 'description' | 'threats' | 'bottom'

const PRELOAD_TTS_ON_RESULT = true
const EMPTY_SPEECH_CACHE: Record<SpeechSection, string> = {
  description: '',
  threats: '',
  bottom: '',
}

export default function App() {
  const [state, setState] = useState<AppState>('idle');
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [history, setHistory] = useState<AnalysisListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [speechCache, setSpeechCache] = useState<Record<SpeechSection, string>>(EMPTY_SPEECH_CACHE);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRequestRef = useRef(0);

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

  const handleFileSelected = async (file: File) => {
    setState('uploading');
    setError('');
    setSelectedFile(file.name);
    setImageUrl('');

    try {
      const data = await uploadAndAnalyze(file);
      setResult(data);
      setImageUrl(data.image_url || getImageUrl(data.id));
      void prepareSpeechCache(data);
      setState('done');
      void loadHistory();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setState('error');
    }
  };

  const handleOpenAnalysis = async (analysisId: number) => {
    setState('opening');
    setError('');
    setSelectedFile(`Análise #${analysisId}`);
    try {
      const data = await getAnalysis(analysisId);
      if (data.status !== 'done' || !data.diagram || !data.stride) {
        const message = data.status === 'error'
          ? (data.error_message || 'A análise falhou e não possui resultado para abertura.')
          : 'A análise ainda está em processamento. Tente novamente em instantes.';
        throw new Error(message);
      }
      setResult(data);
      setImageUrl(data.image_url || getImageUrl(data.id));
      void prepareSpeechCache(data);
      setState('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao abrir análise');
      setState('error');
    }
  };

  const handleReset = () => {
    speechRequestRef.current += 1;
    setSpeechCache({ ...EMPTY_SPEECH_CACHE });
    setState('idle');
    setResult(null);
    setError('');
    setSelectedFile('');
    setImageUrl('');
    void loadHistory();
  };

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

  const playAudioBase64 = async (audioBase64: string) => {
    if (!audioBase64) return;
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const nextAudio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
      audioRef.current = nextAudio;
      await nextAudio.play();
    } catch {
      // não interromper fluxo principal
    }
  };

  const playSectionAudio = async (section: SpeechSection, text: string) => {
    const cached = speechCache[section];
    if (cached) {
      await playAudioBase64(cached);
      return;
    }

    const normalized = text.trim();
    if (!normalized) return;

    try {
      const { audioBase64 } = await synthesizeSpeech(normalized);
      setSpeechCache((prev) => ({ ...prev, [section]: audioBase64 }));
      await playAudioBase64(audioBase64);
    } catch {
      // não interromper fluxo principal
    }
  };

  async function prepareSpeechCache(analysis: AnalysisResponse) {
    if (!PRELOAD_TTS_ON_RESULT) return;
    if (!analysis.diagram || !analysis.stride) return;

    const requestId = ++speechRequestRef.current;
    setSpeechCache({ ...EMPTY_SPEECH_CACHE });

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
            setSpeechCache((prev) => ({ ...prev, [section]: audioBase64 }));
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

  const handleDeleteAnalysis = async (analysisId: number) => {
    const confirmed = window.confirm(`Deseja excluir a análise #${analysisId}?`);
    if (!confirmed) return;

    try {
      await deleteAnalysis(analysisId);
      if (result?.id === analysisId) {
        handleReset();
        return;
      }
      void loadHistory();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir análise');
      setState('error');
    }
  };

  const handleDownloadPdf = () => {
    if (result) {
      window.open(getPdfUrl(result.id), '_blank');
    }
  };

  return (
    <>
      <header>
        <div className="brand">
          <img
            src={fiapLogo}
            alt="FIAP"
            className="brand-logo"
          />
          <h1><span>FIAP Software Security</span></h1>
        </div>
        {state === 'done' && (
          <button className="btn-secondary" onClick={handleReset}>
            Voltar
          </button>
        )}
      </header>
      <div className="container">
        {state === 'idle' && (
          <>
            <UploadZone onFileSelected={handleFileSelected} />
            <div className="history-list">
              <h3 className="section-title">Processamentos Salvos</h3>
              {historyLoading && (
                <p style={{ color: 'var(--text-muted)' }}>Carregando histórico...</p>
              )}
              {!historyLoading && history.length === 0 && (
                <p style={{ color: 'var(--text-muted)' }}>Nenhum processamento salvo ainda.</p>
              )}
              {!historyLoading && history.length > 0 && (
                history.map((item) => (
                  <div key={item.id} className="history-item">
                    <div style={{ textAlign: 'left' }}>
                      <strong>#{item.id} - {item.image_filename}</strong>
                      <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
                        {`Status: ${item.status} | Amea\u00e7as: ${item.threat_count}`}
                      </p>
                    </div>
                    <div className="history-actions">
                      <button type="button" className="btn-secondary" onClick={() => handleOpenAnalysis(item.id)}>
                        Abrir
                      </button>
                      <button type="button" className="btn-danger" onClick={() => handleDeleteAnalysis(item.id)}>
                        Excluir
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {(state === 'uploading' || state === 'opening') && (
          <div className="loading">
            <div className="spinner" />
            <p>{state === 'uploading' ? 'Analisando' : 'Abrindo'} <strong>{selectedFile}</strong>...</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {state === 'uploading'
                ? 'Etapa 1: Extraindo componentes, grupos e fluxos...'
                : 'Carregando dados salvos...'}
            </p>
          </div>
        )}

        {state === 'error' && (
          <div>
            <div className="error-box">
              <strong>Erro:</strong> {error}
            </div>
            <div className="actions">
              <button className="btn-primary" onClick={handleReset}>Tentar Novamente</button>
            </div>
          </div>
        )}

        {state === 'done' && result?.diagram && result?.stride && (
          <ResultsView
            diagram={result.diagram}
            stride={result.stride}
            analysisId={result.id}
            imagePreviewUrl={imageUrl}
            onDownloadPdf={handleDownloadPdf}
            onReset={handleReset}
            onDelete={handleDeleteAnalysis}
            onSpeakDescription={handleSpeakDescription}
            onSpeakThreatsAndMitigations={handleSpeakThreatsAndMitigations}
            onSpeakBottom={handleSpeakBottom}
          />
        )}
      </div>
    </>
  );
}
