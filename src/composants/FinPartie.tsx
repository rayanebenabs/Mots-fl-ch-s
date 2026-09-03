import { useState } from 'react'
import { texteDePartage } from '../jeu/quotidien'
import type { Resultat } from '../types'

interface Props {
  resultat: Resultat
  etoilesGagnees: number
  quotidien: boolean
  onRejouer: () => void
  onFermer: () => void
}

export default function FinPartie(
  { resultat: r, etoilesGagnees, quotidien, onRejouer, onFermer }: Props,
) {
  const [copie, setCopie] = useState(false)
  const min = Math.floor(r.tempsMs / 60000)
  const sec = Math.floor((r.tempsMs % 60000) / 1000)

  const partager = async () => {
    const texte = texteDePartage(r)
    try {
      if (navigator.share) await navigator.share({ text: texte })
      else {
        await navigator.clipboard.writeText(texte)
        setCopie(true)
        setTimeout(() => setCopie(false), 2000)
      }
    } catch { /* partage annule */ }
  }

  return (
    <div className="voile" onClick={onFermer}>
      <div className="feuille" onClick={e => e.stopPropagation()}>
        <h2>{r.sansFaute && !r.indices ? 'Sans-faute 🔥' : 'Grille terminée !'}</h2>
        <p className="aide" style={{ margin: 0 }}>
          {r.sansFaute
            ? (r.indices
              ? `Aucune erreur, avec ${r.indices} indice${r.indices > 1 ? 's' : ''}.`
              : 'Pas une seule erreur. Respect.')
            : `${r.erreurs} faute${r.erreurs > 1 ? 's' : ''} en route, mais la grille est bouclée.`}
        </p>

        <div className="stats">
          <div className="stat"><b>{r.score}</b><span>points</span></div>
          <div className="stat"><b>{r.motsTrouves}/{r.motsTotal}</b><span>mots</span></div>
          <div className="stat"><b>{min}′{String(sec).padStart(2, '0')}</b><span>temps</span></div>
        </div>

        <p className="aide" style={{ marginTop: -6 }}>
          {etoilesGagnees > 0
            ? <>Nouveau record : <b>★ {etoilesGagnees} étoiles</b> ajoutées à votre cagnotte.</>
            : <>Aucune étoile cette fois — il faut battre votre record sur cette grille.</>}
        </p>

        {quotidien && (
          <button className="bouton" onClick={partager}>
            {copie ? 'Copié dans le presse-papier ✓' : 'Partager mon score'}
          </button>
        )}
        <button className={quotidien ? 'bouton secondaire' : 'bouton'} onClick={onRejouer}>
          Rejouer cette grille
        </button>
        <button className="bouton secondaire" onClick={onFermer}>Retour à l’accueil</button>
      </div>
    </div>
  )
}
