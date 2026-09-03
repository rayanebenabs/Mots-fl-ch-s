const RANGEES = ['AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN']

interface Props {
  onLettre: (l: string) => void
  onEffacer: () => void
  onSuivant: () => void
}

export default function Clavier({ onLettre, onEffacer, onSuivant }: Props) {
  return (
    <div className="clavier">
      {RANGEES.map((rangee, i) => (
        <div className="rangee" key={i}>
          {i === 2 && (
            <button className="touche large" onClick={onSuivant} aria-label="Mot suivant">
              ⇥
            </button>
          )}
          {[...rangee].map(l => (
            <button key={l} className="touche" onClick={() => onLettre(l)}>{l}</button>
          ))}
          {i === 2 && (
            <button className="touche large" onClick={onEffacer} aria-label="Effacer">
              ⌫
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
