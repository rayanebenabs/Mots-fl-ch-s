import type { Grille, Mot, MotNumerote, CaseSpeciale, TypeSpecial } from '../types'

export const cle = (r: number, c: number) => `${r},${c}`

/**
 * Numerote les mots dans l ordre de lecture des cases definition.
 * Une case qui porte deux definitions affiche donc deux numeros consecutifs.
 */
export function numeroter(grille: Grille): MotNumerote[] {
  const tries = [...grille.mots].sort((a, b) =>
    a.defR - b.defR || a.defC - b.defC || a.defSlot - b.defSlot)
  return tries.map((m, i) => ({ ...m, numero: i + 1 }))
}

export function cellulesDe(m: Mot): Array<[number, number]> {
  return Array.from({ length: m.long }, (_, k) =>
    m.dir === 'h' ? [m.r, m.c + k] : [m.r + k, m.c] as [number, number]) as Array<[number, number]>
}

export interface PlanGrille {
  mots: MotNumerote[]
  parId: Map<number, MotNumerote>
  /** cle "r,c" -> ids des mots qui traversent la case */
  parCase: Map<string, number[]>
  defs: Map<string, MotNumerote[]>
  special: Map<string, TypeSpecial>
  /** lettre attendue pour chaque case lettre */
  solution: Map<string, string>
}

export function preparer(grille: Grille): PlanGrille {
  const mots = numeroter(grille)
  const parId = new Map(mots.map(m => [m.id, m]))
  const parCase = new Map<string, number[]>()
  const solution = new Map<string, string>()
  for (const m of mots) {
    cellulesDe(m).forEach(([r, c], k) => {
      const k2 = cle(r, c)
      if (!parCase.has(k2)) parCase.set(k2, [])
      parCase.get(k2)!.push(m.id)
      solution.set(k2, m.reponse[k])
    })
  }
  const defs = new Map<string, MotNumerote[]>()
  for (const d of grille.defs) {
    defs.set(cle(d.r, d.c),
      d.mots.map(id => parId.get(id)!).sort((a, b) => a.defSlot - b.defSlot))
  }
  const special = new Map<string, TypeSpecial>(
    grille.special.map((s: CaseSpeciale) => [cle(s.r, s.c), s.type]))
  return { mots, parId, parCase, defs, special, solution }
}

/** Les lettres offertes au demarrage (cases cadeau). */
export function lettresOffertes(plan: PlanGrille): Record<string, string> {
  const out: Record<string, string> = {}
  plan.special.forEach((type, k) => {
    if (type === 'cadeau') out[k] = plan.solution.get(k) ?? ''
  })
  return out
}

export const FLECHE_GLYPHE: Record<string, string> = {
  droite: '→',
  bas: '↓',
  'bas-droite': '↳',
  'droite-bas': '↴',
}
