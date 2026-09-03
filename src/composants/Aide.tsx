const CASES = [
  { fond: 'var(--accent)', texte: '#2a1e00', glyphe: '×2', nom: 'Case bonus',
    desc: 'Le mot qui la traverse rapporte le double.' },
  { fond: 'var(--accent-2)', texte: '#fff', glyphe: '?', nom: 'Case mystère',
    desc: 'La lettre que vous tapez reste masquée jusqu’à la validation du mot.' },
  { fond: 'var(--cyan)', texte: '#04303a', glyphe: '★', nom: 'Lettre offerte',
    desc: 'Déjà remplie au départ, cadeau de la maison.' },
]

export default function Aide({ onFermer, compact }: { onFermer?: () => void; compact?: boolean }) {
  const corps = (
    <div className="aide">
      {CASES.map(c => (
        <div className="rang" key={c.nom}>
          <span className="pastille" style={{ background: c.fond, color: c.texte }}>{c.glyphe}</span>
          <span><b>{c.nom}</b> — {c.desc}</span>
        </div>
      ))}
      {!compact && (
        <>
          <p style={{ marginTop: 18 }}>
            <b>Comment jouer.</b> Chaque définition porte un numéro, visible dans sa case
            et dans la barre sous la grille. Touchez un numéro pour choisir le mot, la
            flèche vous indique dans quel sens l’écrire.
          </p>
          <p>
            Un mot complet se vérifie tout seul : juste, il se verrouille en vert et
            rapporte 10 points par lettre. Faux, les lettres fautives s’effacent et
            vous perdez 15 points. Zéro faute sur la grille : +120.
          </p>
        </>
      )}
    </div>
  )

  if (compact) return corps
  return (
    <div className="voile" onClick={onFermer}>
      <div className="feuille" onClick={e => e.stopPropagation()}>
        <h2>Comment jouer</h2>
        {corps}
        <button className="bouton" onClick={onFermer}>C’est parti</button>
      </div>
    </div>
  )
}
