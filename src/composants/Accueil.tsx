import { useState } from 'react'
import type { Grille } from '../types'
import type { Sauvegarde } from '../jeu/stockage'
import { grilleDuJour, libelleDate, dateDuJour } from '../jeu/quotidien'
import Aide from './Aide'

const THEMES = [
  { cle: 'classique' as const, nom: 'À l’ancienne',
    accroche: 'Le mot fléché du kiosque : vocabulaire, conjugaisons, tournures.' },
  { cle: 'moderne' as const, nom: 'Pop, internet & quotidien',
    accroche: 'Séries, memes, actu et galères de tous les jours.' },
]

const NIVEAUX = [
  { n: 1, nom: 'Facile', desc: 'Des mots que tout le monde emploie' },
  { n: 2, nom: 'Moyen', desc: 'Il faut réfléchir un peu' },
  { n: 3, nom: 'Costaud', desc: 'Vocabulaire moins courant' },
  { n: 4, nom: 'Redoutable', desc: 'Mots rares, définitions retorses' },
]

interface Props {
  grilles: Grille[]
  sauvegarde: Sauvegarde
  onJouer: (g: Grille, quotidien: boolean) => void
}

export default function Accueil({ grilles, sauvegarde, onJouer }: Props) {
  const [aide, setAide] = useState(false)
  const jour = grilleDuJour(grilles)
  const faitAujourdhui = sauvegarde.quotidien[dateDuJour()]
  const reprise = (cle: string) => sauvegarde.enCours[cle]
  const jourEnCours = reprise(`jour:${dateDuJour()}`)

  const grilleDe = (theme: string, n: number) =>
    grilles.find(g => g.collection === 'campagne' && g.theme === theme && g.niveau === n)

  return (
    <div className="appli">
      <header className="entete">
        <span className="jeton" aria-label={`Série de ${sauvegarde.serie.jours} jours`}>
          🔥 {sauvegarde.serie.jours}
        </span>
        <span className="jeton" aria-label={`${sauvegarde.etoiles} étoiles`}>
          ★ {sauvegarde.etoiles}
        </span>
        <div className="milieu" />
        <button className="rond" onClick={() => setAide(true)} aria-label="Comment jouer">?</button>
      </header>

      <div className="defile">
        <div className="marque">
          <h1 className="titre">MOTS<br />FLÉCHÉS</h1>
          <p className="accroche">
            Des grilles pleines, comme au kiosque. Deux univers, quatre niveaux,
            une grille par jour.
          </p>
        </div>

        <button className="carte carte-jour" onClick={() => onJouer(jour, true)}>
          <div className="carte-entete">
            <h2>Défi du jour</h2>
            <span className="etiquette or">
              {faitAujourdhui ? 'Terminé' : jourEnCours ? 'À reprendre' : 'Nouveau'}
            </span>
          </div>
          <p className="meta">
            {libelleDate()} · {jour.mots.length} mots ·{' '}
            {jour.theme === 'classique' ? 'à l’ancienne' : 'pop & internet'}
            {faitAujourdhui && ` · ★ ${faitAujourdhui.score}`}
          </p>
          {jourEnCours && !faitAujourdhui && (
            <div className="jauge">
              <span style={{ width: `${(jourEnCours.motsTrouves.length / jour.mots.length) * 100}%` }} />
            </div>
          )}
        </button>

        {THEMES.map(theme => {
          const finis = NIVEAUX.filter(niv => {
            const g = grilleDe(theme.cle, niv.n)
            return g && sauvegarde.grilles[g.id]
          }).length
          return (
            <section key={theme.cle}>
              <p className="section-titre">{theme.nom} · {finis}/4</p>
              <p className="section-accroche">{theme.accroche}</p>
              {NIVEAUX.map(niv => {
                const g = grilleDe(theme.cle, niv.n)
                if (!g) return null
                const precedente = niv.n === 1 ? null : grilleDe(theme.cle, niv.n - 1)
                const ouvert = niv.n === 1 || !!(precedente && sauvegarde.grilles[precedente.id])
                const res = sauvegarde.grilles[g.id]
                const encours = reprise(g.id)
                return (
                  <button
                    key={g.id}
                    className={`carte niveau ${res ? 'faite' : ''}`}
                    disabled={!ouvert}
                    onClick={() => onJouer(g, false)}
                  >
                    <span className={`pastille-niveau n${niv.n}`}>{niv.n}</span>
                    <span className="niveau-corps">
                      <b>{niv.nom}</b>
                      <span className="meta">
                        {!ouvert ? 'Terminez le niveau précédent'
                          : encours ? `Repris à ${encours.motsTrouves.length}/${g.mots.length} mots`
                            : `${g.titre} · ${g.mots.length} mots`}
                      </span>
                      {ouvert && encours && (
                        <span className="jauge">
                          <span style={{ width: `${(encours.motsTrouves.length / g.mots.length) * 100}%` }} />
                        </span>
                      )}
                    </span>
                    <span className="etiquette">
                      {!ouvert ? '🔒' : res ? `★ ${res.score}` : encours ? 'Reprendre' : '→'}
                    </span>
                  </button>
                )
              })}
            </section>
          )
        })}

        <p className="section-titre">Cases spéciales et indices</p>
        <div className="carte"><Aide compact /></div>
        <div style={{ height: 20 }} />
      </div>

      {aide && <Aide onFermer={() => setAide(false)} />}
    </div>
  )
}
