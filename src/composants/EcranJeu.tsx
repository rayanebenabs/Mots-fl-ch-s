import { useEffect, useMemo, useState } from 'react'
import Plateau from './Plateau'
import Clavier from './Clavier'
import BarreDefinition from './BarreDefinition'
import FinPartie from './FinPartie'
import Indices from './Indices'
import IndexGrille from './IndexGrille'
import { cle, cellulesDe, preparer } from '../jeu/grille'
import {
  nouvellePartie, taper, effacer, selectionner, deplacerCurseur, motVoisin, resultat,
  revelerLettre, revelerMot, ouvrirIndex, revelerTout, coutDuMot,
  pourSauvegarde, depuisSauvegarde, partieResolue,
  COUT_LETTRE, COUT_INDEX, COUT_SOLUTIONS,
  type EtatPartie,
} from '../jeu/partie'
import {
  cleDePartie, depenser, ecrireEnCours, effacerEnCours, enregistrerGrille,
  enregistrerQuotidien, lire, lireEnCours, signatureDe,
} from '../jeu/stockage'
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
  const cleSauvegarde = cleDePartie(grille, quotidien, dateDuJour())
  const dejaFinie = quotidien
    ? lire().quotidien[dateDuJour()]
    : lire().grilles[grille.id]
  // une partie en plan se reprend; une grille deja rendue se revoit,
  // remplie, plutot que de repartir de zero sans prevenir
  const [revue, setRevue] = useState(() => !lireEnCours(cleSauvegarde, grille) && !!dejaFinie)
  const [etat, setEtat] = useState<EtatPartie>(() => {
    const reprise = lireEnCours(cleSauvegarde, grille)
    if (reprise) return depuisSauvegarde(reprise)
    if (dejaFinie) return partieResolue(plan, dejaFinie)
    return nouvellePartie(plan)
  })
  const [feuille, setFeuille] = useState(false)
  const [indices, setIndices] = useState(false)
  const [index, setIndex] = useState(false)
  const [etoiles, setEtoiles] = useState(() => lire().etoiles)
  const [gagnees, setGagnees] = useState(0)

  // la partie est enregistree a chaque coup: quitter n a jamais rien coute
  useEffect(() => {
    if (etat.finiA || revue) return
    ecrireEnCours(cleSauvegarde, pourSauvegarde(etat, signatureDe(grille)))
  }, [etat, cleSauvegarde])

  useEffect(() => {
    if (!etat.finiA || revue) return
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
          disabled={!!etat.finiA}
          aria-label="Demander un indice"
        >💡</button>
        {etat.indexOuvert && (
          <button className="rond" onClick={() => setIndex(true)} aria-label="Ouvrir l’index">
            ☰
          </button>
        )}
        <span className="jeton" aria-label={`${etoiles} étoiles`}>★ {etoiles}</span>
      </header>

      <Plateau grille={grille} plan={plan} etat={etat} onCase={surCase} onMot={surMot} />

      <div className="zone-basse">
        {revue && (
          <div className="barre-revue">
            <span>
              Grille terminée · <b>★ {dejaFinie!.score}</b> ·{' '}
              {dejaFinie!.erreurs === 0 ? 'sans faute' : `${dejaFinie!.erreurs} faute${dejaFinie!.erreurs > 1 ? 's' : ''}`}
            </span>
            <button
              className="bouton-revue"
              onClick={() => { effacerEnCours(cleSauvegarde); setRevue(false); setEtat(nouvellePartie(plan)) }}
            >
              Rejouer
            </button>
          </div>
        )}
        <BarreDefinition
          plan={plan}
          etat={etat}
          onMot={surMot}
          onPas={pas => setEtat(s => selectionner(s, motVoisin(plan, s, pas)))}
        />
        {!revue && (
          <Clavier
            onLettre={l => setEtat(s => taper(plan, s, l))}
            onEffacer={() => setEtat(s => effacer(plan, s))}
            onSuivant={() => setEtat(s => selectionner(s, motVoisin(plan, s, 1)))}
          />
        )}
      </div>

      {indices && (
        <Indices
          plan={plan}
          etat={etat}
          etoiles={etoiles}
          onLettre={() => acheter(COUT_LETTRE, s => revelerLettre(plan, s))}
          onMot={() => acheter(coutDuMot(plan, etat), s => revelerMot(plan, s))}
          onIndex={() => { acheter(COUT_INDEX, ouvrirIndex); setIndex(true) }}
          onSolutions={() => acheter(COUT_SOLUTIONS, s => revelerTout(plan, s))}
          onFermer={() => setIndices(false)}
        />
      )}

      {index && (
        <IndexGrille plan={plan} etat={etat} onMot={surMot} onFermer={() => setIndex(false)} />
      )}

      {feuille && (
        <FinPartie
          resultat={r}
          etoilesGagnees={gagnees}
          quotidien={quotidien}
          onRejouer={() => { effacerEnCours(cleSauvegarde); setFeuille(false); onRejouer() }}
          onFermer={onQuitter}
        />
      )}
    </div>
  )
}
