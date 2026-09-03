import type { Resultat } from '../types'

const CLE = 'motsfleches.v1'

export interface Sauvegarde {
  grilles: Record<string, Resultat>
  quotidien: Record<string, Resultat>   // date ISO -> resultat
  serie: { dernier: string; jours: number }
}

const VIDE: Sauvegarde = { grilles: {}, quotidien: {}, serie: { dernier: '', jours: 0 } }

export function lire(): Sauvegarde {
  try {
    const brut = localStorage.getItem(CLE)
    if (!brut) return { ...VIDE }
    return { ...VIDE, ...JSON.parse(brut) }
  } catch {
    return { ...VIDE }
  }
}

export function ecrire(s: Sauvegarde) {
  try {
    localStorage.setItem(CLE, JSON.stringify(s))
  } catch {
    /* navigation privee, quota: on joue sans sauvegarde */
  }
}

export function enregistrerGrille(id: string, r: Resultat): Sauvegarde {
  const s = lire()
  const ancien = s.grilles[id]
  if (!ancien || r.score > ancien.score) s.grilles[id] = r
  ecrire(s)
  return s
}

export function enregistrerQuotidien(date: string, r: Resultat): Sauvegarde {
  const s = lire()
  if (!s.quotidien[date]) {
    s.quotidien[date] = r
    const hier = new Date(date)
    hier.setDate(hier.getDate() - 1)
    const cleHier = hier.toISOString().slice(0, 10)
    s.serie = s.serie.dernier === cleHier
      ? { dernier: date, jours: s.serie.jours + 1 }
      : { dernier: date, jours: 1 }
  }
  ecrire(s)
  return s
}
