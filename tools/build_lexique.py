#!/usr/bin/env python3
"""
Construit content/lexique.json : les mots francais courants, avec leur
frequence.

Le paquet npm an-array-of-french-words fournit 336 000 formes, dont
l immense majorite est injouable (AGUEUSIE, OSASSENT, SMILLAIS...).
wordfreq donne la frequence d usage reelle sur une echelle Zipf, ou 6 est
un mot de tous les jours et 2 un mot que personne n emploie. On ne garde
que le haut du panier, et on conserve le score: c est lui qui sert ensuite
d echelle de difficulte dans le jeu.

Prerequis: npm install (pour le paquet de mots), pip install wordfreq
Lancer   : python3 tools/build_lexique.py
"""
import json, os, subprocess, unicodedata
from wordfreq import zipf_frequency

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEUIL = 2.8
LONGUEURS = range(2, 11)


def sans_accent(mot):
    return "".join(c for c in unicodedata.normalize("NFD", mot)
                   if unicodedata.category(c) != "Mn").upper()


def main():
    brut = subprocess.run(
        ["node", "-e", "process.stdout.write(require('an-array-of-french-words').join('\\n'))"],
        cwd=ROOT, capture_output=True, text=True, check=True).stdout.split()
    print(f"  {len(brut)} formes brutes")

    meilleur = {}
    for mot in brut:
        if len(mot) not in LONGUEURS:
            continue
        forme = sans_accent(mot)
        # les mots fleches s ecrivent sans accent ni trait d union
        if not (forme.isalpha() and forme.isascii()):
            continue
        z = zipf_frequency(mot, "fr")
        if z > meilleur.get(forme, -1):
            meilleur[forme] = round(z, 2)

    garde = {m: z for m, z in meilleur.items() if z >= SEUIL}
    dest = os.path.join(ROOT, "content/lexique.json")
    with open(dest, "w", encoding="utf-8") as f:
        json.dump({"_lisezmoi": f"Mots francais de frequence Zipf >= {SEUIL}, sans accent. "
                                "6 = mot de tous les jours, 3 = mot connu mais peu employe. "
                                "Regenerer avec python3 tools/build_lexique.py",
                   "seuil": SEUIL, "mots": dict(sorted(garde.items()))}, f, ensure_ascii=False)
    print(f"  {len(garde)} mots retenus -> content/lexique.json")


if __name__ == "__main__":
    main()
