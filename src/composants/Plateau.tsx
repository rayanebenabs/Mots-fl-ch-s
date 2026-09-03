import type { PlanGrille } from '../jeu/grille'
import { cle, cellulesDe, FLECHE_GLYPHE } from '../jeu/grille'
import type { EtatPartie } from '../jeu/partie'
import type { Grille, MotNumerote } from '../types'

interface Props {
  grille: Grille
  plan: PlanGrille
  etat: EtatPartie
  onCase: (r: number, c: number) => void
  onMot: (mot: MotNumerote) => void
}

export default function Plateau({ grille, plan, etat, onCase, onMot }: Props) {
  const actif = plan.parId.get(etat.motActif)
  const casesActives = new Set(actif ? cellulesDe(actif).map(([r, c]) => cle(r, c)) : [])
  const curseurCle = actif ? cle(...cellulesDe(actif)[etat.curseur]) : ''
  const rate = etat.rate !== null ? plan.parId.get(etat.rate) : null
  const casesRatees = new Set(rate ? cellulesDe(rate).map(([r, c]) => cle(r, c)) : [])

  return (
    <div className="zone-grille">
      <div
        className={`plateau${etat.duo ? ` duo${etat.duo.actif}` : ''}`}
        style={{
          gridTemplateColumns: `repeat(${grille.cols}, var(--taille))`,
          ['--cols' as string]: grille.cols,
          ['--rows' as string]: grille.rows,
        }}
      >
        {Array.from({ length: grille.rows * grille.cols }, (_, i) => {
          const r = Math.floor(i / grille.cols)
          const c = i % grille.cols
          const k = cle(r, c)
          const definitions = plan.defs.get(k)

          if (definitions) {
            return (
              <div key={k} className="cellule def">
                {definitions.map(m => {
                  const trouve = etat.motsTrouves.includes(m.id)
                  return (
                    <button
                      key={m.id}
                      className={['def-part', trouve ? 'trouve' : '',
                        m.id === etat.motActif ? 'active' : ''].join(' ')}
                      onClick={() => onMot(m)}
                      aria-label={`Définition ${m.numero} : ${m.definition}`}
                    >
                      {m.numero}
                      <span className="fl">{FLECHE_GLYPHE[m.fleche]}</span>
                    </button>
                  )
                })}
              </div>
            )
          }

          const ids = plan.parCase.get(k)
          if (!ids) {
            // le coin ne peut annoncer aucun mot: il porte le badge de la
            // grille, comme le numero de page dans le magazine
            if (r === 0 && c === 0) {
              return (
                <div key={k} className={`cellule coin n${grille.niveau}`}>
                  <b>{grille.niveau}</b>
                  <i>{grille.theme === 'classique' ? 'rétro' : 'pop'}</i>
                </div>
              )
            }
            return <div key={k} className="cellule" />
          }

          const lettre = etat.saisie[k] ?? ''
          const type = plan.special.get(k)
          const trouve = ids.some(id => etat.motsTrouves.includes(id))
          // une lettre payee avec des etoiles n est jamais masquee
          const revelee = !!etat.revelees[k]
          const masque = type === 'mystere' && !trouve && lettre && !revelee
          return (
            <button
              key={k}
              className={['cellule', 'lettre',
                lettre ? 'remplie' : '',
                casesActives.has(k) ? 'active-mot' : '',
                k === curseurCle ? 'curseur' : '',
                trouve ? 'juste' : '',
                casesRatees.has(k) ? 'faux' : '',
                revelee && !trouve ? 'revelee' : '',
                type ?? ''].filter(Boolean).join(' ')}
              onClick={() => onCase(r, c)}
              aria-label={`Ligne ${r + 1} colonne ${c + 1}${lettre ? `, ${lettre}` : ', vide'}`}
            >
              {masque ? '?' : lettre}

            </button>
          )
        })}
      </div>
    </div>
  )
}
