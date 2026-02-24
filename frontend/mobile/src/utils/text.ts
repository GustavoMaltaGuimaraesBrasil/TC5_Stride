/** Utilitarios de texto para renderizacao no mobile. */

/** Decodifica sequencias unicode escapadas (ex.: \u00e7) em caracteres reais. */
export function decodeEscapedUnicode(value: string): string {
  if (!value || !value.includes('\\u')) return value;
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}
