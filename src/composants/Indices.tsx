import type { PlanGrille } from '../jeu/grille'
import {
  COUT_LETTRE, casesADevoiler, coutDuMot, type EtatPartie,
} from '../jeu/partie'

interface Props {
  plan: PlanGrille
  etat: EtatPartie
  etoiles: number
  onLettre: () => void
  onMot: () => void
  onFermer: () => void
}

export default function Indices({ plan, etat, etoiles, onLettre, onMot, onFermer }: Props) {
  const restantes = casesADevoiler(plan, etat).length
  const prixMot = coutDuMot(plan, etat)
  const mot = plan.parId.get(etat.motActif)

  const offres = [
    {
      cle: 'lettre',
      titre: 'Une lettre',
      detail: 'Dévoile et verrouille une case du mot en cours.',
      prix: COUT_LETTRE,
      possible: restantes > 0,
      action: onLettre,
    },
    {
      cle: 'mot',
      titre: 'Le mot entier',
      detail: restantes > 0
        ? `Les ${restantes} case${restantes > 1 ? 's' : ''} qui manquent, d’un coup.`
        : 'Ce mot est déjà complet.',
      prix: prixMot,
      possible: restantes > 0,
      action: onMot,
    },
  ]

  return (
    <div className="voile" onClick={onFermer}>
      <div className="feuille" onClick={e => e.stopPropagation()}>
        <div className="feuille-entete">
          <h2>Un coup de pouce ?</h2>
          <span className="jeton">★ {etoiles}</span>
        </div>
        <p className="aide" style={{ margin: '2px 0 0' }}>
          {mot ? <>Définition {mot.numero} · {mot.long} lettres</> : 'Aucun mot sélectionné'}
        </p>

        <div className="offres">
          {offres.map(o => {
            const abordable = o.possible && etoiles >= o.prix
            return (
              <button
                key={o.cle}
                className="offre"
                disabled={!abordable}
                onClick={o.action}
              >
                <span className="offre-texte">
                  <b>{o.titre}</b>
                  <span>{o.detail}</span>
                </span>
                <span className={`prix ${abordable ? '' : 'hors-budget'}`}>
                  ★ {o.prix}
                </span>
              </button>
            )
          })}
        </div>

        {offres.some(o => o.possible && etoiles < o.prix) && (
          <p className="aide" style={{ marginBottom: 0 }}>
            Il vous manque des étoiles. Vous en gagnez une pour cinq points
            marqués, chaque fois que vous battez votre record sur une grille.
          </p>
        )}

        <button className="bouton secondaire" onClick={onFermer}>Je me débrouille</button>
      </div>
    </div>
  )
}
