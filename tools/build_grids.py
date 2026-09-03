#!/usr/bin/env python3
"""
Generateur de grilles de mots fleches.

Lit  : content/wordbank.json  (banque de mots + definitions)
       content/templates.json (une entree par grille: taille, niveau, graine)
Ecrit: src/data/grids.json    (contenu fige consomme par l application)

Methode: on ne remplit pas un squelette pre-dessine (cela demanderait un
dictionnaire de plusieurs dizaines de milliers de mots). On pose un premier
mot, puis on accroche les suivants dessus a chaque fois qu ils croisent une
lettre deja posee. Les cases definition sont reservees au fur et a mesure,
ce qui garantit que chaque mot est atteignable par une fleche.

Lancer:  python3 tools/build_grids.py
"""
import json, random, os
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Une fleche part d une case definition et designe le depart du mot.
# droite      -> le mot part de la case a droite,    se lit horizontalement
# bas         -> le mot part de la case en dessous,  se lit verticalement
# bas-droite  -> le mot part de la case en dessous,  se lit horizontalement
# droite-bas  -> le mot part de la case a droite,    se lit verticalement
FLECHE_H = ("droite", "bas-droite")
FLECHE_V = ("bas", "droite-bas")

MOTS_PAR_NIVEAU = {1: 11, 2: 15, 3: 19, 4: 24}
PLAFOND_DIFFICULTE = {1: 2, 2: 3, 3: 4, 4: 4}


def charger(nom):
    with open(os.path.join(ROOT, nom), encoding="utf-8") as f:
        return json.load(f)


class Grille:
    """Etat d une grille en construction."""

    def __init__(self, cols, rows):
        self.cols, self.rows = cols, rows
        self.lettres = {}          # (r,c) -> lettre
        self.bloquees = set()      # (r,c) qui ne prendront jamais de lettre
        self.defs = defaultdict(list)   # (r,c) -> [id de mot]
        self.mots = []

    def dans(self, r, c):
        return 0 <= r < self.rows and 0 <= c < self.cols

    def libre(self, r, c):
        """Case sans lettre (hors grille compte comme libre)."""
        return (r, c) not in self.lettres

    def cellules(self, r, c, direction, longueur):
        return [(r, c + k) if direction == "h" else (r + k, c)
                for k in range(longueur)]

    def ancre_possible(self, r, c, direction):
        """Case definition capable de pointer vers un mot demarrant ici."""
        options = ((r, c - 1, FLECHE_H[0]), (r - 1, c, FLECHE_H[1])) \
            if direction == "h" else \
            ((r - 1, c, FLECHE_V[0]), (r, c - 1, FLECHE_V[1]))
        for (dr, dc, fleche) in options:
            if not self.dans(dr, dc):
                continue
            if (dr, dc) in self.lettres:
                continue
            if len(self.defs.get((dr, dc), ())) >= 2:
                continue
            return (dr, dc, fleche)
        return None

    def placement_valide(self, mot, r, c, direction, premier):
        L = len(mot)
        cells = self.cellules(r, c, direction, L)
        if not self.dans(r, c) or not self.dans(*cells[-1]):
            return None
        # la case juste avant et juste apres le mot ne doivent pas etre des lettres
        avant = (r, c - 1) if direction == "h" else (r - 1, c)
        apres = (r, c + L) if direction == "h" else (r + L, c)
        for cell in (avant, apres):
            if self.dans(*cell) and cell in self.lettres:
                return None
        croisements = 0
        for k, cell in enumerate(cells):
            if cell in self.bloquees:
                return None
            if cell in self.lettres:
                if self.lettres[cell] != mot[k]:
                    return None
                croisements += 1
            else:
                # une case neuve ne doit pas coller a un mot parallele
                voisins = ((cell[0] - 1, cell[1]), (cell[0] + 1, cell[1])) \
                    if direction == "h" else \
                    ((cell[0], cell[1] - 1), (cell[0], cell[1] + 1))
                for v in voisins:
                    if self.dans(*v) and v in self.lettres:
                        return None
        if not premier and croisements == 0:
            return None
        if croisements == L:
            return None                      # le mot est deja entierement la
        ancre = self.ancre_possible(r, c, direction)
        if ancre is None:
            return None
        return {"croisements": croisements, "ancre": ancre, "cells": cells,
                "apres": apres}

    def poser(self, entree, r, c, direction, info):
        mot = entree["m"]
        for k, cell in enumerate(info["cells"]):
            self.lettres[cell] = mot[k]
        dr, dc, fleche = info["ancre"]
        wid = len(self.mots)
        self.defs[(dr, dc)].append(wid)
        self.bloquees.add((dr, dc))
        if self.dans(*info["apres"]):
            self.bloquees.add(info["apres"])
        self.mots.append({
            "id": wid, "r": r, "c": c, "dir": direction, "long": len(mot),
            "reponse": mot, "definition": entree["d"], "theme": entree["t"],
            "fleche": fleche, "defR": dr, "defC": dc,
        })


def verifier(g):
    """Relit la grille finale comme le ferait un joueur: toute suite de 2
    lettres ou plus doit correspondre exactement a un mot pose."""
    attendus = {(m["r"], m["c"], m["dir"]): m["reponse"] for m in g.mots}
    trouves = {}
    for r in range(g.rows):
        c = 0
        while c < g.cols:
            if (r, c) in g.lettres:
                d = c
                while d < g.cols and (r, d) in g.lettres:
                    d += 1
                if d - c >= 2:
                    trouves[(r, c, "h")] = "".join(g.lettres[(r, k)] for k in range(c, d))
                c = d
            else:
                c += 1
    for c in range(g.cols):
        r = 0
        while r < g.rows:
            if (r, c) in g.lettres:
                d = r
                while d < g.rows and (d, c) in g.lettres:
                    d += 1
                if d - r >= 2:
                    trouves[(r, c, "v")] = "".join(g.lettres[(k, c)] for k in range(r, d))
                r = d
            else:
                r += 1
    if trouves != attendus:
        manquants = set(attendus) ^ set(trouves)
        raise SystemExit(f"  ! Grille incoherente (mots parasites ou tronques): {manquants}")
    # chaque lettre appartient a au moins un mot
    couvertes = set()
    for m in g.mots:
        couvertes.update(g.cellules(m["r"], m["c"], m["dir"], m["long"]))
    orphelines = set(g.lettres) - couvertes
    if orphelines:
        raise SystemExit(f"  ! Lettres hors de tout mot: {orphelines}")
    collision = set(g.defs) & set(g.lettres)
    if collision:
        raise SystemExit(f"  ! Cases definition posees sur des lettres: {collision}")
    for (dr, dc), ids in g.defs.items():
        if not ids:
            raise SystemExit(f"  ! Case definition vide en ({dr},{dc}).")


def tirer_grille(cols, rows, niveau, mots, seed, deja_vus):
    rng = random.Random(seed)
    plafond = PLAFOND_DIFFICULTE[niveau]
    pool = [dict(m) for m in mots
            if m["n"] <= plafond and 3 <= len(m["m"]) <= max(cols, rows) - 1]
    for m in pool:
        m["_poids"] = (len(m["m"]) * 1.5
                       + (4 if m["t"] != "vie" else 0)
                       - 3 * abs(m["n"] - niveau)
                       - (6 if m["m"] in deja_vus else 0)
                       + rng.random() * 6)
    pool.sort(key=lambda m: -m["_poids"])

    g = Grille(cols, rows)
    depart = None
    for entree in pool[:25]:
        options = []
        for direction in ("h", "v"):
            for r in range(1, rows):
                for c in range(1, cols):
                    info = g.placement_valide(entree["m"], r, c, direction, premier=True)
                    if info:
                        options.append((r, c, direction, info))
        if options:
            depart = (entree,) + rng.choice(options)
            break
    if depart is None:
        return None
    entree, r0, c0, dir0, info = depart
    g.poser(entree, r0, c0, dir0, info)
    poses = {entree["m"]}

    cible = MOTS_PAR_NIVEAU[niveau]
    for _ in range(6):
        if len(g.mots) >= cible:
            break
        progres = False
        for entree in pool:
            if len(g.mots) >= cible:
                break
            if entree["m"] in poses:
                continue
            meilleur = None
            centre = (sum(k[0] for k in g.lettres) / len(g.lettres),
                      sum(k[1] for k in g.lettres) / len(g.lettres))
            for direction in ("h", "v"):
                for r in range(rows):
                    for c in range(cols):
                        info = g.placement_valide(entree["m"], r, c, direction, False)
                        if info is None:
                            continue
                        # on privilegie les croisements et les mots colles
                        # au bloc deja pose, pour eviter une grille eparpillee
                        cr, cc = centre[0], centre[1]
                        milieu = ((r + (0 if direction == "h" else len(entree["m"]) / 2)),
                                  (c + (len(entree["m"]) / 2 if direction == "h" else 0)))
                        ecart = abs(milieu[0] - cr) + abs(milieu[1] - cc)
                        score = (info["croisements"] * 14 + entree["_poids"]
                                 - ecart * 2.5 + rng.random() * 3)
                        if meilleur is None or score > meilleur[0]:
                            meilleur = (score, r, c, direction, info)
            if meilleur:
                _, r, c, direction, info = meilleur
                g.poser(entree, r, c, direction, info)
                poses.add(entree["m"])
                progres = True
        if not progres:
            break
    g.defs = defaultdict(list, {k: v for k, v in g.defs.items() if v})
    return g


def poser_cases_speciales(g, niveau, rng):
    quotas = {1: {"bonus": 1, "cadeau": 1},
              2: {"bonus": 1, "cadeau": 1, "mystere": 1},
              3: {"bonus": 2, "cadeau": 1, "mystere": 1},
              4: {"bonus": 2, "cadeau": 1, "mystere": 2}}[niveau]
    compte = defaultdict(int)
    for m in g.mots:
        for cell in g.cellules(m["r"], m["c"], m["dir"], m["long"]):
            compte[cell] += 1
    croisements = sorted(c for c in compte if compte[c] > 1)
    simples = sorted(c for c in compte if compte[c] == 1)
    rng.shuffle(croisements)
    rng.shuffle(simples)
    pris, out = set(), []
    for t in ("bonus", "mystere", "cadeau"):
        for _ in range(quotas.get(t, 0)):
            source = croisements if t == "bonus" else simples + croisements
            for cell in source:
                if cell not in pris:
                    pris.add(cell)
                    out.append({"r": cell[0], "c": cell[1], "type": t})
                    break
    return sorted(out, key=lambda s: (s["r"], s["c"]))


def recadrer(g):
    """Supprime les marges vides: la grille finale colle au contenu."""
    occupees = set(g.lettres) | set(g.defs)
    r0 = min(r for r, _ in occupees)
    c0 = min(c for _, c in occupees)
    r1 = max(r for r, _ in occupees)
    c1 = max(c for _, c in occupees)
    if (r0, c0) == (0, 0) and (r1, c1) == (g.rows - 1, g.cols - 1):
        return
    g.lettres = {(r - r0, c - c0): v for (r, c), v in g.lettres.items()}
    g.defs = defaultdict(list, {(r - r0, c - c0): v for (r, c), v in g.defs.items()})
    g.bloquees = {(r - r0, c - c0) for (r, c) in g.bloquees}
    for m in g.mots:
        m["r"] -= r0
        m["c"] -= c0
        m["defR"] -= r0
        m["defC"] -= c0
    g.rows, g.cols = r1 - r0 + 1, c1 - c0 + 1


def construire(gab, mots, deja_vus=()):
    cols, rows, niveau = gab["cols"], gab["rows"], gab["niveau"]
    plancher = max(6, round(MOTS_PAR_NIVEAU[niveau] * 0.45))
    meilleure = None
    for tour, vus in enumerate((deja_vus, ())):   # 2e passe sans anti-repetition
        for essai in range(80):
            g = tirer_grille(cols, rows, niveau, mots,
                             gab["seed"] * 977 + tour * 31 + essai, vus)
            if g is None or len(g.mots) < plancher:
                continue
            note = (len(g.mots) * 3 + len(g.lettres),)
            if meilleure is None or note > meilleure[0]:
                meilleure = (note, g)
            if len(g.mots) >= MOTS_PAR_NIVEAU[niveau]:
                break
        if meilleure is not None:
            break
    if meilleure is None:
        raise SystemExit(f"  ! {gab['id']}: impossible de construire la grille.")
    g = meilleure[1]
    verifier(g)
    recadrer(g)

    for (dr, dc), ids in g.defs.items():
        for i, wid in enumerate(ids):
            g.mots[wid]["defSlot"] = i
            g.mots[wid]["defTotal"] = len(ids)

    cols, rows = g.cols, g.rows
    solution = ["".join(g.lettres.get((r, c), "#") for c in range(cols))
                for r in range(rows)]
    rng = random.Random(gab["seed"] * 7919)
    return {
        "id": gab["id"], "niveau": niveau, "titre": gab["titre"],
        "collection": gab.get("collection", "campagne"),
        "cols": cols, "rows": rows,
        "mots": sorted(g.mots, key=lambda m: (m["r"], m["c"], m["dir"])),
        "defs": [{"r": r, "c": c, "mots": ids}
                 for (r, c), ids in sorted(g.defs.items())],
        "special": poser_cases_speciales(g, niveau, rng),
        "solution": solution,
    }


def main():
    wb = charger("content/wordbank.json")["mots"]
    gabarits = charger("content/templates.json")["grilles"]
    grilles, deja_vus = [], set()
    for gab in gabarits:
        g = construire(gab, wb, deja_vus)
        deja_vus.update(m["reponse"] for m in g["mots"])
        if len(deja_vus) > 260:
            deja_vus = set(list(deja_vus)[-160:])
        vedettes = [m["reponse"] for m in g["mots"] if m["theme"] != "vie"][:4]
        print(f"  ok {g['id']:>9}  {g['cols']}x{g['rows']}  {len(g['mots']):2d} mots  "
              f"niv.{g['niveau']}  -> {', '.join(vedettes)}")
        grilles.append(g)
    dest = os.path.join(ROOT, "src/data/grids.json")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "w", encoding="utf-8") as f:
        json.dump({"_genere_par": "tools/build_grids.py -- editez content/, pas ce fichier",
                   "grilles": grilles}, f, ensure_ascii=False, indent=1)
    print(f"\n  {len(grilles)} grilles, {sum(len(g['mots']) for g in grilles)} mots "
          f"-> src/data/grids.json")


if __name__ == "__main__":
    main()
