import type { PlanGrille } from '../jeu/grille'
import { FLECHE_GLYPHE } from '../jeu/grille'
import type { EtatPartie } from '../jeu/partie'
import type { MotNumerote } from '../types'

interface Props {
  plan: PlanGrille
  etat: EtatPartie
  onMot: (mot: MotNumerote) => void
  onFermer: () => void
}

/** L index du magazine: toutes les définitions de la grille, d'un coup d'œil. */
export default function IndexGrille({ plan, etat, onMot, onFermer }: Props) {
  const restants = plan.mots.filter(m => !etat.motsTrouves.includes(m.id)).length
  return (
    <div className="voile" onClick={onFermer}>
      <div className="feuille haute" onClick={e => e.stopPropagation()}>
        <div className="feuille-entete">
          <h2>Index</h2>
          <span className="jeton">{restants} à trouver</span>
        </div>
        <p className="aide" style={{ margin: '2px 0 10px' }}>
          Touchez une ligne pour sauter à ce mot.
        </p>

        <ol className="index-liste">
          {plan.mots.map(m => {
            const trouve = etat.motsTrouves.includes(m.id)
            return (
              <li key={m.id}>
                <button
                  className={`index-ligne ${trouve ? 'trouve' : ''} ${m.id === etat.motActif ? 'actif' : ''}`}
                  onClick={() => { onMot(m); onFermer() }}
                >
                  <span className="index-num">{m.numero}<i>{FLECHE_GLYPHE[m.fleche]}</i></span>
                  <span className="index-texte">{m.definition}</span>
                  <span className="index-long">
                    {trouve ? m.reponse : `${m.long} l.`}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>

        <button className="bouton secondaire" onClick={onFermer}>Fermer</button>
      </div>
    </div>
  )
}
