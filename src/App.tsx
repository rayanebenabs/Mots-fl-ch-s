import { useState } from 'react'
import Accueil from './composants/Accueil'
import EcranJeu from './composants/EcranJeu'
import { lire } from './jeu/stockage'
import type { Duo } from './jeu/partie'
import donnees from './data/grids.json'
import type { Grille } from './types'

const GRILLES = donnees.grilles as unknown as Grille[]

interface Partie {
  grille: Grille
  quotidien: boolean
  duo: Duo | null
  tour: number
}

export default function App() {
  const [partie, setPartie] = useState<Partie | null>(null)
  const [sauvegarde, setSauvegarde] = useState(() => lire())

  if (partie) {
    return (
      <EcranJeu
        key={`${partie.grille.id}-${partie.duo ? 'duo' : 'solo'}-${partie.tour}`}
        grille={partie.grille}
        quotidien={partie.quotidien}
        duo={partie.duo}
        onQuitter={() => { setSauvegarde(lire()); setPartie(null) }}
        onRejouer={() => setPartie(p => p && { ...p, tour: p.tour + 1 })}
      />
    )
  }

  return (
    <Accueil
      grilles={GRILLES}
      sauvegarde={sauvegarde}
      onJouer={(grille, quotidien, duo) => setPartie({ grille, quotidien, duo, tour: 0 })}
    />
  )
}
