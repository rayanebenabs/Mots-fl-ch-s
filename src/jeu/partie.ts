import type { MotNumerote, Resultat } from '../types'
import type { PartieEnCours } from './stockage'
import { cle, cellulesDe, lettresOffertes, preparer, type PlanGrille } from './grille'

export const POINTS_PAR_LETTRE = 10
export const MALUS_ERREUR = 15
export const BONUS_SANS_FAUTE = 120

/** Tarifs des indices, en etoiles du porte-monnaie. */
export const COUT_LETTRE = 25
export const COUT_MOT_PAR_LETTRE = 15
export const COUT_MOT_MINIMUM = 45
export const COUT_INDEX = 40
export const COUT_SOLUTIONS = 200

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
  /** cases devoilees par un indice: on ne les masque plus */
  revelees: Record<string, true>
  indices: number
  /** l index du magazine: la liste de toutes les definitions */
  indexOuvert: boolean
  /** la page des solutions a ete achetee: la grille ne rapporte plus rien */
  solutions: boolean
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
    revelees: {},
    indices: 0,
    indexOuvert: false,
    solutions: false,
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

/** Cases du mot actif qui n ont pas encore leur bonne lettre. */
export function casesADevoiler(plan: PlanGrille, etat: EtatPartie): Array<[number, number]> {
  const mot = plan.parId.get(etat.motActif)
  if (!mot || etat.finiA) return []
  return cellulesDe(mot).filter(([r, c]) => {
    const k = cle(r, c)
    return !etat.figees[k] && etat.saisie[k] !== plan.solution.get(k)
  })
}

export function coutDuMot(plan: PlanGrille, etat: EtatPartie): number {
  const n = casesADevoiler(plan, etat).length
  return n === 0 ? 0 : Math.max(COUT_MOT_MINIMUM, n * COUT_MOT_PAR_LETTRE)
}

/** La case que revelerait l indice "une lettre": celle du curseur si elle est
 *  encore a trouver, sinon la premiere qui l est. */
export function caseDuProchainIndice(
  plan: PlanGrille, etat: EtatPartie,
): [number, number] | null {
  const restantes = casesADevoiler(plan, etat)
  if (!restantes.length) return null
  const mot = plan.parId.get(etat.motActif)!
  const sousCurseur = cellulesDe(mot)[etat.curseur]
  const viseeCurseur = restantes.find(
    ([r, c]) => sousCurseur && r === sousCurseur[0] && c === sousCurseur[1])
  return viseeCurseur ?? restantes[0]
}

function devoiler(
  plan: PlanGrille, etat: EtatPartie, cases: Array<[number, number]>,
): EtatPartie {
  if (!cases.length) return etat
  const saisie = { ...etat.saisie }
  const figees = { ...etat.figees }
  const revelees = { ...etat.revelees }
  for (const [r, c] of cases) {
    const k = cle(r, c)
    saisie[k] = plan.solution.get(k)!
    figees[k] = true
    revelees[k] = true
  }
  return controler(plan, {
    ...etat, saisie, figees, revelees, indices: etat.indices + 1, rate: null,
  })
}

/** Indice "une lettre": devoile la case visee et la verrouille. */
export function revelerLettre(plan: PlanGrille, etat: EtatPartie): EtatPartie {
  const cible = caseDuProchainIndice(plan, etat)
  return cible ? devoiler(plan, etat, [cible]) : etat
}

/** Indice "le mot entier": devoile toutes les cases manquantes du mot actif. */
export function revelerMot(plan: PlanGrille, etat: EtatPartie): EtatPartie {
  return devoiler(plan, etat, casesADevoiler(plan, etat))
}

/** L index: la liste de toutes les definitions, comme au dos du magazine. */
export function ouvrirIndex(etat: EtatPartie): EtatPartie {
  return { ...etat, indexOuvert: true }
}

/** La page des solutions: toute la grille d un coup. */
export function revelerTout(plan: PlanGrille, etat: EtatPartie): EtatPartie {
  const cases: Array<[number, number]> = []
  plan.solution.forEach((lettre, k) => {
    if (etat.saisie[k] !== lettre) {
      const [r, c] = k.split(',').map(Number)
      cases.push([r, c])
    }
  })
  const suite = devoiler(plan, { ...etat, solutions: true }, cases)
  return { ...suite, indices: etat.indices, solutions: true }
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
    indices: etat.indices,
    solutions: etat.solutions,
  }
}

export { preparer }
export type { PlanGrille }


/** Ce qu on garde d une partie quittee en cours de route. Le temps est
 *  stocke en duree ecoulee, pas en heure de depart: sinon une partie reprise
 *  le lendemain afficherait vingt heures de jeu. */
export function pourSauvegarde(etat: EtatPartie, signature: string): PartieEnCours {
  return {
    signature,
    ecoule: Date.now() - etat.debut,
    saisie: etat.saisie,
    figees: etat.figees,
    revelees: etat.revelees,
    motsTrouves: etat.motsTrouves,
    erreurs: etat.erreurs,
    score: etat.score,
    motActif: etat.motActif,
    curseur: etat.curseur,
    indices: etat.indices,
    indexOuvert: etat.indexOuvert,
    solutions: etat.solutions,
  }
}

export function depuisSauvegarde(p: PartieEnCours): EtatPartie {
  return {
    saisie: p.saisie,
    figees: p.figees,
    revelees: p.revelees,
    motsTrouves: p.motsTrouves,
    erreurs: p.erreurs,
    score: p.score,
    motActif: p.motActif,
    curseur: p.curseur,
    indices: p.indices,
    indexOuvert: p.indexOuvert,
    solutions: p.solutions,
    debut: Date.now() - p.ecoule,
    finiA: null,
    rate: null,
  }
}
