import type { Grille, Resultat } from '../types'

const ORIGINE = Date.UTC(2026, 0, 1)

export function dateDuJour(): string {
  return new Date().toISOString().slice(0, 10)
}

export function numeroDuJour(date = dateDuJour()): number {
  const d = Date.parse(date + 'T00:00:00Z')
  return Math.max(0, Math.floor((d - ORIGINE) / 86400000))
}

export function grilleDuJour(grilles: Grille[], date = dateDuJour()): Grille {
  const pool = grilles.filter(g => g.collection === 'quotidien')
  const source = pool.length ? pool : grilles
  return source[numeroDuJour(date) % source.length]
}

export function libelleDate(date = dateDuJour()): string {
  return new Date(date + 'T12:00:00Z').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

/** Texte partageable facon Wordle: une pastille par mot, sans rien spoiler. */
export function texteDePartage(r: Resultat, date = dateDuJour()): string {
  const pastilles: string[] = []
  for (let i = 0; i < r.motsTotal; i++) {
    pastilles.push(i < r.motsTrouves ? (r.sansFaute ? '🟩' : '🟨') : '⬛')
  }
  const lignes: string[] = []
  for (let i = 0; i < pastilles.length; i += 5) {
    lignes.push(pastilles.slice(i, i + 5).join(''))
  }
  const min = Math.floor(r.tempsMs / 60000)
  const sec = Math.floor((r.tempsMs % 60000) / 1000)
  return [
    `Mots Fléchés — Défi du jour n°${numeroDuJour(date)}`,
    `${r.score} pts · ${r.motsTrouves}/${r.motsTotal} mots · ${min}′${String(sec).padStart(2, '0')}`,
    [r.sansFaute ? 'Sans aucune faute 🔥' : `${r.erreurs} faute${r.erreurs > 1 ? 's' : ''}`,
     r.indices ? `${r.indices} indice${r.indices > 1 ? 's' : ''}` : null]
      .filter(Boolean).join(' · '),
    '',
    ...lignes,
  ].join('\n')
}
