import type { Grille, Resultat } from '../types'

const CLE = 'motsfleches.v1'

/** Pecule de depart: de quoi s offrir trois lettres, ou un mot court,
 *  avant meme d avoir termine une grille. */
export const ETOILES_DEPART = 80

/** Une partie laissee en plan, telle qu on la retrouve en revenant. */
export interface PartieEnCours {
  /** empreinte de la grille: une partie sauvegardee avant une regeneration
   *  du contenu ne correspondrait plus a la grille affichee */
  signature: string
  ecoule: number
  saisie: Record<string, string>
  figees: Record<string, true>
  revelees: Record<string, true>
  motsTrouves: number[]
  erreurs: number
  score: number
  motActif: number
  curseur: number
  indices: number
  indexOuvert: boolean
  solutions: boolean
}

export interface Sauvegarde {
  grilles: Record<string, Resultat>
  quotidien: Record<string, Resultat>   // date ISO -> resultat
  enCours: Record<string, PartieEnCours>
  serie: { dernier: string; jours: number }
  etoiles: number
}

const VIDE: Sauvegarde = {
  grilles: {}, quotidien: {}, enCours: {},
  serie: { dernier: '', jours: 0 }, etoiles: ETOILES_DEPART,
}

export function lire(): Sauvegarde {
  try {
    const brut = localStorage.getItem(CLE)
    if (!brut) return { ...VIDE }
    const s = { ...VIDE, ...JSON.parse(brut) }
    if (typeof s.etoiles !== 'number' || !isFinite(s.etoiles)) s.etoiles = ETOILES_DEPART
    return s
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

/** Une etoile pour cinq points, et seulement sur ce qui depasse le record
 *  precedent: refaire dix fois la meme grille ne rapporte rien.
 *  Une grille bien jouee vaut environ 120 etoiles, soit quatre lettres. */
export function etoilesPour(score: number, meilleurPrecedent: number) {
  return Math.max(0, Math.floor(score / 5) - Math.floor(meilleurPrecedent / 5))
}

export interface Gain { sauvegarde: Sauvegarde; etoilesGagnees: number }

export function enregistrerGrille(id: string, r: Resultat): Gain {
  const s = lire()
  // une grille ouverte a la page des solutions ne compte pas: ni record,
  // ni etoiles, sinon on rachete des indices avec ce qu ils ont revele
  delete s.enCours[id]
  if (r.solutions) { ecrire(s); return { sauvegarde: s, etoilesGagnees: 0 } }
  const ancien = s.grilles[id]
  const etoilesGagnees = etoilesPour(r.score, ancien?.score ?? 0)
  if (!ancien || r.score > ancien.score) s.grilles[id] = r
  s.etoiles += etoilesGagnees
  ecrire(s)
  return { sauvegarde: s, etoilesGagnees }
}

export function enregistrerQuotidien(date: string, r: Resultat): Gain {
  const s = lire()
  let etoilesGagnees = 0
  delete s.enCours[`jour:${date}`]
  if (r.solutions) { ecrire(s); return { sauvegarde: s, etoilesGagnees: 0 } }
  if (!s.quotidien[date]) {
    s.quotidien[date] = r
    etoilesGagnees = etoilesPour(r.score, 0)
    s.etoiles += etoilesGagnees
    const hier = new Date(date)
    hier.setDate(hier.getDate() - 1)
    const cleHier = hier.toISOString().slice(0, 10)
    s.serie = s.serie.dernier === cleHier
      ? { dernier: date, jours: s.serie.jours + 1 }
      : { dernier: date, jours: 1 }
  }
  ecrire(s)
  return { sauvegarde: s, etoilesGagnees }
}

/** Retire des etoiles du porte-monnaie. Renvoie le nouveau solde. */
export function depenser(cout: number): number {
  const s = lire()
  s.etoiles = Math.max(0, s.etoiles - cout)
  ecrire(s)
  return s.etoiles
}

/** Identifie la partie: le defi du jour repart de zero chaque jour. */
export function cleDePartie(grille: Grille, quotidien: boolean, date: string) {
  return quotidien ? `jour:${date}` : grille.id
}

export function signatureDe(grille: Grille) {
  return `${grille.mots.length}:${grille.solution[0]}`
}

export function lireEnCours(cle: string, grille: Grille): PartieEnCours | null {
  const enregistree = lire().enCours[cle]
  if (!enregistree || enregistree.signature !== signatureDe(grille)) return null
  return enregistree
}

export function ecrireEnCours(cle: string, partie: PartieEnCours) {
  const s = lire()
  s.enCours[cle] = partie
  ecrire(s)
}

export function effacerEnCours(cle: string): Sauvegarde {
  const s = lire()
  delete s.enCours[cle]
  ecrire(s)
  return s
}
