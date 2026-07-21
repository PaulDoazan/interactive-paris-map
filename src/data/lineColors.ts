const FALLBACK_GREY = '#8c8c8c'

// Couleurs officielles RATP (fallback si absentes de la donnée source).
export const RATP_LINE_COLORS: Record<string, string> = {
  '1': '#FFCD00',
  '2': '#003CA6',
  '3': '#837902',
  '3bis': '#6EC4E8',
  '4': '#CF009E',
  '5': '#FF7E2E',
  '6': '#6ECA97',
  '7': '#FA9ABA',
  '7bis': '#6ECA97',
  '8': '#E19BDF',
  '9': '#B6BD00',
  '10': '#C9910D',
  '11': '#704B1C',
  '12': '#007852',
  '13': '#6EC4E8',
  '14': '#62259D',
}

export function getLineColor(lineId: string, sourceHex?: string): string {
  const src = sourceHex?.trim()
  if (src) return src.startsWith('#') ? src : `#${src}`
  return RATP_LINE_COLORS[lineId] ?? FALLBACK_GREY
}
