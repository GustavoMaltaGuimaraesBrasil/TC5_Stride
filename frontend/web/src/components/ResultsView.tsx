/** Apresenta saida da analise STRIDE e acoes do usuario na interface web. */

import type { STRIDEReport, DiagramAnalysis } from '../services/api'

interface ResultsViewProps {
  diagram: DiagramAnalysis;
  stride: STRIDEReport;
  analysisId: number;
  imagePreviewUrl?: string;
  onDownloadPdf: () => void;
  onReset: () => void;
  onDelete: (analysisId: number) => void;
  onSpeakDescription: () => void;
  onSpeakThreatsAndMitigations: () => void;
  onSpeakBottom: () => void;
}

/** Executa a funcao VoiceIconButton. */
function VoiceIconButton({
  onClick,
  title,
}: {
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      className="voice-icon-btn"
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M5 10V14H8L12 18V6L8 10H5Z"
          fill="currentColor"
        />
        <path
          d="M16.5 8.5C17.8 9.8 18.5 10.9 18.5 12C18.5 13.1 17.8 14.2 16.5 15.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M18.8 6.2C20.9 8.3 22 10.1 22 12C22 13.9 20.9 15.7 18.8 17.8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

/** Executa a funcao ResultsView. */
export default function ResultsView({
  diagram,
  stride,
  analysisId,
  imagePreviewUrl,
  onDownloadPdf,
  onReset,
  onDelete,
  onSpeakDescription,
  onSpeakThreatsAndMitigations,
  onSpeakBottom,
}: ResultsViewProps) {
  const severityLabel: Record<string, string> = {
    critical: 'crítico',
    high: 'alto',
    medium: 'médio',
    low: 'baixo',
  };
  const strideLabel: Record<string, string> = {
    Spoofing: 'Falsificação de Identidade',
    Tampering: 'Violação de Integridade',
    Repudiation: 'Repúdio',
    'Information Disclosure': 'Divulgação de Informação',
    'Denial of Service': 'Negação de Serviço',
    'Elevation of Privilege': 'Elevação de Privilégio',
  };

  return (
    <div className="results">
      <div className="summary-cards">
        <div className="summary-card">
          <div className="count">{stride.summary.total_threats}</div>
          <div className="label">Total de Ameaças</div>
        </div>
        <div className="summary-card critical">
          <div className="count">{stride.summary.critical}</div>
          <div className="label">Crítico</div>
        </div>
        <div className="summary-card high">
          <div className="count">{stride.summary.high}</div>
          <div className="label">Alto</div>
        </div>
        <div className="summary-card medium">
          <div className="count">{stride.summary.medium}</div>
          <div className="label">Médio</div>
        </div>
        <div className="summary-card low">
          <div className="count">{stride.summary.low}</div>
          <div className="label">Baixo</div>
        </div>
      </div>

      {imagePreviewUrl && (
        <>
          <h3 className="section-title">Diagrama Enviado</h3>
          <img
            src={imagePreviewUrl}
            alt="Diagrama enviado"
            style={{
              width: '100%',
              maxHeight: 420,
              objectFit: 'contain',
              border: '1px solid var(--border)',
              borderRadius: 12,
              background: '#0b1220',
              padding: 8,
              marginBottom: 16,
            }}
          />
        </>
      )}

      {diagram.context_summary && (
        <>
          <div className="section-header">
            <h3 className="section-title">Contexto da Infraestrutura</h3>
            <VoiceIconButton
              onClick={onSpeakDescription}
              title="Ouvir contexto da infraestrutura"
            />
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>{diagram.context_summary}</p>
        </>
      )}

      <h3 className="section-title">
        Arquitetura: {diagram.components.length} componentes, {diagram.groups.length} grupos, {diagram.flows.length} fluxos
      </h3>

      <div className="section-header">
        <h3 className="section-title">Ameaças</h3>
        <VoiceIconButton
          onClick={onSpeakThreatsAndMitigations}
          title="Ouvir ameaças e mitigações"
        />
      </div>
      <div className="threat-list">
        {stride.threats.map((threat) => (
          <div key={threat.id} className={`threat-card ${threat.severity}`}>
            <div className="threat-header">
              <span className={`severity-badge ${threat.severity}`}>{severityLabel[threat.severity] ?? threat.severity}</span>
              <span className="stride-badge">{strideLabel[threat.stride_category] ?? threat.stride_category}</span>
            </div>
            <h4>{threat.target_name}</h4>
            <p>{threat.description}</p>
            <p className="mitigation"><strong>Mitigação:</strong> {threat.mitigation}</p>
            {threat.affected_flows.length > 0 && (
              <p><strong>Fluxos:</strong> {threat.affected_flows.join(', ')}</p>
            )}
            {threat.evidence.length > 0 && (
              <p><strong>Evidências:</strong> {threat.evidence.join(' | ')}</p>
            )}
            {threat.reference_ids.length > 0 && (
              <p><strong>Referências:</strong> {threat.reference_ids.join(', ')}</p>
            )}
          </div>
        ))}
      </div>

      {stride.recommendations.length > 0 && (
        <>
          <div className="section-header" style={{ marginTop: 24 }}>
            <h3 className="section-title">Recomendações</h3>
            <VoiceIconButton
              onClick={onSpeakBottom}
              title="Ouvir recomendações"
            />
          </div>
          <ul style={{ paddingLeft: 20, color: 'var(--text-muted)' }}>
            {stride.recommendations.map((rec, i) => (
              <li key={i} style={{ marginBottom: 6 }}>{rec}</li>
            ))}
          </ul>
        </>
      )}

      <div className="actions">
        <button className="btn-primary" onClick={onDownloadPdf}>
          Baixar Relatório PDF
        </button>
        <button className="btn-secondary" onClick={onReset}>
          Voltar
        </button>
        <button className="btn-danger" onClick={() => onDelete(analysisId)}>
          Excluir Análise
        </button>
      </div>
    </div>
  );
}

