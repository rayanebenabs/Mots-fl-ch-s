import type { MotNumerote, Resultat } from '../types'
import { cle, cellulesDe, lettresOffertes, preparer, type PlanGrille } from './grille'

export const POINTS_PAR_LETTRE = 10
export const MALUS_ERREUR = 15
export const BONUS_SANS_FAUTE = 120

export interface EtatPartie {
  saisie: Record<string, string>
  /** cases figees: lettres offertes + lettres de mots valides */
  figees: Record<string, true>
  motsTrouves: number[]
  erreurs: number
  score: number
  motActif: number
  curseur: number
  debut: number
  finiA: number | null
  /** id du dernier mot rate, pour l animation */
  rate: number | null
}

export function nouvellePartie(plan: PlanGrille): EtatPartie {
  const offertes = lettresOffertes(plan)
  const figees: Record<string, true> = {}
  for (const k of Object.keys(offertes)) figees[k] = true
  const premier = plan.mots[0]
  return {
    saisie: { ...offertes },
    figees,
    motsTrouves: [],
    erreurs: 0,
    score: 0,
    motActif: premier ? premier.id : -1,
    curseur: premier ? premierCurseur(premier, figees) : 0,
    debut: Date.now(),
    finiA: null,
    rate: null,
  }
}

function premierCurseur(mot: MotNumerote, figees: Record<string, true>) {
  const cells = cellulesDe(mot)
  const i = cells.findIndex(([r, c]) => !figees[cle(r, c)])
  return i === -1 ? 0 : i
}

export function selectionner(etat: EtatPartie, mot: MotNumerote): EtatPartie {
  return { ...etat, motActif: mot.id, curseur: premierCurseur(mot, etat.figees), rate: null }
}

/** Mot suivant / precedent, en sautant ceux deja trouves. */
export function motVoisin(plan: PlanGrille, etat: EtatPartie, pas: 1 | -1): MotNumerote {
  const n = plan.mots.length
  const depart = plan.mots.findIndex(m => m.id === etat.motActif)
  for (let i = 1; i <= n; i++) {
    const cand = plan.mots[(depart + pas * i + n * n) % n]
    if (!etat.motsTrouves.includes(cand.id)) return cand
  }
  return plan.mots[(depart + pas + n) % n]
}

function contientBonus(plan: PlanGrille, mot: MotNumerote) {
  return cellulesDe(mot).some(([r, c]) => plan.special.get(cle(r, c)) === 'bonus')
}

/** Ecrit une lettre sur la case courante et fait avancer le curseur. */
export function taper(plan: PlanGrille, etat: EtatPartie, lettre: string): EtatPartie {
  const mot = plan.parId.get(etat.motActif)
  if (!mot || etat.finiA) return etat
  const cells = cellulesDe(mot)
  let i = etat.curseur
  while (i < cells.length && etat.figees[cle(...cells[i])]) i++
  if (i >= cells.length) return etat
  const saisie = { ...etat.saisie, [cle(...cells[i])]: lettre }
  let j = i + 1
  while (j < cells.length && etat.figees[cle(...cells[j])]) j++
  return controler(plan, { ...etat, saisie, curseur: Math.min(j, cells.length - 1), rate: null })
}

export function effacer(plan: PlanGrille, etat: EtatPartie): EtatPartie {
  const mot = plan.parId.get(etat.motActif)
  if (!mot || etat.finiA) return etat
  const cells = cellulesDe(mot)
  let i = etat.curseur
  const vide = (k: number) => !etat.saisie[cle(...cells[k])]
  if (vide(i) || etat.figees[cle(...cells[i])]) {
    let j = i - 1
    while (j >= 0 && etat.figees[cle(...cells[j])]) j--
    if (j < 0) return { ...etat, curseur: 0 }
    i = j
  }
  const saisie = { ...etat.saisie }
  delete saisie[cle(...cells[i])]
  return { ...etat, saisie, curseur: i, rate: null }
}

export function deplacerCurseur(etat: EtatPartie, i: number): EtatPartie {
  return { ...etat, curseur: i, rate: null }
}

/**
 * Verifie tous les mots entierement remplis. Un mot juste se verrouille et
 * rapporte des points; un mot faux coute des points et ses lettres fautives
 * sont effacees.
 */
function controler(plan: PlanGrille, etat: EtatPartie): EtatPartie {
  let { saisie, figees, score, erreurs } = etat
  const trouves = [...etat.motsTrouves]
  let rate: number | null = null
  let change = true

  while (change) {
    change = false
    for (const mot of plan.mots) {
      if (trouves.includes(mot.id)) continue
      const cells = cellulesDe(mot)
      if (!cells.every(([r, c]) => saisie[cle(r, c)])) continue
      const propose = cells.map(([r, c]) => saisie[cle(r, c)]).join('')
      if (propose === mot.reponse) {
        trouves.push(mot.id)
        figees = { ...figees }
        for (const [r, c] of cells) figees[cle(r, c)] = true
        score += mot.long * POINTS_PAR_LETTRE * (contientBonus(plan, mot) ? 2 : 1)
        change = true
      } else {
        erreurs += 1
        score = Math.max(0, score - MALUS_ERREUR)
        rate = mot.id
        saisie = { ...saisie }
        cells.forEach(([r, c], k) => {
          const k2 = cle(r, c)
          if (!figees[k2] && saisie[k2] !== mot.reponse[k]) delete saisie[k2]
        })
      }
    }
  }

  const fini = trouves.length === plan.mots.length
  if (fini && !etat.finiA && erreurs === 0) score += BONUS_SANS_FAUTE
  return {
    ...etat, saisie, figees, score, erreurs, motsTrouves: trouves, rate,
    finiA: fini ? (etat.finiA ?? Date.now()) : null,
  }
}

export function resultat(plan: PlanGrille, etat: EtatPartie): Resultat {
  return {
    score: etat.score,
    erreurs: etat.erreurs,
    tempsMs: (etat.finiA ?? Date.now()) - etat.debut,
    motsTrouves: etat.motsTrouves.length,
    motsTotal: plan.mots.length,
    sansFaute: etat.erreurs === 0,
  }
}

export { preparer }
export type { PlanGrille }

