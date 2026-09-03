#!/usr/bin/env python3
"""
Generateur de grilles de mots fleches denses, facon magazine.

Lit  : content/lexique.txt     (132 000 mots francais, sans accent)
       content/wordbank.json   (mots vedettes + toutes les definitions)
       content/templates.json  (une entree par grille)
Ecrit: src/data/grids.json     (contenu fige consomme par l application)
       content/a-definir.json  (mots utilises qui n ont pas encore de definition)

Une grille de magazine n a pas de trou: chaque case est soit une lettre, soit
une case definition qui porte une ou deux definitions. C est ce que ce script
vise. Le lexique sert a remplir; la banque fournit les mots vedettes et,
surtout, les definitions. Un mot sans definition n est pas une erreur au
premier passage: il est reporte dans content/a-definir.json, on ecrit sa
definition, et la grille devient complete.

Lancer:  python3 tools/build_grids.py
"""
import json, random, os, sys, zlib
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Depuis une case definition, la fleche designe le depart du mot.
FLECHES_H = (("droite", 0, -1), ("bas-droite", -1, 0))
FLECHES_V = (("bas", -1, 0), ("droite-bas", 0, -1))

LONGUEUR_MAX = 9
LONGUEUR_MIN = 2
# un mot de deux lettres n est pas un mot: on n en tolere qu une poignee
COURTS_TOLERES = 3


def charger(nom):
    with open(os.path.join(ROOT, nom), encoding="utf-8") as f:
        return json.load(f)


# ------------------------------------------------------------------ gabarit

def slots(motif):
    """Tous les emplacements de mots: suites de 2 lettres ou plus."""
    rows, cols = len(motif), len(motif[0])
    out = []
    for r in range(rows):
        c = 0
        while c < cols:
            if motif[r][c] == ".":
                d = c
                while d < cols and motif[r][d] == ".":
                    d += 1
                if d - c >= LONGUEUR_MIN:
                    out.append({"r": r, "c": c, "dir": "h", "len": d - c})
                c = d
            else:
                c += 1
    for c in range(cols):
        r = 0
        while r < rows:
            if motif[r][c] == ".":
                d = r
                while d < rows and motif[d][c] == ".":
                    d += 1
                if d - r >= LONGUEUR_MIN:
                    out.append({"r": r, "c": c, "dir": "v", "len": d - r})
                r = d
            else:
                r += 1
    for i, s in enumerate(out):
        s["id"] = i
        s["cells"] = [(s["r"], s["c"] + k) if s["dir"] == "h" else (s["r"] + k, s["c"])
                      for k in range(s["len"])]
    return out


def ancres(slot, motif):
    rows, cols = len(motif), len(motif[0])
    out = []
    for (nom, dr, dc) in (FLECHES_H if slot["dir"] == "h" else FLECHES_V):
        r, c = slot["r"] + dr, slot["c"] + dc
        if 0 <= r < rows and 0 <= c < cols and motif[r][c] == "#":
            out.append((r, c, nom))
    return out


def affecter(liste, motif):
    """Chaque mot recoit une case definition; deux definitions par case au plus.
    On repartit pour laisser le moins de cases definition inutilisees."""
    cand = {s["id"]: ancres(s, motif) for s in liste}
    if any(not v for v in cand.values()):
        return None
    ordre = sorted(liste, key=lambda s: len(cand[s["id"]]))
    charge = defaultdict(int)
    resultat = {}

    def bt(i):
        if i == len(ordre):
            return True
        s = ordre[i]
        options = sorted(cand[s["id"]], key=lambda a: charge[(a[0], a[1])])
        for (r, c, nom) in options:
            if charge[(r, c)] >= 2:
                continue
            charge[(r, c)] += 1
            resultat[s["id"]] = (r, c, nom)
            if bt(i + 1):
                return True
            charge[(r, c)] -= 1
            del resultat[s["id"]]
        return False

    return resultat if bt(0) else None


def defauts(motif, liste, affectation):
    """Ce qui empeche une grille d avoir l air d une grille de magazine."""
    rows, cols = len(motif), len(motif[0])
    couvertes = {cell for s in liste for cell in s["cells"]}
    orphelines = [(r, c) for r in range(rows) for c in range(cols)
                  if motif[r][c] == "." and (r, c) not in couvertes]
    utilisees = {(r, c) for (r, c, _) in affectation.values()}
    mortes = [(r, c) for r in range(rows) for c in range(cols)
              if motif[r][c] == "#" and (r, c) not in utilisees]
    return orphelines, mortes


def generer_motif(cols, rows, rng, densite=0.30):
    """Pose les cases definition.

    Un mot ne peut demarrer que juste apres une case definition: la premiere
    ligne et la premiere colonne en sont donc forcement, sinon les mots du
    bord n auraient aucune fleche pour les annoncer. C est exactement ce que
    font les grilles de magazine. Le reste des cases definition vient casser
    les mots trop longs, sans jamais isoler une lettre ni se retrouver sans
    definition a porter.
    """
    def utile(motif, r, c):
        """Une case definition doit annoncer au moins un mot."""
        rows_, cols_ = len(motif), len(motif[0])
        if c + 1 < cols_ and motif[r][c + 1] == ".":
            d = c + 1
            while d < cols_ and motif[r][d] == ".":
                d += 1
            if d - (c + 1) >= LONGUEUR_MIN:
                return True
        if r + 1 < rows_ and motif[r + 1][c] == ".":
            d = r + 1
            while d < rows_ and motif[d][c] == ".":
                d += 1
            if d - (r + 1) >= LONGUEUR_MIN:
                return True
        return False

    def valide(motif):
        lignes = ["".join(x) for x in motif]
        liste = slots(lignes)
        couvertes = {cell for s in liste for cell in s["cells"]}
        for a in range(len(motif)):
            for b in range(len(motif[0])):
                if lignes[a][b] == "." and (a, b) not in couvertes:
                    return None
                if lignes[a][b] == "#" and (a, b) != (0, 0) and not utile(lignes, a, b):
                    return None
        return affecter(liste, lignes)

    def encocher(motif, rng):
        """Deux lettres qui mordent sur le bord, et la colonne (ou la ligne)
        suivante peut enfin recevoir une case definition: c est ce qui casse
        le mot pleine hauteur du bord dans les grilles de magazine."""
        R, C = len(motif), len(motif[0])
        tentatives = ([("g", r) for r in range(1, R - 1)]
                      + [("h", c) for c in range(1, C - 1)])
        rng.shuffle(tentatives)
        poses = 0
        for (bord, i) in tentatives:
            if poses >= 3:
                break
            cases = ([((i, 0), "."), ((i + 1, 0), "."), ((i, 1), "#"), ((i + 1, 1), "#")]
                     if bord == "g" else
                     [((0, i), "."), ((0, i + 1), "."), ((1, i), "#"), ((1, i + 1), "#")])
            avant = [(p, motif[p[0]][p[1]]) for p, _ in cases]
            if any(motif[p[0]][p[1]] != ("#" if v == "." else ".") for p, v in cases):
                continue
            for (a, b), v in cases:
                motif[a][b] = v
            if valide(motif) is None:
                for (a, b), v in avant:
                    motif[a][b] = v
                continue
            poses += 1

    meilleur = None
    for _ in range(120):
        motif = [["." for _ in range(cols)] for _ in range(rows)]
        for c in range(cols):
            motif[0][c] = "#"
        for r in range(rows):
            motif[r][0] = "#"
        encocher(motif, rng)

        interieur = [(r, c) for r in range(1, rows) for c in range(1, cols)]
        rng.shuffle(interieur)
        cible = int(densite * cols * rows) - (cols + rows - 1)
        poses = 0
        for (r, c) in interieur:
            lignes = ["".join(x) for x in motif]
            trop_longs = [s for s in slots(lignes) if s["len"] > LONGUEUR_MAX]
            if poses >= cible and not trop_longs:
                break
            if poses >= cible and not any((r, c) in s["cells"] for s in trop_longs):
                continue
            motif[r][c] = "#"
            essai = ["".join(x) for x in motif]
            liste = slots(essai)
            couvertes = {cell for s in liste for cell in s["cells"]}
            orphelines = any(essai[a][b] == "." and (a, b) not in couvertes
                             for a in range(rows) for b in range(cols))
            mortes = any(essai[a][b] == "#" and not utile(essai, a, b)
                         for a in range(rows) for b in range(cols) if (a, b) != (0, 0))
            courts = sum(1 for x in liste if x["len"] == 2)
            if orphelines or mortes or courts > COURTS_TOLERES:
                motif[r][c] = "."
                continue
            poses += 1

        lignes = ["".join(x) for x in motif]
        liste = slots(lignes)
        if any(s["len"] > LONGUEUR_MAX for s in liste):
            continue
        affectation = affecter(liste, lignes)
        if affectation is None:
            continue
        orph, mortes = defauts(lignes, liste, affectation)
        if orph:
            continue
        # la case du coin ne peut annoncer aucun mot: elle porte le badge de
        # la grille dans l interface, ce n est pas un trou
        mortes = [m for m in mortes if m != (0, 0)]
        courts = sum(1 for x in liste if x["len"] == 2)
        if courts > COURTS_TOLERES:
            continue
        # a nombre de mots comparable, on prefere les grilles aux mots longs
        note = (-len(mortes), -courts, sum(min(x["len"], 6) for x in liste))
        if meilleur is None or note > meilleur[0]:
            meilleur = (note, lignes, liste, affectation)
        if not mortes and courts <= 1 and len(liste) >= 22:
            break
    return meilleur


# --------------------------------------------------------------- vocabulaire

# frequence Zipf visee par niveau: c est elle qui fait la difficulte.
# 5 = mot de tous les jours, 3 = mot connu mais qu on n emploie plus guere.
ZIPF_CIBLE = {1: 5.2, 2: 4.4, 3: 3.7, 4: 3.1}
ZIPF_PLANCHER = {1: 3.1, 2: 3.0, 3: 2.9, 4: 2.8}


class Vocabulaire:
    """L ordre de cette liste est l ordre de preference du remplissage.

    Deux etages seulement, et c est volontaire: les mots vedettes du theme
    d abord, puis tout le reste classe par frequence. Ecrire la definition
    d un mot ne le fait donc pas changer d etage, et regenerer les grilles
    redonne exactement les memes: sans ca, chaque definition ajoutee
    rebattrait les cartes et le travail ne convergerait jamais.
    """

    VEDETTES = {"moderne": {"pop", "net", "gaming", "actu", "sport"},
                "classique": set()}
    INTERDITS = {"classique": {"pop", "net", "gaming"}, "moderne": set()}
    ZIPF_DEFAUT = 4.0

    def __init__(self, banque, lexique, theme, niveau, graine, deja_vus):
        cible, plancher = ZIPF_CIBLE[niveau], ZIPF_PLANCHER[niveau]

        def bruit(mot):
            """Desordre reproductible, calcule a partir du mot lui-meme: il ne
            depend pas de l ordre du dictionnaire, donc ajouter une definition
            a la banque ne rebat pas le tirage."""
            return zlib.crc32(f"{graine}:{mot}".encode()) % 1000 / 4000
        vedettes, reste = [], {}

        for m in banque:
            if m["t"] in self.INTERDITS[theme]:
                continue
            if m["t"] in self.VEDETTES[theme]:
                vedettes.append(m)
            else:
                reste[m["m"]] = lexique.get(m["m"], self.ZIPF_DEFAUT)
        for m in vedettes:
            m["_p"] = (-3 * abs(m.get("n", 2) - niveau)
                       - (8 if m["m"] in deja_vus else 0) + bruit(m["m"]) * 16)
        vedettes.sort(key=lambda m: (-m["_p"], m["m"]))

        for mot, z in lexique.items():
            if z >= plancher:
                reste.setdefault(mot, z)
        # l ordre ne depend que de la frequence, jamais de la presence d une
        # definition: sinon chaque definition ajoutee rebattrait le tirage et
        # il faudrait en ecrire de nouvelles a l infini
        ordre = sorted(reste.items(),
                       key=lambda t: (abs(t[1] - cible)
                                      + (0.7 if t[0] in deja_vus else 0)
                                      + bruit(t[0]), t[0]))

        self.mots = [m["m"] for m in vedettes] + [mot for mot, _ in ordre]
        self.par_long = defaultdict(list)
        for i, mot in enumerate(self.mots):
            self.par_long[len(mot)].append(i)
        self.tout = {L: set(v) for L, v in self.par_long.items()}
        self.index = defaultdict(set)
        for i, mot in enumerate(self.mots):
            for pos, ch in enumerate(mot):
                self.index[(len(mot), pos, ch)].add(i)

    def candidats(self, longueur, motif):
        res = self.tout.get(longueur)
        if res is None:
            return set()
        contraintes = [(i, ch) for i, ch in enumerate(motif) if ch]
        if not contraintes:
            return res
        contraintes.sort(key=lambda t: len(self.index.get((longueur, t[0], t[1]), ())))
        res = self.index.get((longueur, *contraintes[0]), set())
        for pos, ch in contraintes[1:]:
            if not res:
                break
            res = res & self.index.get((longueur, pos, ch), set())
        return res


def remplir(liste, vocab, budget=15000, largeur=200):
    lettres, utilises, choix = {}, set(), {}
    noeuds = [0]

    def bt(restants):
        if not restants:
            return True
        noeuds[0] += 1
        if noeuds[0] > budget:
            raise TimeoutError
        meilleur = None
        for s in restants:
            idx = vocab.candidats(s["len"], [lettres.get(c) for c in s["cells"]])
            libres = [i for i in idx if vocab.mots[i] not in utilises]
            if not libres:
                return False
            if meilleur is None or len(libres) < len(meilleur[1]):
                meilleur = (s, libres)
                if len(libres) == 1:
                    break
        s, libres = meilleur
        libres.sort()
        suite = [x for x in restants if x is not s]
        for i in libres[:largeur]:
            mot = vocab.mots[i]
            poses = []
            for k, cell in enumerate(s["cells"]):
                if cell not in lettres:
                    lettres[cell] = mot[k]
                    poses.append(cell)
            utilises.add(mot)
            choix[s["id"]] = mot
            if bt(suite):
                return True
            for cell in poses:
                del lettres[cell]
            utilises.discard(mot)
            del choix[s["id"]]
        return False

    return (choix, lettres) if bt(list(liste)) else (None, None)


def verifier(motif, liste, choix, lettres):
    """Relit la grille comme un joueur: toute suite de deux lettres ou plus
    doit etre exactement un mot pose, et aucune case ne doit rester vide."""
    rows, cols = len(motif), len(motif[0])
    attendus = {(s["r"], s["c"], s["dir"]): choix[s["id"]] for s in liste}
    trouves = {}
    for r in range(rows):
        c = 0
        while c < cols:
            if (r, c) in lettres:
                d = c
                while d < cols and (r, d) in lettres:
                    d += 1
                if d - c >= 2:
                    trouves[(r, c, "h")] = "".join(lettres[(r, k)] for k in range(c, d))
                c = d
            else:
                c += 1
    for c in range(cols):
        r = 0
        while r < rows:
            if (r, c) in lettres:
                d = r
                while d < rows and (d, c) in lettres:
                    d += 1
                if d - r >= 2:
                    trouves[(r, c, "v")] = "".join(lettres[(k, c)] for k in range(r, d))
                r = d
            else:
                r += 1
    if trouves != attendus:
        raise SystemExit(f"  ! grille incoherente: {set(attendus) ^ set(trouves)}")
    for r in range(rows):
        for c in range(cols):
            if (motif[r][c] == ".") != ((r, c) in lettres):
                raise SystemExit(f"  ! case ({r},{c}) ni lettre ni definition")


def cases_speciales(liste, niveau, rng):
    quotas = {1: {"bonus": 1, "cadeau": 2}, 2: {"bonus": 2, "cadeau": 1, "mystere": 1},
              3: {"bonus": 2, "cadeau": 1, "mystere": 2},
              4: {"bonus": 3, "cadeau": 1, "mystere": 2}}[niveau]
    compte = defaultdict(int)
    for s in liste:
        for cell in s["cells"]:
            compte[cell] += 1
    croisements = sorted(c for c in compte if compte[c] > 1)
    simples = sorted(c for c in compte if compte[c] == 1)
    rng.shuffle(croisements)
    rng.shuffle(simples)
    pris, out = set(), []
    for t in ("bonus", "mystere", "cadeau"):
        for _ in range(quotas.get(t, 0)):
            for cell in (croisements if t == "bonus" else simples + croisements):
                if cell not in pris:
                    pris.add(cell)
                    out.append({"r": cell[0], "c": cell[1], "type": t})
                    break
    return sorted(out, key=lambda s: (s["r"], s["c"]))


def construire(gab, banque, lexique, deja_vus):
    cols, rows = gab["cols"], gab["rows"]
    # le vocabulaire ne depend pas du gabarit: on ne le construit qu une fois
    vocab = Vocabulaire([dict(m) for m in banque], lexique, gab["theme"],
                        gab["niveau"], gab["seed"], deja_vus)
    for essai in range(25):
        rng = random.Random(gab["seed"] * 7919 + essai)
        trouve = generer_motif(cols, rows, rng)
        if trouve is None:
            continue
        _, motif, liste, affectation = trouve
        try:
            choix, lettres = remplir(liste, vocab)
        except TimeoutError:
            choix = None
        if choix:
            break
    else:
        raise SystemExit(f"  ! {gab['id']}: remplissage impossible.")

    verifier(motif, liste, choix, lettres)

    defs = defaultdict(list)
    mots_out = []
    for s in sorted(liste, key=lambda s: (s["r"], s["c"], s["dir"])):
        dr, dc, fleche = affectation[s["id"]]
        wid = len(mots_out)
        mots_out.append({"id": wid, "r": s["r"], "c": s["c"], "dir": s["dir"],
                         "long": s["len"], "reponse": choix[s["id"]],
                         "fleche": fleche, "defR": dr, "defC": dc})
        defs[(dr, dc)].append(wid)
    for (dr, dc), ids in defs.items():
        for i, wid in enumerate(ids):
            mots_out[wid]["defSlot"] = i
            mots_out[wid]["defTotal"] = len(ids)

    fiche = {k: gab[k] for k in ("cahier", "rang", "objectif") if k in gab}
    return {"id": gab["id"], "niveau": gab["niveau"], "theme": gab["theme"],
            "titre": gab["titre"], "collection": gab.get("collection", "parcours"),
            **fiche,
            "cols": cols, "rows": rows, "mots": mots_out,
            "defs": [{"r": r, "c": c, "mots": ids} for (r, c), ids in sorted(defs.items())],
            "special": cases_speciales(liste, gab["niveau"], random.Random(gab["seed"] * 31)),
            "solution": ["".join(lettres.get((r, c), "#") for c in range(cols))
                         for r in range(rows)]}


def main():
    banque = charger("content/wordbank.json")["mots"]
    lexique = charger("content/lexique.json")["mots"]
    # certaines reponses n ont pas leur place dans une grille grand public
    exclus = set(charger("content/exclus.json")["mots"])
    lexique = {m: z for m, z in lexique.items() if m not in exclus}
    banque = [m for m in banque if m["m"] not in exclus]
    definitions = {m["m"]: m for m in banque}
    gabarits = charger("content/templates.json")["grilles"]

    # file ordonnee, jamais un set: l ordre d iteration d un set varie d un
    # process a l autre (hachage randomise) et la generation ne serait plus
    # reproductible
    grilles, recents, manquants = [], [], {}
    for gab in gabarits:
        deja_vus = set(recents)
        g = construire(gab, banque, lexique, deja_vus)
        for m in g["mots"]:
            entree = definitions.get(m["reponse"])
            if entree:
                m["definition"], m["theme"], m["n"] = entree["d"], entree["t"], entree["n"]
            else:
                m["definition"], m["theme"], m["n"] = "", "?", 2
                manquants[m["reponse"]] = g["theme"]
        for m in g["mots"]:
            if m["reponse"] not in recents:
                recents.append(m["reponse"])
        recents = recents[-250:]
        trous = sum(1 for x in g["solution"] for ch in x if ch == "#")
        adef = sum(1 for m in g["mots"] if not m["definition"])
        print(f"  {g['id']:>10}  {g['cols']}x{g['rows']}  {len(g['mots']):2d} mots  "
              f"{len(g['defs']):2d} cases def  {trous - len(g['defs'])} case(s) morte(s)"
              f"  {adef} a definir")
        grilles.append(g)

    with open(os.path.join(ROOT, "src/data/grids.json"), "w", encoding="utf-8") as f:
        json.dump({"_genere_par": "tools/build_grids.py", "grilles": grilles},
                  f, ensure_ascii=False, indent=1)
    with open(os.path.join(ROOT, "content/a-definir.json"), "w", encoding="utf-8") as f:
        json.dump({"_lisezmoi": "Mots utilises par les grilles qui n ont pas encore de "
                                "definition. Ajoutez-les a content/wordbank.json.",
                   "mots": [{"m": k, "theme": v} for k, v in sorted(manquants.items())]},
                  f, ensure_ascii=False, indent=1)
    print(f"\n  {len(grilles)} grilles, {sum(len(g['mots']) for g in grilles)} mots.")
    if manquants:
        print(f"  {len(manquants)} mots sans definition -> content/a-definir.json")
        sys.exit(0)


if __name__ == "__main__":
    main()
