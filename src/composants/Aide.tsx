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
      <div className="rang">
        <span className="pastille" style={{ background: 'rgba(255,255,255,.14)' }}>💡</span>
        <span>
          <b>Indices</b> — le bouton 💡 dévoile une lettre (★ 25) ou le mot entier
          (★ 15 par case manquante). Vous gagnez une étoile pour cinq points
          marqués, chaque fois que vous battez votre record sur une grille.
        </span>
      </div>
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
          <p>
            <b>Les étoiles ne sont pas le score.</b> Le score se joue sur une
            grille ; les étoiles, elles, vous suivent d’une grille à l’autre et
            ne servent qu’à payer des indices. À vous de voir si vous les
            dépensez maintenant ou si vous les gardez pour le Boss final.
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
