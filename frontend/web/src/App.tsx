import { useEffect, useRef, useState } from 'react'
import UploadZone from './components/UploadZone'
import ResultsView from './components/ResultsView'
import { uploadAndAnalyze, getPdfUrl, getAnalysis, getImageUrl, listAnalyses, deleteAnalysis, synthesizeSpeech, transcribeAudio } from './services/api'
import type { AnalysisListItem, AnalysisResponse } from './services/api'
import fiapLogo from './assets/fiap-logo.jpg'

type AppState = 'idle' | 'uploading' | 'opening' | 'done' | 'error'

export default function App() {
  const [state, setState] = useState<AppState>('idle');
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [history, setHistory] = useState<AnalysisListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcribing, setTranscribing] = useState<boolean>(false);
  const [transcriptionText, setTranscriptionText] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      setState('done');
      void playSummaryAudio(data.diagram?.context_summary || '');
      void loadHistory();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setState('error');
    }
  };

  const handleOpenAnalysis = async (analysisId: number) => {
    setState('opening');
    setError('');
    setSelectedFile(`Analise #${analysisId}`);
    try {
      const data = await getAnalysis(analysisId);
      if (data.status !== 'done' || !data.diagram || !data.stride) {
        const message = data.status === 'error'
          ? (data.error_message || 'A analise falhou e nao possui resultado para abertura.')
          : 'A analise ainda esta em processamento. Tente novamente em instantes.';
        throw new Error(message);
      }
      setResult(data);
      setImageUrl(data.image_url || getImageUrl(data.id));
      setState('done');
      void playSummaryAudio(data.diagram?.context_summary || '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao abrir analise');
      setState('error');
    }
  };

  const handleReset = () => {
    setState('idle');
    setResult(null);
    setError('');
    setSelectedFile('');
    setImageUrl('');
    void loadHistory();
  };

  const playSummaryAudio = async (summary: string) => {
    const text = summary.trim();
    if (!text) return;
    try {
      const { audioBase64 } = await synthesizeSpeech(text);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const nextAudio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
      audioRef.current = nextAudio;
      await nextAudio.play();
    } catch {
      // nao interromper fluxo principal
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Gravacao de audio nao suportada neste navegador.');
      setState('error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = async () => {
        try {
          setTranscribing(true);
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          const data = await transcribeAudio(blob, 'gravacao.webm');
          setTranscriptionText(data.text);
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Falha ao transcrever audio');
          setState('error');
        } finally {
          setTranscribing(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setError('Falha ao iniciar gravacao de audio.');
      setState('error');
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setIsRecording(false);
  };

  const handleDeleteAnalysis = async (analysisId: number) => {
    const confirmed = window.confirm(`Deseja excluir a analise #${analysisId}?`);
    if (!confirmed) return;

    try {
      await deleteAnalysis(analysisId);
      if (result?.id === analysisId) {
        handleReset();
        return;
      }
      void loadHistory();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir analise');
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
            + Nova Analise
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
                <p style={{ color: 'var(--text-muted)' }}>Carregando historico...</p>
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
                        Status: {item.status} | Ameacas: {item.threat_count}
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
            <div className="history-list">
              <h3 className="section-title">Transcricao de Voz (pt-BR)</h3>
              <div className="history-actions">
                {!isRecording ? (
                  <button type="button" className="btn-primary" onClick={startRecording}>
                    Gravar Audio
                  </button>
                ) : (
                  <button type="button" className="btn-danger" onClick={stopRecording}>
                    Parar Gravacao
                  </button>
                )}
              </div>
              {transcribing && <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Transcrevendo...</p>}
              {transcriptionText && (
                <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
                  <strong>Texto:</strong> {transcriptionText}
                </p>
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
          />
        )}
      </div>
    </>
  );
}
