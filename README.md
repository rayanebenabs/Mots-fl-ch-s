# Mots Fléchés — Pop & Actu

Jeu de mots fléchés pensé pour le mobile : quatre niveaux de difficulté, un défi
quotidien partageable, des cases spéciales et des définitions qui piochent dans
la pop culture et l'actualité. C'est une **PWA** (React + Vite + TypeScript) :
ça s'ouvre dans le navigateur, ça s'installe sur l'écran d'accueil, ça marche
hors ligne.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # bundle de production dans dist/
npm run preview    # sert le build
```

## Le jeu

Des grilles **9 × 11 pleines**, comme au kiosque : chaque case est soit une
lettre, soit une case de définition. Pas de trou, pas de case noire décorative.
Une trentaine de mots par grille, et la grille occupe toute la place
disponible à l'écran.

### Le parcours

Huit **cahiers** de six grilles, comme une pile de fléchés poche. On avance de
l'un à l'autre en récoltant des crayons.

| Cahier | Univers | Difficulté |
|---|---|---|
| 1 · Le kiosque | à l'ancienne | facile |
| 2 · Plein écran | pop & internet | facile |
| 3 · Le café du coin | à l'ancienne | moyen |
| 4 · Fil d'actu | pop & internet | moyen |
| 5 · Dimanche pluvieux | à l'ancienne | costaud |
| 6 · Terminally online | pop & internet | costaud |
| 7 · Le grand cahier | à l'ancienne | redoutable |
| 8 · Le mur | pop & internet | redoutable |

**Trois crayons par grille**, et c'est là que se joue la progression :

1. la grille est terminée ;
2. elle l'a été **sans aucune faute** ;
3. son **objectif** est rempli — sans le moindre indice, sous un chrono, ou une
   enfilade de mots justes d'affilée. Chaque grille a le sien.

Un mot fléché ne se perd jamais : on finit toujours par le boucler. Sans
possibilité d'échec, un chemin de progression n'est qu'une liste. Les crayons
sont là pour ça — **il en faut douze de plus à chaque cahier pour ouvrir le
suivant**, donc bâcler une grille oblige à y revenir. Boucler les six grilles
d'un cahier verse une prime en étoiles, une seule fois.

À l'intérieur d'un cahier, les grilles s'ouvrent l'une après l'autre.

**Deux univers** se relaient d'un cahier à l'autre :

Le **défi du jour** tire une grille du pool quotidien selon la date : tout le
monde a la même le même jour, et le score se partage en pastilles (façon Wordle)
sans rien divulguer des réponses. Une série de jours consécutifs est comptée.

**Lecture des définitions.** Les cases de définition ne portent qu'un numéro et
une flèche — illisible autrement sur un écran de téléphone. Le texte complet
s'affiche dans la barre entre la grille et le clavier, et la rangée de numéros
juste au-dessus permet de sauter directement au mot voulu. La flèche indique où
le mot commence et dans quel sens il se lit : `→` à droite, `↓` en dessous,
`↳` en dessous puis vers la droite, `↴` à droite puis vers le bas. La case du
coin, qui ne peut annoncer aucun mot, porte le badge de la grille.

**Cases spéciales**, de trois à six selon le niveau :

- **Bonus** (point doré) — le mot qui la traverse rapporte le double.
- **Mystère** (point violet) — la lettre saisie reste masquée jusqu'à ce que le
  mot soit validé.
- **Cadeau** (point cyan) — lettre offerte, déjà en place au démarrage.

**Indices et étoiles.** Le bouton 💡 ouvre quatre coups de pouce, comme les
pages du fond du magazine :

| Coup de pouce | Prix | Effet |
|---|---|---|
| Une lettre | ★ 25 | Dévoile et verrouille une case du mot en cours |
| Le mot entier | ★ 15 par case manquante, ★ 45 minimum | Complète et valide le mot |
| L'index | ★ 40 | La liste de toutes les définitions, consultable à volonté |
| La page des solutions | ★ 200 | Remplit toute la grille — elle ne rapporte alors plus rien |

Les étoiles ne sont pas le score. Le score se joue sur une grille ; les étoiles
suivent le joueur d'une grille à l'autre et ne servent qu'à payer des indices.
On démarre avec 80 étoiles. Ensuite on en gagne **une pour cinq points marqués**,
et seulement sur ce qui dépasse son propre record : refaire une grille à
l'identique ne rapporte rien, et une grille ouverte à la page des solutions
n'est ni enregistrée ni payée.

**Score.** 10 points par lettre d'un mot juste, doublés par une case bonus.
Un mot complété faux coûte 15 points et ses lettres fautives s'effacent ; les
lettres déjà verrouillées par un mot juste, elles, ne bougent pas. Terminer
une grille sans la moindre faute vaut +120.

**Mode duo, sur le même téléphone.** La bascule *À deux* de l'accueil demande
les deux prénoms, puis lance la grille à tour de rôle : on se passe l'appareil
comme on se passe le magazine. La main change dès qu'un mot est tranché, juste
ou faux, et le bouton *Je passe* la rend sans rien résoudre. Le score est
commun — la grille se gagne à deux — et un compteur indique seulement qui a
bouclé combien de mots. La partie à deux a sa propre sauvegarde : commencer une
grille en solo et la refaire en duo ne mélange pas les deux.

**Une grille terminée se revoit.** En y revenant, elle s'affiche remplie, avec
le score et le nombre de fautes du record, sans clavier — c'est la page des
solutions du magazine. Un bouton *Rejouer* la remet à zéro. Rien n'est
recompté au passage : revoir une grille ne rapporte pas d'étoiles.

**Une partie se quitte et se reprend.** Chaque coup est enregistré : lettres
posées, mots validés, score, fautes, indices achetés et temps écoulé. Revenez
plus tard, même après avoir fermé le navigateur, et la grille est exactement
comme vous l'avez laissée — l'accueil affiche « Reprendre » et l'avancement.
Le temps est stocké en durée écoulée et non en heure de départ, sinon une
partie reprise le lendemain afficherait vingt heures de jeu. Le défi du jour a
sa propre sauvegarde par date, et une grille terminée efface la sienne. Une
sauvegarde faite avant une régénération du contenu est ignorée : elle ne
correspondrait plus à la grille affichée.

La progression, les meilleurs scores, la cagnotte d'étoiles, la partie en cours
et la série quotidienne sont stockés dans le `localStorage` du navigateur —
rien ne part sur un serveur.

Les tarifs et le taux de gain sont des constantes à ajuster : `COUT_LETTRE`,
`COUT_MOT_PAR_LETTRE`, `COUT_MOT_MINIMUM`, `COUT_INDEX` et `COUT_SOLUTIONS`
dans `src/jeu/partie.ts`, `ETOILES_DEPART` et `etoilesPour()` dans
`src/jeu/stockage.ts`.

## Mises à jour de l'application installée

Une fois l'app ajoutée à l'écran d'accueil, il n'y a plus de barre d'adresse,
donc plus de bouton *recharger*. C'est un piège classique des PWA : le service
worker sert les fichiers déjà en cache, et sans mécanisme explicite la page
tourne indéfiniment sur l'ancienne version.

Le service worker est donc enregistré à la main (`src/App.tsx`), en mode
`prompt` :

- une vérification a lieu au lancement, toutes les trente minutes, et chaque
  fois que l'app revient au premier plan ;
- quand une version est prête, un bandeau *Nouvelle version* apparaît **sans
  recharger** — c'est le seul chemin vers la mise à jour en mode application ;
- l'aide affiche la date du build et propose une recherche manuelle, en dernier
  recours.

Le rechargement n'est pas délégué à `vite-plugin-pwa` : sa fonction attend un
changement de contrôleur marqué comme mise à jour, ce qui ne se produit pas
quand la page n'avait pas encore de service worker. On écoute donc
`controllerchange` soi-même, avec un délai de sécurité.

## Modifier le contenu

Tout le contenu éditorial vit dans `content/`, et rien dans le code.

### `content/wordbank.json` — les mots et leurs définitions

```json
{"m": "DEEPFAKE", "d": "La video truquee qui fait peur", "t": "net", "n": 3}
```

- `m` : le mot, **en majuscules sans accent** (convention des mots fléchés), A–Z uniquement.
- `d` : la définition affichée. Les accents sont autorisés ici.
- `t` : thème — `pop`, `net`, `actu`, `sport`, `gaming` ou `vie`. Le générateur
  privilégie tout ce qui n'est pas `vie` : ce sont les mots « vedettes ».
- `n` : difficulté de 1 à 4. Le niveau 1 ne pioche que dans `n ≤ 2`, le niveau 2
  dans `n ≤ 3`, les niveaux 3 et 4 dans tout.

C'est ici qu'on rafraîchit l'actualité : remplacez une entrée devenue datée,
gardez la même longueur de mot si vous voulez éviter de régénérer les grilles.

### `content/templates.json` — la liste des grilles

Une entrée par grille : `id`, `niveau`, `titre`, `collection`
(`campagne` ou `quotidien`), `cols`, `rows` et `seed`. La graine rend la
génération reproductible : même graine, même grille. Changez-la pour retirer
une grille au hasard, ajoutez une entrée pour créer une nouvelle grille.

### Régénérer

```bash
npm run grilles     # python3 tools/build_grids.py
```

Le script écrit `src/data/grids.json`, qui est le contenu figé consommé par
l'application. Vous pouvez aussi l'éditer à la main pour corriger une grille
ponctuellement — mais toute régénération l'écrase.

## Comment les grilles sont construites

Une grille pleine demande un dictionnaire de plusieurs dizaines de milliers de
mots : les quelques centaines de définitions écrites à la main ne suffisent pas
à faire tenir trente mots entrecroisés sans trou. Le contenu vient donc de deux
sources, et `tools/` en fait deux étapes.

**1. Le lexique** — `tools/build_lexique.py` part des 336 000 formes du paquet
npm `an-array-of-french-words`, les débarrasse de leurs accents (convention des
mots fléchés) et les note avec `wordfreq`, qui donne la fréquence d'usage réelle
sur l'échelle Zipf. Sans ce filtre le remplissage sort des mots comme AGUEUSIE
ou OSASSENT : injouables, et impossibles à définir. Seuls les 24 000 mots
au-dessus de Zipf 2,8 sont conservés, avec leur score — c'est lui qui sert
ensuite d'échelle de difficulté.

```bash
pip install wordfreq
python3 tools/build_lexique.py     # -> content/lexique.json
```

**2. Les grilles** — `tools/build_grids.py` dessine d'abord le gabarit. Un mot
ne peut démarrer que juste après une case de définition, ce qui impose la
première ligne et la première colonne ; des *encoches* de deux lettres mordent
sur ces bords pour casser le mot pleine hauteur qu'ils créeraient sinon. Les
cases de définition intérieures viennent découper les mots trop longs, sans
jamais isoler une lettre, sans laisser une case de définition qui n'annonce
rien, et en tolérant au plus trois mots de deux lettres. Puis un remplissage par
retour arrière pose les mots, en proposant d'abord les mots vedettes du thème,
ensuite le lexique trié par écart à la fréquence visée pour le niveau.

Un vérificateur relit la grille finale comme le ferait un joueur : toute suite
de deux lettres ou plus doit correspondre exactement à un mot posé, aucune case
ne peut être à la fois vide et sans définition, et aucune case de définition ne
peut recouvrir une lettre.

**Le contenu est reproductible.** Deux exécutions donnent les mêmes grilles, et
surtout : ajouter une définition à la banque ne les change pas. C'est une
propriété qu'il a fallu construire — l'ordre de préférence ne dépend que de la
fréquence du mot et d'un bruit calculé à partir du mot lui-même, jamais de
l'ordre d'un dictionnaire ni d'un `set` Python. Sans cela, chaque définition
ajoutée rebattait le tirage, faisait apparaître de nouveaux mots à définir, et
le travail ne convergeait jamais.

**La boucle de travail** est donc : lancer le générateur, lire
`content/a-definir.json` (les mots utilisés qui n'ont pas encore de
définition), les écrire dans `content/wordbank.json`, relancer. Le fichier finit
vide, et les grilles n'ont pas bougé.

## Structure

```
content/wordbank.json    les définitions, écrites à la main
content/lexique.json     les mots français courants et leur fréquence (généré)
content/templates.json   la liste des grilles : thème, niveau, graine
content/a-definir.json   les mots qu'il reste à définir (généré)
tools/build_lexique.py   construit le lexique (nécessite pip install wordfreq)
tools/build_grids.py     dessine et remplit les grilles
src/data/grids.json      les grilles générées, figées
src/jeu/                 modèle de grille, règles de partie, score, sauvegarde
src/composants/          écrans et composants React
```
