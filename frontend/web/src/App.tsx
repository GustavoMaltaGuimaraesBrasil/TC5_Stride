import { useEffect, useState } from 'react'
import UploadZone from './components/UploadZone'
import ResultsView from './components/ResultsView'
import { uploadAndAnalyze, getPdfUrl, getAnalysis, getImageUrl, listAnalyses } from './services/api'
import type { AnalysisListItem, AnalysisResponse } from './services/api'

type AppState = 'idle' | 'uploading' | 'opening' | 'done' | 'error'

export default function App() {
  const [state, setState] = useState<AppState>('idle');
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [history, setHistory] = useState<AnalysisListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

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

  const handleDownloadPdf = () => {
    if (result) {
      window.open(getPdfUrl(result.id), '_blank');
    }
  };

  return (
    <>
      <header>
        <h1><span>STRIDE</span> Modelador de Ameacas</h1>
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
                  <button
                    key={item.id}
                    className="history-item"
                    onClick={() => handleOpenAnalysis(item.id)}
                    type="button"
                  >
                    <div style={{ textAlign: 'left' }}>
                      <strong>#{item.id} - {item.image_filename}</strong>
                      <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
                        Status: {item.status} | Ameacas: {item.threat_count}
                      </p>
                    </div>
                    <span>Abrir</span>
                  </button>
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
          />
        )}
      </div>
    </>
  );
}
