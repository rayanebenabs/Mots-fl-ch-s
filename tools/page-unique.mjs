// Empaquette le build en une seule page autonome (pour publication ailleurs).
// Lancer : ARTIFACT=1 npm run build && node tools/page-unique.mjs <destination>
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

const racine = resolve(dirname(new URL(import.meta.url).pathname), '..')
const dest = process.argv[2]
if (!dest) { console.error('destination manquante'); process.exit(1) }

const html = readFileSync(`${racine}/dist/index.html`, 'utf8')
// on suit ce que la page charge vraiment: le dossier contient parfois
// plusieurs bundles, et en prendre un au hasard produit une page vide
const js = html.match(/<script[^>]+src="\.\/(assets\/[^"]+\.js)"/)?.[1]
const css = html.match(/<link[^>]+href="\.\/(assets\/[^"]+\.css)"/)?.[1]
if (!js || !css) { console.error('bundle introuvable dans index.html'); process.exit(1) }

const page = [
  '<title>Mots Fléchés Pop &amp; Actu</title>',
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
  `<style>\n${readFileSync(`${racine}/dist/${css}`, 'utf8').replaceAll('</style', '<\\/style')}\n</style>`,
  '<div id="root"></div>',
  `<script type="module">\n${readFileSync(`${racine}/dist/${js}`, 'utf8').replaceAll('</script', '<\\/script')}\n</script>`,
].join('\n')

writeFileSync(dest, page)
console.log(`${dest} — ${Math.round(page.length / 1024)} Ko (${js}, ${css})`)
