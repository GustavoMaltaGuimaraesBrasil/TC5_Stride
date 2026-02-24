/** Raiz do app web: controla fluxo de upload, historico, resultados e TTS. */

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

/** Executa a funcao App. */
export default function App() {
  // Estado global da tela para controlar transicoes de fluxo.
  const [state, setState] = useState<AppState>('idle');
  // Resultado completo da analise selecionada/processada.
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  // Mensagem de erro para exibicao no bloco de falha.
  const [error, setError] = useState<string>('');
  // Nome do arquivo atual para feedback visual no loading.
  const [selectedFile, setSelectedFile] = useState<string>('');
  // URL da imagem enviada para preview.
  const [imageUrl, setImageUrl] = useState<string>('');
  // Historico de processamentos salvos.
  const [history, setHistory] = useState<AnalysisListItem[]>([]);
  // Flag de carregamento da lista de historico.
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  // Cache local de audio por secao de narracao.
  const [speechCache, setSpeechCache] = useState<Record<SpeechSection, string>>(EMPTY_SPEECH_CACHE);
  // Referencia do audio em reproducao para permitir stop/troca.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Controle para invalidar respostas antigas de pre-cache.
  const speechRequestRef = useRef(0);

  useEffect(() => {
    void loadHistory();
  }, []);

  /** Executa a funcao loadHistory. */
  const loadHistory = async () => {
    // Liga estado de carregamento para feedback visual.
    setHistoryLoading(true);
    try {
      // Busca itens salvos no backend.
      const data = await listAnalyses();
      setHistory(data);
    } catch {
      // Em erro, mantem lista vazia para evitar UI inconsistente.
      setHistory([]);
    } finally {
      // Desliga carregamento em qualquer cenario.
      setHistoryLoading(false);
    }
  };

  /** Executa a funcao handleFileSelected. */
  const handleFileSelected = async (file: File) => {
    // Entra em modo de upload/processamento.
    setState('uploading');
    setError('');
    setSelectedFile(file.name);
    setImageUrl('');

    try {
      // Dispara pipeline completo no backend.
      const data = await uploadAndAnalyze(file);
      // Salva resultado para renderizar detalhes.
      setResult(data);
      // Define URL de preview com fallback padrao por id.
      setImageUrl(data.image_url || getImageUrl(data.id));
      // Inicia pre-cache de audios em paralelo (sem bloquear UI).
      void prepareSpeechCache(data);
      // Marca fluxo como concluido.
      setState('done');
      // Atualiza historico para incluir novo processamento.
      void loadHistory();
    } catch (err: unknown) {
      // Converte erro para mensagem amigavel.
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setState('error');
    }
  };

  /** Executa a funcao handleOpenAnalysis. */
  const handleOpenAnalysis = async (analysisId: number) => {
    // Entra em modo de abertura de processamento salvo.
    setState('opening');
    setError('');
    setSelectedFile(`An\u00e1lise #${analysisId}`);
    try {
      const data = await getAnalysis(analysisId);
      // So permite abrir resultado efetivamente concluido.
      if (data.status !== 'done' || !data.diagram || !data.stride) {
        const message = data.status === 'error'
          ? (data.error_message || 'A an\u00e1lise falhou e n\u00e3o possui resultado para abertura.')
          : 'A an\u00e1lise ainda est\u00e1 em processamento. Tente novamente em instantes.';
        throw new Error(message);
      }
      setResult(data);
      setImageUrl(data.image_url || getImageUrl(data.id));
      // Prepara audios desta analise reaberta.
      void prepareSpeechCache(data);
      setState('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao abrir an\u00e1lise');
      setState('error');
    }
  };

  /** Executa a funcao handleReset. */
  const handleReset = () => {
    // Invalida qualquer requisicao de audio em andamento.
    speechRequestRef.current += 1;
    // Limpa cache local de audio.
    setSpeechCache({ ...EMPTY_SPEECH_CACHE });
    // Restaura estado inicial da tela.
    setState('idle');
    setResult(null);
    setError('');
    setSelectedFile('');
    setImageUrl('');
    void loadHistory();
  };

  /** Executa a funcao buildDescriptionNarration. */
  const buildDescriptionNarration = (analysis: AnalysisResponse): string => {
    // Se nao houver dados completos, nao gera narracao.
    const diagram = analysis.diagram;
    const stride = analysis.stride;
    if (!diagram || !stride) return '';

    return [
      // Texto com contexto funcional do projeto.
      `Descri\u00e7\u00e3o do projeto: ${diagram.context_summary || 'Contexto n\u00e3o identificado.'}`,
      (
        // Texto com consolidado de criticidade por severidade.
        `Criticidade geral: total ${stride.summary.total_threats} amea\u00e7as. ` +
        `Cr\u00edticas ${stride.summary.critical}, altas ${stride.summary.high}, ` +
        `m\u00e9dias ${stride.summary.medium}, baixas ${stride.summary.low}.`
      ),
    ].join(' ');
  };

  /** Executa a funcao buildThreatsNarration. */
  const buildThreatsNarration = (analysis: AnalysisResponse): string => {
    // Narracao detalhada item a item de ameaças e mitigacoes.
    const stride = analysis.stride;
    if (!stride) return '';

    const severityPt: Record<string, string> = {
      critical: 'cr\u00edtica',
      high: 'alta',
      medium: 'm\u00e9dia',
      low: 'baixa',
    };

    const items = stride.threats.map((t, idx) => {
      // Traduz severidade para leitura natural em pt-BR.
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
    const stride = analysis.stride;
    if (!stride) return '';
    if (stride.recommendations.length === 0) return 'N\u00e3o h\u00e1 recomenda\u00e7\u00f5es adicionais.';

    return stride.recommendations
      .map((rec, index) => `Recomenda\u00e7\u00e3o ${index + 1}: ${rec}.`)
      .join(' ');
  };

  /** Executa a funcao playAudioBase64. */
  const playAudioBase64 = async (audioBase64: string) => {
    // Ignora requisicao vazia.
    if (!audioBase64) return;
    try {
      // Interrompe audio anterior antes de iniciar novo.
      if (audioRef.current) {
        audioRef.current.pause();
      }
      // Monta objeto Audio diretamente de base64.
      const nextAudio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
      audioRef.current = nextAudio;
      // Inicia reproducao.
      await nextAudio.play();
    } catch {
      // nao interromper o fluxo principal
    }
  };

  /** Executa a funcao playSectionAudio. */
  const playSectionAudio = async (section: SpeechSection, text: string) => {
    // Reusa audio ja carregado quando disponivel.
    const cached = speechCache[section];
    if (cached) {
      await playAudioBase64(cached);
      return;
    }

    // Evita chamada de TTS para texto vazio.
    const normalized = text.trim();
    if (!normalized) return;

    try {
      // Solicita sintese ao backend e salva cache local.
      const { audioBase64 } = await synthesizeSpeech(normalized);
      setSpeechCache((prev) => ({ ...prev, [section]: audioBase64 }));
      await playAudioBase64(audioBase64);
    } catch {
      // nao interromper o fluxo principal
    }
  };

  async function prepareSpeechCache(analysis: AnalysisResponse) {
    // Respeita configuracao de custo/performance.
    if (!PRELOAD_TTS_ON_RESULT) return;
    if (!analysis.diagram || !analysis.stride) return;

    // Gera token da requisicao para evitar race condition.
    const requestId = ++speechRequestRef.current;
    setSpeechCache({ ...EMPTY_SPEECH_CACHE });

    const segments: Record<SpeechSection, string> = {
      // Segmento 1: contexto + criticidade.
      description: buildDescriptionNarration(analysis),
      // Segmento 2: ameaças + mitigacoes.
      threats: buildThreatsNarration(analysis),
      // Segmento 3: recomendacoes finais.
      bottom: buildBottomNarration(analysis),
    };

    await Promise.all(
      (Object.entries(segments) as [SpeechSection, string][])
        .filter(([, text]) => text.trim().length > 0)
        .map(async ([section, text]) => {
          try {
            const { audioBase64 } = await synthesizeSpeech(text);
            // Descarta resultado se outra analise assumiu a tela.
            if (speechRequestRef.current !== requestId) return;
            setSpeechCache((prev) => ({ ...prev, [section]: audioBase64 }));
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
  const handleDeleteAnalysis = async (analysisId: number) => {
    // Confirma exclusao antes de chamar backend.
    const confirmed = window.confirm(`Deseja excluir a an\u00e1lise #${analysisId}?`);
    if (!confirmed) return;

    try {
      await deleteAnalysis(analysisId);
      // Se item aberto foi excluido, retorna para estado inicial.
      if (result?.id === analysisId) {
        handleReset();
        return;
      }
      void loadHistory();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir an\u00e1lise');
      setState('error');
    }
  };

  /** Executa a funcao handleDownloadPdf. */
  const handleDownloadPdf = () => {
    // Abre download do PDF em nova guia.
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
            {/* Area de upload para novo processamento. */}
            <UploadZone onFileSelected={handleFileSelected} />
            <div className="history-list">
              <h3 className="section-title">Processamentos Salvos</h3>
              {historyLoading && (
                <p style={{ color: 'var(--text-muted)' }}>Carregando hist\u00f3rico...</p>
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
          <>
            {/* Bloco de carregamento para upload e abertura de analise. */}
          <div className="loading">
            <div className="spinner" />
            <p>{state === 'uploading' ? 'Analisando' : 'Abrindo'} <strong>{selectedFile}</strong>...</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {state === 'uploading'
                ? 'Etapa 1: Extraindo componentes, grupos e fluxos...'
                : 'Carregando dados salvos...'}
            </p>
          </div>
          </>
        )}

        {state === 'error' && (
          <>
            {/* Bloco de erro com acao de retorno. */}
          <div>
            <div className="error-box">
              <strong>Erro:</strong> {error}
            </div>
            <div className="actions">
              <button className="btn-primary" onClick={handleReset}>Tentar Novamente</button>
            </div>
          </div>
          </>
        )}

        {state === 'done' && result?.diagram && result?.stride && (
          <>
            {/* Bloco principal de resultado e acoes de voz/PDF. */}
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
          </>
        )}
      </div>
    </>
  );
}
