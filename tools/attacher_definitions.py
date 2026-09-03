#!/usr/bin/env python3
"""
Rattache aux grilles deja generees les definitions de content/wordbank.json
et les metadonnees de parcours de content/templates.json (cahier, rang,
objectif).

Les grilles ne dependent pas des definitions: on peut donc en ecrire de
nouvelles et les rattacher sans relancer la generation, qui prend une
demi-heure. Le script ne touche qu aux champs definition, theme et n; la
disposition et les reponses restent identiques au bit pres.

Lancer:  python3 tools/attacher_definitions.py
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def charger(nom):
    with open(os.path.join(ROOT, nom), encoding="utf-8") as f:
        return json.load(f)


def main():
    banque = {m["m"]: m for m in charger("content/wordbank.json")["mots"]}
    gabarits = {g["id"]: g for g in charger("content/templates.json")["grilles"]}
    donnees = charger("src/data/grids.json")
    avant = [g["solution"] for g in donnees["grilles"]]

    manquants = {}
    for g in donnees["grilles"]:
        gab = gabarits.get(g["id"], {})
        for champ in ("cahier", "rang", "objectif"):
            if champ in gab:
                g[champ] = gab[champ]
        for m in g["mots"]:
            entree = banque.get(m["reponse"])
            if entree:
                m["definition"], m["theme"], m["n"] = entree["d"], entree["t"], entree["n"]
            else:
                m["definition"], m["theme"], m["n"] = "", "?", 2
                manquants[m["reponse"]] = g.get("theme", "?")

    assert [g["solution"] for g in donnees["grilles"]] == avant, "les grilles ont bouge"

    with open(os.path.join(ROOT, "src/data/grids.json"), "w", encoding="utf-8") as f:
        json.dump(donnees, f, ensure_ascii=False, indent=1)
    with open(os.path.join(ROOT, "content/a-definir.json"), "w", encoding="utf-8") as f:
        json.dump({"_lisezmoi": "Mots utilises par les grilles qui n ont pas encore de "
                                "definition. Ajoutez-les a content/wordbank.json puis "
                                "relancez python3 tools/attacher_definitions.py",
                   "mots": [{"m": k, "theme": v} for k, v in sorted(manquants.items())]},
                  f, ensure_ascii=False, indent=1)
    total = sum(len(g["mots"]) for g in donnees["grilles"])
    print(f"  {len(donnees['grilles'])} grilles, {total} mots")
    print(f"  {len(manquants)} sans definition" if manquants else "  toutes definies")


if __name__ == "__main__":
    main()
