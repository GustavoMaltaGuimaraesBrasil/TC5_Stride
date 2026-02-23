import { useState } from 'react'
import UploadZone from './components/UploadZone'
import ResultsView from './components/ResultsView'
import { uploadAndAnalyze, getPdfUrl } from './services/api'
import type { AnalysisResponse } from './services/api'

type AppState = 'idle' | 'uploading' | 'done' | 'error'

export default function App() {
  const [state, setState] = useState<AppState>('idle');
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const handleFileSelected = async (file: File) => {
    setState('uploading');
    setError('');
    setSelectedFile(file.name);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const nextPreview = URL.createObjectURL(file);
    setPreviewUrl(nextPreview);

    try {
      const data = await uploadAndAnalyze(file);
      setResult(data);
      setState('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setState('error');
    }
  };

  const handleReset = () => {
    setState('idle');
    setResult(null);
    setError('');
    setSelectedFile('');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
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
          <UploadZone onFileSelected={handleFileSelected} />
        )}

        {state === 'uploading' && (
          <div className="loading">
            <div className="spinner" />
            <p>Analisando <strong>{selectedFile}</strong>...</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Etapa 1: Extraindo componentes, grupos e fluxos...
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
            imagePreviewUrl={previewUrl}
            onDownloadPdf={handleDownloadPdf}
            onReset={handleReset}
          />
        )}
      </div>
    </>
  );
}
