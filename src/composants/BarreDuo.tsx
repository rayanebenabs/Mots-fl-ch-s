import type { Duo } from '../jeu/partie'

interface Props {
  duo: Duo
  fini: boolean
  onPasser: () => void
}

/** À qui de jouer, et le bouton pour rendre la main quand on sèche. */
export default function BarreDuo({ duo, fini, onPasser }: Props) {
  if (fini) {
    return (
      <div className="barre-duo termine">
        <span>
          Terminée à deux · {duo.noms[0]} {duo.trouves[0]} · {duo.noms[1]} {duo.trouves[1]}
        </span>
      </div>
    )
  }
  return (
    <div className={`barre-duo j${duo.actif}`}>
      <span className="duo-tour">
        <b>{duo.noms[duo.actif]}</b> à toi de jouer
      </span>
      <span className="duo-compte">
        {duo.trouves[0]} – {duo.trouves[1]}
      </span>
      <button className="bouton-passer" onClick={onPasser}>Je passe</button>
    </div>
  )
}
