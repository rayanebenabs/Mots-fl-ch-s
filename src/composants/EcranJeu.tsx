import { useEffect, useMemo, useState } from 'react'
import Plateau from './Plateau'
import Clavier from './Clavier'
import BarreDefinition from './BarreDefinition'
import FinPartie from './FinPartie'
import Indices from './Indices'
import { cle, cellulesDe, preparer } from '../jeu/grille'
import {
  nouvellePartie, taper, effacer, selectionner, deplacerCurseur, motVoisin, resultat,
  revelerLettre, revelerMot, coutDuMot, casesADevoiler, COUT_LETTRE,
  type EtatPartie,
} from '../jeu/partie'
import { depenser, enregistrerGrille, enregistrerQuotidien, lire } from '../jeu/stockage'
import { dateDuJour } from '../jeu/quotidien'
import type { Grille, MotNumerote } from '../types'

interface Props {
  grille: Grille
  quotidien: boolean
  onQuitter: () => void
  onRejouer: () => void
}

export default function EcranJeu({ grille, quotidien, onQuitter, onRejouer }: Props) {
  const plan = useMemo(() => preparer(grille), [grille])
  const [etat, setEtat] = useState<EtatPartie>(() => nouvellePartie(plan))
  const [feuille, setFeuille] = useState(false)
  const [indices, setIndices] = useState(false)
  const [etoiles, setEtoiles] = useState(() => lire().etoiles)
  const [gagnees, setGagnees] = useState(0)

  useEffect(() => setEtat(nouvellePartie(plan)), [plan])

  useEffect(() => {
    if (!etat.finiA) return
    const r = resultat(plan, etat)
    const gain = quotidien
      ? enregistrerQuotidien(dateDuJour(), r)
      : enregistrerGrille(grille.id, r)
    setEtoiles(gain.sauvegarde.etoiles)
    setGagnees(gain.etoilesGagnees)
    const t = setTimeout(() => setFeuille(true), 550)
    return () => clearTimeout(t)
  }, [etat.finiA])

  // le rouge d un mot rate n est qu un flash
  useEffect(() => {
    if (etat.rate === null) return
    const t = setTimeout(() => setEtat(s => (s.rate === null ? s : { ...s, rate: null })), 650)
    return () => clearTimeout(t)
  }, [etat.rate])

  // des que le mot courant est trouve, on enchaine sur le suivant
  useEffect(() => {
    if (etat.finiA || etat.motActif < 0) return
    if (!etat.motsTrouves.includes(etat.motActif)) return
    const t = setTimeout(() => setEtat(s => selectionner(s, motVoisin(plan, s, 1))), 320)
    return () => clearTimeout(t)
  }, [etat.motsTrouves.length, etat.motActif])

  useEffect(() => {
    const clavier = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (/^[a-zA-Z]$/.test(e.key)) setEtat(s => taper(plan, s, e.key.toUpperCase()))
      else if (e.key === 'Backspace') setEtat(s => effacer(plan, s))
      else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault()
        setEtat(s => selectionner(s, motVoisin(plan, s, 1)))
      }
    }
    window.addEventListener('keydown', clavier)
    return () => window.removeEventListener('keydown', clavier)
  }, [plan])

  /**
   * Clic sur une case: on y deplace le curseur, et si la case est un
   * croisement deja selectionne on bascule sur le mot perpendiculaire.
   */
  const surCase = (r: number, c: number) => {
    const ids = plan.parCase.get(cle(r, c))
    if (!ids?.length) return
    const indexDans = (id: number) =>
      cellulesDe(plan.parId.get(id)!).findIndex(([a, b]) => a === r && b === c)
    setEtat(s => {
      const rang = ids.indexOf(s.motActif)
      if (rang !== -1) {
        const i = indexDans(s.motActif)
        if (s.curseur === i && ids.length > 1) {
          const autre = plan.parId.get(ids[(rang + 1) % ids.length])!
          return { ...selectionner(s, autre), curseur: indexDans(autre.id) }
        }
        return deplacerCurseur(s, i)
      }
      const cible = plan.parId.get(ids[0])!
      return { ...selectionner(s, cible), curseur: indexDans(cible.id) }
    })
  }

  const surMot = (m: MotNumerote) => setEtat(s => selectionner(s, m))

  /** Un indice se paie d abord, puis se devoile. */
  const acheter = (cout: number, devoiler: (e: EtatPartie) => EtatPartie) => {
    if (etoiles < cout) return
    setEtoiles(depenser(cout))
    setEtat(devoiler)
    setIndices(false)
  }
  const r = resultat(plan, etat)

  return (
    <div className="appli">
      <header className="entete">
        <button className="rond" onClick={onQuitter} aria-label="Retour">‹</button>
        <div className="milieu">
          <h1>{quotidien ? 'Défi du jour' : grille.titre}</h1>
          <p className="sous">
            {etat.motsTrouves.length}/{plan.mots.length} mots · {etat.score} pts
            {etat.erreurs > 0 && ` · ${etat.erreurs} faute${etat.erreurs > 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          className="rond"
          onClick={() => setIndices(true)}
          disabled={!!etat.finiA || casesADevoiler(plan, etat).length === 0}
          aria-label="Demander un indice"
        >💡</button>
        <span className="jeton" aria-label={`${etoiles} étoiles`}>★ {etoiles}</span>
      </header>

      <Plateau grille={grille} plan={plan} etat={etat} onCase={surCase} onMot={surMot} />

      <div className="zone-basse">
        <BarreDefinition
          plan={plan}
          etat={etat}
          onMot={surMot}
          onPas={pas => setEtat(s => selectionner(s, motVoisin(plan, s, pas)))}
        />
        <Clavier
          onLettre={l => setEtat(s => taper(plan, s, l))}
          onEffacer={() => setEtat(s => effacer(plan, s))}
          onSuivant={() => setEtat(s => selectionner(s, motVoisin(plan, s, 1)))}
        />
      </div>

      {indices && (
        <Indices
          plan={plan}
          etat={etat}
          etoiles={etoiles}
          onLettre={() => acheter(COUT_LETTRE, s => revelerLettre(plan, s))}
          onMot={() => acheter(coutDuMot(plan, etat), s => revelerMot(plan, s))}
          onFermer={() => setIndices(false)}
        />
      )}

      {feuille && (
        <FinPartie
          resultat={r}
          etoilesGagnees={gagnees}
          quotidien={quotidien}
          onRejouer={() => { setFeuille(false); onRejouer() }}
          onFermer={onQuitter}
        />
      )}
    </div>
  )
}
