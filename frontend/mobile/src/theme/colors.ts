/** Paleta de cores mobile compartilhada da interface FIAP Software Security. */

export const colors = {
  bg: '#101014',
  surface: '#181821',
  border: '#2d2d3a',
  text: '#f5f5f7',
  textMuted: '#b0b0bd',
  primary: '#ed145b',
  primaryDark: '#d10f4f',
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
