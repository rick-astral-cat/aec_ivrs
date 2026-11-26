// Convierte Markdown en texto plano para vistas compactas (p. ej. tarjetas):
// quita marcas de formato y deja el texto legible en una sola línea.
export function markdownToPlainText(markdown) {
  if (!markdown) return ''
  return markdown
    .replace(/```[\s\S]*?```/g, ' ') // bloques de código
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // imágenes -> texto alternativo
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // enlaces -> texto
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?/gm, '') // encabezados, citas, listas, tareas
    .replace(/^\s*([-*_]\s*){3,}$/gm, ' ') // líneas horizontales
    .replace(/^\s*\|?(\s*:?-+:?\s*\|)+\s*:?-*:?\s*$/gm, ' ') // separador de tablas
    .replace(/\|/g, ' ')
    .replace(/(\*\*|__|~~|`)/g, '') // negrita, tachado, código
    .replace(/(^|\W)[*_](\S[^*_]*?)[*_](?=\W|$)/g, '$1$2') // cursiva
    .replace(/\s+/g, ' ')
    .trim()
}
