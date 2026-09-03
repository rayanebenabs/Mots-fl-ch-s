import { useState } from 'react'
import type { Grille } from '../types'
import type { Sauvegarde } from '../jeu/stockage'
import { enregistrerNomsDuo } from '../jeu/stockage'
import { etatDuParcours, crayonsTotal, type Cahier } from '../jeu/parcours'
import type { Duo } from '../jeu/partie'
import { grilleDuJour, libelleDate, dateDuJour } from '../jeu/quotidien'
import Parcours from './Parcours'
import Aide from './Aide'

interface Props {
  grilles: Grille[]
  cahiers: Cahier[]
  sauvegarde: Sauvegarde
  onJouer: (g: Grille, quotidien: boolean, duo: Duo | null) => void
}

export default function Accueil({ grilles, cahiers, sauvegarde, onJouer }: Props) {
  const [aide, setAide] = useState(false)
  const [aDeux, setADeux] = useState(false)
  const [noms, setNoms] = useState<[string, string]>(sauvegarde.duoNoms)
  const [reglages, setReglages] = useState(false)

  const jour = grilleDuJour(grilles)
  const faitAujourdhui = sauvegarde.quotidien[dateDuJour()]
  const jourEnCours = sauvegarde.enCours[`jour:${dateDuJour()}` + (aDeux ? '#duo' : '')]
  const etat = etatDuParcours(grilles, cahiers, sauvegarde)
  const total = crayonsTotal(grilles, sauvegarde)
  const possibles = grilles.filter(g => g.collection === 'parcours').length * 3

  const lancer = (g: Grille, quotidien: boolean) =>
    onJouer(g, quotidien, aDeux ? { noms, actif: 0, trouves: [0, 0] } : null)

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
            Huit cahiers, quarante-huit grilles pleines. On avance de l’une à
            l’autre en récoltant des crayons.
          </p>
          <p className="compteur-crayons">
            <b>{total}</b> / {possibles} crayons
          </p>
        </div>

        <div className="bascule" role="tablist" aria-label="Nombre de joueurs">
          <button role="tab" aria-selected={!aDeux} className={!aDeux ? 'actif' : ''}
                  onClick={() => setADeux(false)}>Solo</button>
          <button role="tab" aria-selected={aDeux} className={aDeux ? 'actif' : ''}
                  onClick={() => { setADeux(true); setReglages(true) }}>À deux</button>
          {aDeux && (
            <button className="bascule-noms" onClick={() => setReglages(true)}>
              {noms[0]} &amp; {noms[1]} ✎
            </button>
          )}
        </div>

        <button className="carte carte-jour" onClick={() => lancer(jour, true)}>
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

        <p className="section-titre">Le parcours</p>
        <Parcours cahiers={etat} onJouer={g => lancer(g, false)} />

        <p className="section-titre">Cases spéciales et indices</p>
        <div className="carte"><Aide compact /></div>
        <div style={{ height: 20 }} />
      </div>

      {aide && <Aide onFermer={() => setAide(false)} />}

      {reglages && (
        <div className="voile" onClick={() => setReglages(false)}>
          <div className="feuille" onClick={e => e.stopPropagation()}>
            <h2>Qui joue ?</h2>
            <p className="aide" style={{ margin: '2px 0 0' }}>
              On se passe le téléphone : chacun remplit un mot, puis rend la main.
              Le score est commun, la grille se gagne à deux.
            </p>
            <div className="champs">
              {[0, 1].map(i => (
                <label key={i} className={`champ j${i}`}>
                  <span>Joueur {i + 1}</span>
                  <input
                    value={noms[i]}
                    maxLength={14}
                    onChange={e => setNoms(n => (i === 0 ? [e.target.value, n[1]] : [n[0], e.target.value]))}
                  />
                </label>
              ))}
            </div>
            <button
              className="bouton"
              onClick={() => {
                const propres: [string, string] = [
                  noms[0].trim() || 'Joueur 1', noms[1].trim() || 'Joueur 2']
                setNoms(propres)
                enregistrerNomsDuo(propres)
                setReglages(false)
              }}
            >
              C’est parti
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
