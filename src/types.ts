export type Fleche = 'droite' | 'bas' | 'bas-droite' | 'droite-bas'
export type TypeSpecial = 'bonus' | 'mystere' | 'cadeau'

export interface Mot {
  id: number
  r: number
  c: number
  dir: 'h' | 'v'
  long: number
  reponse: string
  definition: string
  theme: string
  fleche: Fleche
  defR: number
  defC: number
  defSlot: number
  defTotal: number
}

export interface CaseDef { r: number; c: number; mots: number[] }
export interface CaseSpeciale { r: number; c: number; type: TypeSpecial }

export interface Grille {
  id: string
  niveau: number
  titre: string
  collection: 'campagne' | 'quotidien'
  cols: number
  rows: number
  mots: Mot[]
  defs: CaseDef[]
  special: CaseSpeciale[]
  solution: string[]
}

/** Un mot enrichi de son numero d affichage dans la grille. */
export interface MotNumerote extends Mot { numero: number }

export interface Resultat {
  score: number
  erreurs: number
  tempsMs: number
  motsTrouves: number
  motsTotal: number
  sansFaute: boolean
  indices: number
}
