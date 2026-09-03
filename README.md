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

**Quatre niveaux**, de plus en plus durs et de plus en plus grands :

| Niveau | Nom | Taille | Mots | Contenu |
|---|---|---|---|---|
| 1 | Échauffement | 6 × 8 | ~8 | Références grand public |
| 2 | Ça se corse | 7 × 9 | ~10 | Plus de croisements |
| 3 | Pour les tenaces | 7 × 11 | ~13 | Culture plus pointue |
| 4 | Boss final | 8 × 12 | ~16 | Tout est permis |

Le **défi du jour** tire une grille du pool quotidien selon la date : tout le
monde a la même le même jour, et le score se partage en pastilles (façon Wordle)
sans rien divulguer des réponses. Une série de jours consécutifs est comptée.

**Lecture des définitions.** Les cases de définition ne portent qu'un numéro et
une flèche — illisible autrement sur un écran de téléphone. Le texte complet
s'affiche dans la barre entre la grille et le clavier, et la rangée de numéros
juste au-dessus permet de sauter directement au mot voulu. La flèche indique où
le mot commence et dans quel sens il se lit : `→` à droite, `↓` en dessous,
`↳` en dessous puis vers la droite, `↴` à droite puis vers le bas.

**Cases spéciales**, une par grille au niveau 1, jusqu'à cinq au niveau 4 :

- **Bonus** (point doré) — le mot qui la traverse rapporte le double.
- **Mystère** (point violet) — la lettre saisie reste masquée jusqu'à ce que le
  mot soit validé.
- **Cadeau** (point cyan) — lettre offerte, déjà en place au démarrage.

**Score.** 10 points par lettre d'un mot juste, doublés par une case bonus.
Un mot complété faux coûte 15 points et ses lettres fautives s'effacent ; les
lettres déjà verrouillées par un mot juste, elles, ne bougent pas. Terminer
une grille sans la moindre faute vaut +120.

La progression, les meilleurs scores et la série quotidienne sont stockés dans
le `localStorage` du navigateur — rien ne part sur un serveur.

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

Remplir un gabarit pré-dessiné, à la manière des mots croisés, demande un
dictionnaire de plusieurs dizaines de milliers de mots ; ici la banque est
écrite à la main, elle en compte quelques centaines. `tools/build_grids.py`
procède donc dans l'autre sens : il pose un premier mot, puis accroche les
suivants à chaque fois qu'ils croisent une lettre déjà posée, en réservant au
passage la case de définition et la case de séparation de chaque mot. Une
grille sans case de définition disponible est refusée d'emblée, et un
vérificateur relit la grille finale comme le ferait un joueur : toute suite de
deux lettres ou plus doit correspondre exactement à un mot posé, sinon la
grille est rejetée.

## Structure

```
content/          contenu éditorial (banque de mots, liste des grilles)
tools/            générateur de grilles (Python 3, aucune dépendance)
src/data/         grilles générées, figées
src/jeu/          modèle de grille, règles de partie, score, sauvegarde
src/composants/   écrans et composants React
```
