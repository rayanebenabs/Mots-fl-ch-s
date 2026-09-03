import type { Grille, Resultat } from '../types'
import type { Sauvegarde } from './stockage'

export interface Cahier {
  numero: number
  nom: string
  theme: 'classique' | 'moderne'
  /** crayons cumulés exigés pour l'ouvrir */
  porte: number
  /** étoiles versées quand les six grilles sont terminées */
  recompense: number
}

export interface Noeud {
  grille: Grille
  resultat?: Resultat
  ouvert: boolean
  crayons: number
}

export interface CahierEtat {
  cahier: Cahier
  noeuds: Noeud[]
  /** crayons récoltés dans ce cahier, sur 18 */
  crayons: number
  ouvert: boolean
  termine: boolean
  /** crayons qu'il manque encore pour l'ouvrir */
  manque: number
}

export const CRAYONS_PAR_CAHIER = 18

export function crayonsDe(r?: Resultat): number {
  if (!r) return 0
  // les anciens enregistrements n'avaient pas de note: on la recalcule
  if (typeof r.crayons === 'number') return r.crayons
  return 1 + (r.erreurs === 0 ? 1 : 0)
}

export function crayonsTotal(grilles: Grille[], sauvegarde: Sauvegarde): number {
  return grilles
    .filter(g => g.collection === 'parcours')
    .reduce((n, g) => n + crayonsDe(sauvegarde.grilles[g.id]), 0)
}

/**
 * L'état complet du parcours. Un cahier s'ouvre avec assez de crayons ;
 * à l'intérieur, une grille s'ouvre quand la précédente est terminée.
 */
export function etatDuParcours(
  grilles: Grille[], cahiers: Cahier[], sauvegarde: Sauvegarde,
): CahierEtat[] {
  const total = crayonsTotal(grilles, sauvegarde)
  return cahiers.map(cahier => {
    const dedans = grilles
      .filter(g => g.collection === 'parcours' && g.cahier === cahier.numero)
      .sort((a, b) => (a.rang ?? 0) - (b.rang ?? 0))
    const ouvert = total >= cahier.porte
    const noeuds: Noeud[] = dedans.map((grille, i) => {
      const resultat = sauvegarde.grilles[grille.id]
      const precedente = i === 0 ? null : dedans[i - 1]
      return {
        grille,
        resultat,
        crayons: crayonsDe(resultat),
        ouvert: ouvert && (i === 0 || !!sauvegarde.grilles[precedente!.id]),
      }
    })
    return {
      cahier,
      noeuds,
      crayons: noeuds.reduce((n, x) => n + x.crayons, 0),
      ouvert,
      termine: noeuds.length > 0 && noeuds.every(n => !!n.resultat),
      manque: Math.max(0, cahier.porte - total),
    }
  })
}

export function libelleObjectif(g: Grille): string | null {
  const o = g.objectif
  if (!o) return null
  if (o.type === 'sansIndice') return 'Sans le moindre indice'
  if (o.type === 'chrono') return `En moins de ${o.valeur} minutes`
  return `${o.valeur} mots d’affilée sans faute`
}
