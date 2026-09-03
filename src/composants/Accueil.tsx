import { useState } from 'react'
import type { Grille } from '../types'
import type { Sauvegarde } from '../jeu/stockage'
import { grilleDuJour, libelleDate, dateDuJour } from '../jeu/quotidien'
import Aide from './Aide'

const NIVEAUX = [
  { n: 1, nom: 'Échauffement', desc: 'Grilles courtes, définitions directes' },
  { n: 2, nom: 'Ça se corse', desc: 'Plus de mots, plus de croisements' },
  { n: 3, nom: 'Pour les tenaces', desc: 'Références pointues, grilles longues' },
  { n: 4, nom: 'Boss final', desc: '8 × 12, aucune pitié' },
]

interface Props {
  grilles: Grille[]
  sauvegarde: Sauvegarde
  onJouer: (g: Grille, quotidien: boolean) => void
}

export default function Accueil({ grilles, sauvegarde, onJouer }: Props) {
  const [aide, setAide] = useState(false)
  const [ouvert, setOuvert] = useState<number | null>(null)
  const jour = grilleDuJour(grilles)
  const faitAujourdhui = sauvegarde.quotidien[dateDuJour()]

  const grillesDe = (n: number) =>
    grilles.filter(g => g.collection === 'campagne' && g.niveau === n)
  const finies = (n: number) =>
    grillesDe(n).filter(g => sauvegarde.grilles[g.id]).length

  const debloque = (n: number) =>
    n === 1 || finies(n - 1) >= Math.max(1, grillesDe(n - 1).length - 1)

  return (
    <div className="appli">
      <header className="entete">
        <span className="jeton">🔥 {sauvegarde.serie.jours}</span>
        <div className="milieu" />
        <button className="rond" onClick={() => setAide(true)} aria-label="Comment jouer">?</button>
      </header>

      <div className="defile">
        <div className="marque">
          <h1 className="titre">MOTS<br />FLÉCHÉS</h1>
          <p className="accroche">
            Pop culture, actu et références qui piquent. Quatre niveaux, une grille par jour.
          </p>
        </div>

        <button className="carte carte-jour" onClick={() => onJouer(jour, true)}>
          <div className="carte-entete">
            <h2>Défi du jour</h2>
            <span className="etiquette or">{faitAujourdhui ? 'Terminé' : 'Nouveau'}</span>
          </div>
          <p className="meta">
            {libelleDate()} · {jour.cols}×{jour.rows} · {jour.mots.length} mots
            {faitAujourdhui && ` · ★ ${faitAujourdhui.score}`}
          </p>
        </button>

        <p className="section-titre">Les 4 niveaux</p>

        {NIVEAUX.map(niv => {
          const liste = grillesDe(niv.n)
          const ok = debloque(niv.n)
          const fait = finies(niv.n)
          return (
            <div key={niv.n} className="carte" style={{ opacity: ok ? 1 : .45 }}>
              <button
                style={{ all: 'unset', display: 'block', width: '100%', cursor: 'pointer' }}
                disabled={!ok}
                onClick={() => setOuvert(ouvert === niv.n ? null : niv.n)}
              >
                <div className="carte-entete">
                  <h2>{niv.n}. {niv.nom}</h2>
                  <span className="etiquette">{ok ? `${fait}/${liste.length}` : '🔒'}</span>
                </div>
                <p className="meta">{ok ? niv.desc : 'Terminez le niveau précédent'}</p>
                <div className="jauge">
                  <span style={{ width: `${liste.length ? (fait / liste.length) * 100 : 0}%` }} />
                </div>
              </button>

              {ouvert === niv.n && ok && (
                <div className="puces">
                  {liste.map((g, i) => {
                    const res = sauvegarde.grilles[g.id]
                    return (
                      <button
                        key={g.id}
                        className={`puce ${res ? 'faite' : ''}`}
                        onClick={() => onJouer(g, false)}
                      >
                        <b>Grille {i + 1}</b>
                        {res ? `★ ${res.score}` : `${g.mots.length} mots`}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        <p className="section-titre">Cases spéciales</p>
        <div className="carte">
          <Aide compact />
        </div>
        <div style={{ height: 20 }} />
      </div>

      {aide && <Aide onFermer={() => setAide(false)} />}
    </div>
  )
}
