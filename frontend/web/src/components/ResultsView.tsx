import type { STRIDEReport, DiagramAnalysis } from '../services/api'

interface ResultsViewProps {
  diagram: DiagramAnalysis;
  stride: STRIDEReport;
  analysisId: number;
  imagePreviewUrl?: string;
  onDownloadPdf: () => void;
  onReset: () => void;
  onDelete: (analysisId: number) => void;
}

export default function ResultsView({ diagram, stride, analysisId, imagePreviewUrl, onDownloadPdf, onReset, onDelete }: ResultsViewProps) {
  const severityLabel: Record<string, string> = {
    critical: 'critico',
    high: 'alto',
    medium: 'medio',
    low: 'baixo',
  };
  const strideLabel: Record<string, string> = {
    Spoofing: 'Falsificacao de Identidade',
    Tampering: 'Violacao de Integridade',
    Repudiation: 'Repudio',
    'Information Disclosure': 'Divulgacao de Informacao',
    'Denial of Service': 'Negacao de Servico',
    'Elevation of Privilege': 'Elevacao de Privilegio',
  };

  return (
    <div className="results">
      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="count">{stride.summary.total_threats}</div>
          <div className="label">Total de Ameacas</div>
        </div>
        <div className="summary-card critical">
          <div className="count">{stride.summary.critical}</div>
          <div className="label">Critico</div>
        </div>
        <div className="summary-card high">
          <div className="count">{stride.summary.high}</div>
          <div className="label">Alto</div>
        </div>
        <div className="summary-card medium">
          <div className="count">{stride.summary.medium}</div>
          <div className="label">Medio</div>
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
          <h3 className="section-title">Contexto da Infraestrutura</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>{diagram.context_summary}</p>
        </>
      )}

      {/* Architecture Overview */}
      <h3 className="section-title">
        Arquitetura: {diagram.components.length} componentes, {diagram.groups.length} grupos, {diagram.flows.length} fluxos
      </h3>

      {/* Threats */}
      <h3 className="section-title">Ameacas</h3>
      <div className="threat-list">
        {stride.threats.map((threat) => (
          <div key={threat.id} className={`threat-card ${threat.severity}`}>
            <div className="threat-header">
              <span className={`severity-badge ${threat.severity}`}>{severityLabel[threat.severity] ?? threat.severity}</span>
              <span className="stride-badge">{strideLabel[threat.stride_category] ?? threat.stride_category}</span>
            </div>
            <h4>{threat.target_name}</h4>
            <p>{threat.description}</p>
            <p className="mitigation"><strong>Mitigacao:</strong> {threat.mitigation}</p>
            {threat.affected_flows.length > 0 && (
              <p><strong>Fluxos:</strong> {threat.affected_flows.join(', ')}</p>
            )}
            {threat.evidence.length > 0 && (
              <p><strong>Evidencias:</strong> {threat.evidence.join(' | ')}</p>
            )}
            {threat.reference_ids.length > 0 && (
              <p><strong>Referencias:</strong> {threat.reference_ids.join(', ')}</p>
            )}
          </div>
        ))}
      </div>

      {/* Recommendations */}
      {stride.recommendations.length > 0 && (
        <>
          <h3 className="section-title" style={{ marginTop: 24 }}>Recomendacoes</h3>
          <ul style={{ paddingLeft: 20, color: 'var(--text-muted)' }}>
            {stride.recommendations.map((rec, i) => (
              <li key={i} style={{ marginBottom: 6 }}>{rec}</li>
            ))}
          </ul>
        </>
      )}

      {/* Actions */}
      <div className="actions">
        <button className="btn-primary" onClick={onDownloadPdf}>
          Baixar Relatorio PDF
        </button>
        <button className="btn-secondary" onClick={onReset}>
          Nova Analise
        </button>
        <button className="btn-danger" onClick={() => onDelete(analysisId)}>
          Excluir Analise
        </button>
      </div>
    </div>
  );
}
