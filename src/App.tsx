import { useState } from 'react'
import Accueil from './composants/Accueil'
import EcranJeu from './composants/EcranJeu'
import { lire } from './jeu/stockage'
import donnees from './data/grids.json'
import type { Grille } from './types'

const GRILLES = donnees.grilles as unknown as Grille[]

export default function App() {
  const [partie, setPartie] = useState<{ grille: Grille; quotidien: boolean; tour: number } | null>(null)
  const [sauvegarde, setSauvegarde] = useState(() => lire())

  if (partie) {
    return (
      <EcranJeu
        key={`${partie.grille.id}-${partie.tour}`}
        grille={partie.grille}
        quotidien={partie.quotidien}
        onQuitter={() => { setSauvegarde(lire()); setPartie(null) }}
        onRejouer={() => setPartie(p => p && { ...p, tour: p.tour + 1 })}
      />
    )
  }

  return (
    <Accueil
      grilles={GRILLES}
      sauvegarde={sauvegarde}
      onJouer={(grille, quotidien) => setPartie({ grille, quotidien, tour: 0 })}
    />
  )
}
