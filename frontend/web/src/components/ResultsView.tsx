import type { STRIDEReport, DiagramAnalysis } from '../services/api'

interface ResultsViewProps {
  diagram: DiagramAnalysis;
  stride: STRIDEReport;
  analysisId: number;
  onDownloadPdf: () => void;
  onReset: () => void;
}

export default function ResultsView({ diagram, stride, analysisId: _analysisId, onDownloadPdf, onReset }: ResultsViewProps) {
  return (
    <div className="results">
      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="count">{stride.summary.total_threats}</div>
          <div className="label">Total Threats</div>
        </div>
        <div className="summary-card critical">
          <div className="count">{stride.summary.critical}</div>
          <div className="label">Critical</div>
        </div>
        <div className="summary-card high">
          <div className="count">{stride.summary.high}</div>
          <div className="label">High</div>
        </div>
        <div className="summary-card medium">
          <div className="count">{stride.summary.medium}</div>
          <div className="label">Medium</div>
        </div>
        <div className="summary-card low">
          <div className="count">{stride.summary.low}</div>
          <div className="label">Low</div>
        </div>
      </div>

      {/* Architecture Overview */}
      <h3 className="section-title">
        Architecture: {diagram.components.length} components, {diagram.groups.length} groups, {diagram.flows.length} flows
      </h3>

      {/* Threats */}
      <h3 className="section-title">Threats</h3>
      <div className="threat-list">
        {stride.threats.map((threat) => (
          <div key={threat.id} className={`threat-card ${threat.severity}`}>
            <div className="threat-header">
              <span className={`severity-badge ${threat.severity}`}>{threat.severity}</span>
              <span className="stride-badge">{threat.stride_category}</span>
            </div>
            <h4>{threat.target_name}</h4>
            <p>{threat.description}</p>
            <p className="mitigation"><strong>Mitigation:</strong> {threat.mitigation}</p>
            {threat.affected_flows.length > 0 && (
              <p><strong>Flows:</strong> {threat.affected_flows.join(', ')}</p>
            )}
          </div>
        ))}
      </div>

      {/* Recommendations */}
      {stride.recommendations.length > 0 && (
        <>
          <h3 className="section-title" style={{ marginTop: 24 }}>Recommendations</h3>
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
          Download PDF Report
        </button>
        <button className="btn-secondary" onClick={onReset}>
          New Analysis
        </button>
      </div>
    </div>
  );
}
