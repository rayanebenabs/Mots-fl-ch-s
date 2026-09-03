import { useState } from 'react'
import Accueil from './composants/Accueil'
import EcranJeu from './composants/EcranJeu'
import { lire, verserRecompense } from './jeu/stockage'
import type { Duo } from './jeu/partie'
import donnees from './data/grids.json'
import cahiersData from '../content/cahiers.json'
import type { Grille } from './types'
import { etatDuParcours, type Cahier } from './jeu/parcours'

const GRILLES = donnees.grilles as unknown as Grille[]
const CAHIERS = cahiersData.cahiers as unknown as Cahier[]

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
        surVictoire={g => {
          // le cahier vient-il d'etre boucle ? si oui, on verse sa prime
          if (g.collection !== 'parcours' || !g.cahier) return 0
          const etat = etatDuParcours(GRILLES, CAHIERS, lire())
            .find(c => c.cahier.numero === g.cahier)
          if (!etat?.termine) return 0
          return verserRecompense(etat.cahier.numero, etat.cahier.recompense)
        }}
        onQuitter={() => { setSauvegarde(lire()); setPartie(null) }}
        onRejouer={() => setPartie(p => p && { ...p, tour: p.tour + 1 })}
      />
    )
  }

  return (
    <Accueil
      grilles={GRILLES}
      cahiers={CAHIERS}
      sauvegarde={sauvegarde}
      onJouer={(grille, quotidien, duo) => setPartie({ grille, quotidien, duo, tour: 0 })}
    />
  )
}
