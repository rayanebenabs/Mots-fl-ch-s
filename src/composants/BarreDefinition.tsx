import type { PlanGrille } from '../jeu/grille'
import type { EtatPartie } from '../jeu/partie'
import type { MotNumerote } from '../types'

interface Props {
  plan: PlanGrille
  etat: EtatPartie
  onMot: (mot: MotNumerote) => void
  onPas: (pas: 1 | -1) => void
}

export default function BarreDefinition({ plan, etat, onMot, onPas }: Props) {
  const actif = plan.parId.get(etat.motActif)
  return (
    <>
      <div className="numeros" role="tablist" aria-label="Numéros des définitions">
        {plan.mots.map(m => (
          <button
            key={m.id}
            role="tab"
            aria-selected={m.id === etat.motActif}
            className={['num', etat.motsTrouves.includes(m.id) ? 'trouve' : '',
              m.id === etat.motActif ? 'actif' : ''].filter(Boolean).join(' ')}
            onClick={() => onMot(m)}
          >
            {m.numero}
          </button>
        ))}
      </div>

      <div className="barre-def">
        <button className="fleche-nav" onClick={() => onPas(-1)} aria-label="Définition précédente">‹</button>
        <div className="corps">
          {actif ? (
            <>
              <div className="ligne">
                <span className="pastille-num">{actif.numero}</span>
                <span className="longueur">
                  {actif.long} lettres · {actif.dir === 'h' ? 'horizontal' : 'vertical'}
                </span>
              </div>
              <p className="texte">{actif.definition}</p>
            </>
          ) : <p className="texte">—</p>}
        </div>
        <button className="fleche-nav" onClick={() => onPas(1)} aria-label="Définition suivante">›</button>
      </div>
    </>
  )
}
