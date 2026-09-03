import { useEffect, useMemo, useState } from 'react'
import Plateau from './Plateau'
import Clavier from './Clavier'
import BarreDefinition from './BarreDefinition'
import FinPartie from './FinPartie'
import { cle, cellulesDe, preparer } from '../jeu/grille'
import {
  nouvellePartie, taper, effacer, selectionner, deplacerCurseur, motVoisin, resultat,
  type EtatPartie,
} from '../jeu/partie'
import { enregistrerGrille, enregistrerQuotidien } from '../jeu/stockage'
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

  useEffect(() => setEtat(nouvellePartie(plan)), [plan])

  useEffect(() => {
    if (!etat.finiA) return
    const r = resultat(plan, etat)
    if (quotidien) enregistrerQuotidien(dateDuJour(), r)
    else enregistrerGrille(grille.id, r)
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
  const r = resultat(plan, etat)

  return (
    <div className="appli">
      <header className="entete">
        <button className="rond" onClick={onQuitter} aria-label="Retour">‹</button>
        <div className="milieu">
          <h1>{quotidien ? 'Défi du jour' : grille.titre}</h1>
          <p className="sous">
            {etat.motsTrouves.length}/{plan.mots.length} mots
            {etat.erreurs > 0 && ` · ${etat.erreurs} faute${etat.erreurs > 1 ? 's' : ''}`}
          </p>
        </div>
        <span className="jeton">★ {etat.score}</span>
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

      {feuille && (
        <FinPartie
          resultat={r}
          quotidien={quotidien}
          onRejouer={() => { setFeuille(false); onRejouer() }}
          onFermer={onQuitter}
        />
      )}
    </div>
  )
}
