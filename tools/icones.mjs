// Fabrique les icônes de l'app et vérifie que chacune est bien dessinée.
//
// Deux pièges qui ont coûté cher :
//  - une icône rendue blanche passe inaperçue si on ne regarde que la plus
//    grande, d'où le contrôle de contenu à la fin ;
//  - iOS applique son propre masque arrondi : une icône aux coins arrondis
//    transparents se retrouve avec des coins noirs. Les PNG sont donc pleins
//    bords, et c'est le système qui arrondit.
//
// Lancer : node tools/icones.mjs
import { execFileSync } from 'node:child_process'
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs'
import { inflateSync, deflateSync, crc32 } from 'node:zlib'
import { tmpdir } from 'node:os'
import { resolve, dirname, join } from 'node:path'

const CHROME = process.env.CHROME
  ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

/**
 * Rend un SVG en PNG carré, sans dépendance npm.
 *
 * Deux pièges de Chromium sans interface :
 *  - en dessous de ~500 px de fenêtre, la page rend vide ;
 *  - la fenêtre demandée n'est pas la zone de mise en page (512 demandés
 *    donnent 512x424), donc dimensionner en vh laisse des bandes blanches.
 * On dessine donc en pixels fixes dans une fenêtre plus haute, puis on
 * découpe le carré en haut à gauche.
 */
const BASE = 512

function rendre(svgTexte, destination) {
  const dossier = mkdtempSync(join(tmpdir(), 'icone-'))
  const tmp = join(dossier, 'i.html')
  writeFileSync(tmp, `<html><head><style>html,body{margin:0;padding:0;overflow:hidden;background:#000}`
    + `svg{display:block;width:${BASE}px;height:${BASE}px}</style></head><body>${svgTexte}</body></html>`)
  const brut = join(dossier, 'brut.png')
  execFileSync(CHROME, ['--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    `--user-data-dir=${join(dossier, 'profil')}`, '--force-device-scale-factor=1',
    '--virtual-time-budget=5000', `--screenshot=${brut}`,
    `--window-size=${BASE},${BASE + 200}`, `file://${tmp}`], { stdio: 'ignore' })
  const capture = decoder(readFileSync(brut))
  if (!capture || capture.largeur < BASE || capture.hauteur < BASE) {
    throw new Error(`capture trop petite : ${capture?.largeur}x${capture?.hauteur}`)
  }
  const image = rogner(capture, BASE)
  writeFileSync(destination, encoder(image))
  return image
}

/** Découpe le carré de côté `cote` en haut à gauche. */
function rogner({ pixels, largeur, canaux }, cote) {
  const sortie = Buffer.alloc(cote * cote * canaux)
  for (let y = 0; y < cote; y++) {
    pixels.copy(sortie, y * cote * canaux, y * largeur * canaux, (y * largeur + cote) * canaux)
  }
  return { pixels: sortie, largeur: cote, hauteur: cote, canaux }
}

/** Décode un PNG 8 bits non entrelacé. */
function decoder(png) {
  let pos = 8, largeur = 0, hauteur = 0, profondeur = 0, type = 0
  const morceaux = []
  while (pos < png.length) {
    const taille = png.readUInt32BE(pos)
    const nom = png.toString('ascii', pos + 4, pos + 8)
    const corps = png.subarray(pos + 8, pos + 8 + taille)
    if (nom === 'IHDR') {
      largeur = corps.readUInt32BE(0); hauteur = corps.readUInt32BE(4)
      profondeur = corps[8]; type = corps[9]
    } else if (nom === 'IDAT') morceaux.push(corps)
    else if (nom === 'IEND') break
    pos += 12 + taille
  }
  if (profondeur !== 8 || (type !== 6 && type !== 2)) return null
  const canaux = type === 6 ? 4 : 3
  const brut = inflateSync(Buffer.concat(morceaux))
  const ligne = largeur * canaux
  const pixels = Buffer.alloc(hauteur * ligne)
  let precedente = Buffer.alloc(ligne)
  for (let y = 0; y < hauteur; y++) {
    const filtre = brut[y * (ligne + 1)]
    const source = brut.subarray(y * (ligne + 1) + 1, (y + 1) * (ligne + 1))
    const courante = Buffer.alloc(ligne)
    for (let i = 0; i < ligne; i++) {
      const a = i >= canaux ? courante[i - canaux] : 0
      const b = precedente[i]
      const c = i >= canaux ? precedente[i - canaux] : 0
      let v = source[i]
      if (filtre === 1) v += a
      else if (filtre === 2) v += b
      else if (filtre === 3) v += (a + b) >> 1
      else if (filtre === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c)
      }
      courante[i] = v & 0xff
    }
    courante.copy(pixels, y * ligne)
    precedente = courante
  }
  return { pixels, largeur, hauteur, canaux }
}

/** Les quatre coins doivent porter le fond sombre, jamais du blanc ou du vide. */
function coinsPleins(chemin) {
  const image = decoder(readFileSync(chemin))
  if (!image) return false
  const { pixels, largeur, hauteur, canaux } = image
  const points = [[0, 0], [largeur - 1, 0], [0, hauteur - 1], [largeur - 1, hauteur - 1]]
  return points.every(([x, y]) => {
    const i = (y * largeur + x) * canaux
    const opaque = canaux === 3 || pixels[i + 3] > 250
    const sombre = pixels[i] + pixels[i + 1] + pixels[i + 2] < 330
    return opaque && sombre
  })
}

function teintesDe(chemin) {
  const image = decoder(readFileSync(chemin))
  if (!image) return null
  const { pixels, canaux } = image
  const vues = new Set()
  for (let i = 0; i < pixels.length; i += canaux) {
    vues.add(`${pixels[i] >> 4},${pixels[i + 1] >> 4},${pixels[i + 2] >> 4}`)
  }
  return vues.size
}

/** Réduction par moyenne de blocs : nette et sans dépendance. */
function reduire({ pixels, largeur, hauteur, canaux }, cible) {
  const sortie = Buffer.alloc(cible * cible * canaux)
  const fx = largeur / cible, fy = hauteur / cible
  for (let y = 0; y < cible; y++) {
    for (let x = 0; x < cible; x++) {
      const x0 = Math.floor(x * fx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * fx))
      const y0 = Math.floor(y * fy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * fy))
      for (let c = 0; c < canaux; c++) {
        let somme = 0, n = 0
        for (let yy = y0; yy < y1; yy++) {
          for (let xx = x0; xx < x1; xx++) {
            somme += pixels[(yy * largeur + xx) * canaux + c]; n++
          }
        }
        sortie[(y * cible + x) * canaux + c] = Math.round(somme / n)
      }
    }
  }
  return { pixels: sortie, largeur: cible, hauteur: cible, canaux }
}

function morceau(nom, corps) {
  const entete = Buffer.alloc(8)
  entete.writeUInt32BE(corps.length, 0)
  entete.write(nom, 4, 'ascii')
  const fin = Buffer.alloc(4)
  fin.writeUInt32BE(crc32(Buffer.concat([Buffer.from(nom, 'ascii'), corps])) >>> 0, 0)
  return Buffer.concat([entete, corps, fin])
}

function encoder({ pixels, largeur, hauteur, canaux }) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(largeur, 0); ihdr.writeUInt32BE(hauteur, 4)
  ihdr[8] = 8; ihdr[9] = canaux === 4 ? 6 : 2
  const ligne = largeur * canaux
  const brut = Buffer.alloc(hauteur * (ligne + 1))
  for (let y = 0; y < hauteur; y++) {
    brut[y * (ligne + 1)] = 0
    pixels.copy(brut, y * (ligne + 1) + 1, y * ligne, (y + 1) * ligne)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    morceau('IHDR', ihdr), morceau('IDAT', deflateSync(brut, { level: 9 })),
    morceau('IEND', Buffer.alloc(0)),
  ])
}

const racine = resolve(dirname(new URL(import.meta.url).pathname), '..')

/** Le motif : une case définition fléchée, puis M O T. Lisible à 60 pixels. */
const motif = (marge) => {
  const c = 512, d = c - marge * 2, p = d * 0.045, t = (d - p) / 2
  const cell = (x, y, fond, texte, lettre, taille) => `
    <rect x="${marge + x}" y="${marge + y}" width="${t}" height="${t}" rx="${t * 0.19}" fill="${fond}"/>
    <text x="${marge + x + t / 2}" y="${marge + y + t / 2}" fill="${texte}"
          font-family="Arial Rounded MT Bold, Arial, Helvetica, sans-serif"
          font-size="${t * taille}" font-weight="900"
          text-anchor="middle" dominant-baseline="central">${lettre}</text>`
  return `
    ${cell(0, 0, '#2a2160', '#ffc93c', '→', 0.62)}
    ${cell(t + p, 0, '#eeecf8', '#1a1440', 'M', 0.66)}
    ${cell(0, t + p, '#ffc93c', '#2a1e00', 'O', 0.66)}
    ${cell(t + p, t + p, '#2fd48f', '#05301f', 'T', 0.66)}`
}

const svg = ({ marge = 44, rayon = 0 }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><linearGradient id="f" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#3a2f8f"/><stop offset="1" stop-color="#14103a"/>
  </linearGradient></defs>
  <rect width="512" height="512" rx="${rayon}" fill="url(#f)"/>
  ${motif(marge)}
</svg>`

// pour l'onglet du navigateur, l'arrondi est à notre charge
const svgOnglet = svg({ marge: 44, rayon: 112 })
writeFileSync(`${racine}/public/icone.svg`, svgOnglet)

const sorties = [
  // plein bord : iOS et Android masquent eux-mêmes
  { fichier: 'icone-180.png', taille: 180, marge: 44 },
  { fichier: 'icone-192.png', taille: 192, marge: 44 },
  { fichier: 'icone-512.png', taille: 512, marge: 44 },
  // maskable : le motif doit tenir dans le cercle de sécurité (80 %)
  { fichier: 'icone-maskable-512.png', taille: 512, marge: 108 },
]

// on rend une fois en 512 par variante, puis on réduit : Chromium sans
// interface rend vide en petite fenêtre et plafonne l'échelle à 0,5
const bases = new Map()
for (const { marge } of sorties) {
  if (bases.has(marge)) continue
  const tmp = join(mkdtempSync(join(tmpdir(), 'base-')), `${marge}.png`)
  bases.set(marge, rendre(svg({ marge }), tmp))
}
for (const { fichier, taille, marge } of sorties) {
  const base = bases.get(marge)
  const image = taille === BASE ? base : reduire(base, taille)
  writeFileSync(`${racine}/public/${fichier}`, encoder(image))
}

// contrôle : une icône blanche ou uniforme est un échec
console.log('  fichier                    taille   teintes   coins   verdict')
let echec = false
for (const { fichier, taille } of sorties) {
  const teintes = teintesDe(`${racine}/public/${fichier}`)
  const png = readFileSync(`${racine}/public/${fichier}`)
  const vraieTaille = png.readUInt32BE(16)
  const coins = coinsPleins(`${racine}/public/${fichier}`)
  const ok = teintes !== null && teintes >= 8 && vraieTaille === taille && coins
  if (!ok) echec = true
  console.log(`  ${fichier.padEnd(26)} ${String(vraieTaille).padStart(4)}   ${String(teintes).padStart(6)}   `
    + `${coins ? ' ok ' : 'clairs'}   `
    + (ok ? 'ok' : teintes < 8 ? 'ÉCHEC : image quasi vide'
      : vraieTaille !== taille ? `ÉCHEC : attendu ${taille} px`
        : 'ÉCHEC : coins non peints, iOS y mettra du noir'))
}
process.exit(echec ? 1 : 0)
