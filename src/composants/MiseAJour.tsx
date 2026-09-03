interface Props {
  onRecharger: () => void
  onPlusTard: () => void
}

/**
 * En mode application il n'y a pas de barre d'adresse, donc pas de bouton
 * recharger : sans ce bandeau, une nouvelle version resterait invisible.
 */
export default function MiseAJour({ onRecharger, onPlusTard }: Props) {
  return (
    <div className="maj" role="status">
      <span>
        <b>Nouvelle version</b>
        <span>Les grilles et les corrections sont prêtes.</span>
      </span>
      <button className="maj-bouton" onClick={onRecharger}>Mettre à jour</button>
      <button className="maj-fermer" onClick={onPlusTard} aria-label="Plus tard">✕</button>
    </div>
  )
}
