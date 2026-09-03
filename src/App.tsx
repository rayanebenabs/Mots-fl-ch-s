import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import Accueil from './composants/Accueil'
import MiseAJour from './composants/MiseAJour'
import EcranJeu from './composants/EcranJeu'
import { lire, verserRecompense } from './jeu/stockage'
import { memoriser } from './jeu/maj'
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

/** Toutes les demi-heures, et chaque fois que l'app revient au premier plan. */
const RYTHME_VERIFICATION = 30 * 60 * 1000

export default function App() {
  const [partie, setPartie] = useState<Partie | null>(null)
  const [sauvegarde, setSauvegarde] = useState(() => lire())

  const { needRefresh: [majPrete, setMajPrete], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, enregistrement) {
      memoriser(enregistrement)
      if (!enregistrement) return
      const verifier = () => { enregistrement.update().catch(() => {}) }
      setInterval(verifier, RYTHME_VERIFICATION)
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) verifier()
      })
    },
  })

  /**
   * On ne laisse pas la bibliotheque recharger: elle attend un changement de
   * controleur marque comme mise a jour, ce qui n arrive pas si la page
   * n avait pas encore de service worker. On recharge donc nous-memes, des
   * que le nouveau prend la main, et au pire apres un court delai.
   */
  const appliquerMaj = () => {
    let fait = false
    const recharger = () => { if (!fait) { fait = true; location.reload() } }
    navigator.serviceWorker?.addEventListener('controllerchange', recharger, { once: true })
    updateServiceWorker(false)
    setTimeout(recharger, 1500)
  }

  const bandeau = majPrete && (
    <MiseAJour onRecharger={appliquerMaj} onPlusTard={() => setMajPrete(false)} />
  )

  if (partie) {
    return (
      <>
      {bandeau}
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
      </>
    )
  }

  return (
    <>
    {bandeau}
    <Accueil
      grilles={GRILLES}
      cahiers={CAHIERS}
      sauvegarde={sauvegarde}
      onJouer={(grille, quotidien, duo) => setPartie({ grille, quotidien, duo, tour: 0 })}
    />
    </>
  )
}
