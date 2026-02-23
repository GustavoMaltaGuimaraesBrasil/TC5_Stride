export const colors = {
  bg: '#0f172a',
  surface: '#1e293b',
  border: '#334155',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  danger: '#ef4444',
  success: '#22c55e',
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#2563eb',
  white: '#ffffff',
};

export const severityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return colors.critical;
    case 'high': return colors.high;
    case 'medium': return colors.medium;
    case 'low': return colors.low;
    default: return colors.textMuted;
  }
};
