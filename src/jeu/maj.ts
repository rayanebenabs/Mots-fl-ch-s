/**
 * Accès à l'enregistrement du service worker depuis n'importe où.
 *
 * En mode application il n'y a pas de barre d'adresse : sans un moyen de
 * déclencher la vérification à la main, un joueur bloqué sur une vieille
 * version n'aurait aucun recours.
 */
let enregistrement: ServiceWorkerRegistration | null = null

export function memoriser(r: ServiceWorkerRegistration | undefined) {
  enregistrement = r ?? null
}

/** true si une nouvelle version a été trouvée et attend d'être appliquée. */
export async function chercherMiseAJour(): Promise<boolean> {
  if (!enregistrement) return false
  try {
    await enregistrement.update()
  } catch {
    return false
  }
  return !!(enregistrement.waiting || enregistrement.installing)
}

export const versionDuBuild = __BUILD__
