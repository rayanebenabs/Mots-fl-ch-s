import type { Grille } from '../types'
import { libelleObjectif, type CahierEtat, CRAYONS_PAR_CAHIER } from '../jeu/parcours'

interface Props {
  cahiers: CahierEtat[]
  onJouer: (g: Grille) => void
}

function Crayons({ n }: { n: number }) {
  return (
    <span className="crayons" aria-label={`${n} crayons sur 3`}>
      {[0, 1, 2].map(i => <i key={i} className={i < n ? 'plein' : ''} />)}
    </span>
  )
}

/** Le parcours : huit cahiers, six grilles chacun, un chemin qui serpente. */
export default function Parcours({ cahiers, onJouer }: Props) {
  const prochain = cahiers
    .flatMap(c => c.noeuds)
    .find(n => n.ouvert && !n.resultat)

  return (
    <div className="parcours">
      {cahiers.map(({ cahier, noeuds, crayons, ouvert, termine, manque }) => (
        <section key={cahier.numero} className={`cahier ${ouvert ? '' : 'ferme'}`}>
          <header className="cahier-entete">
            <span className={`cahier-num t-${cahier.theme}`}>{cahier.numero}</span>
            <span className="cahier-titre">
              <b>{cahier.nom}</b>
              <span>
                {ouvert
                  ? `${crayons}/${CRAYONS_PAR_CAHIER} crayons${termine ? ' · bouclé' : ''}`
                  : `Encore ${manque} crayon${manque > 1 ? 's' : ''} pour l’ouvrir`}
              </span>
            </span>
            {!ouvert && <span className="cahier-cadenas">🔒</span>}
          </header>

          <ol className="chemin">
            {noeuds.map((n, i) => {
              const courant = prochain?.grille.id === n.grille.id
              const etat = n.resultat ? 'fait' : n.ouvert ? 'ouvert' : 'ferme'
              return (
                <li key={n.grille.id} className={`etape p${i % 4}`}>
                  <button
                    className={`noeud ${etat} ${courant ? 'courant' : ''}`}
                    disabled={!n.ouvert}
                    onClick={() => onJouer(n.grille)}
                    aria-label={`Grille ${n.grille.rang} du cahier ${cahier.numero}`}
                  >
                    {n.resultat ? <Crayons n={n.crayons} /> : n.ouvert ? n.grille.rang : '🔒'}
                  </button>
                  {courant && (
                    <span className="etape-info">
                      <b>À toi</b>
                      {libelleObjectif(n.grille) && <span>{libelleObjectif(n.grille)}</span>}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>

          {ouvert && !termine && (
            <p className="cahier-pied">Récompense du cahier : ★ {cahier.recompense}</p>
          )}
        </section>
      ))}
    </div>
  )
}
