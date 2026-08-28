#!/usr/bin/env python3
"""
Generator manifestów zdjęć i filmów dla strony "Drewno i kamień".

Tworzy pliki manifest.json w folderach:
  - gallery/house          (sekcja "Domy")
  - gallery/swimming_pool  (sekcja "Baseny")
  - gallery/others         (sekcja "Zadaszenia i tarasy")
  - gallery/main           (zdjęcia przewijane na górze strony)
  - videos                 (sekcja "Video")

Dzięki manifestom strona od razu wie, które pliki załadować - nie musi
"zgadywać" nazw ani wysyłać setek zapytań do serwera.

JAK UŻYWAĆ:
  1. Wgraj/zmień zdjęcia lub filmy w odpowiednich folderach.
  2. Uruchom w terminalu, będąc w katalogu strony:
         python3 generate-manifests.py
  3. Wgraj zmienione pliki manifest.json do repozytorium (git add / commit / push).

Uwaga: w folderach ze zdjęciami pliki filmowe (.mp4 itp.) są pomijane,
a w folderze videos pomijane są zdjęcia. Sortowanie jest "naturalne",
czyli 2.jpg wypada przed 10.jpg.
"""

import json
import os
import re

# Rozszerzenia uznawane za obrazy (wielkość liter bez znaczenia)
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}

# Rozszerzenia uznawane za filmy
VIDEO_EXTS = {".mp4", ".webm", ".mov", ".ogg"}

# Foldery do zeskanowania (względem położenia tego skryptu)
# Dla każdego podajemy, jakie typy plików w nim uwzględnić.
FOLDERS = [
    ("gallery/house", IMAGE_EXTS),
    ("gallery/swimming_pool", IMAGE_EXTS),
    ("gallery/others", IMAGE_EXTS),
    ("gallery/main", IMAGE_EXTS),
    ("videos", VIDEO_EXTS),
]


def natural_key(name):
    """Klucz sortowania naturalnego: '2.jpg' < '10.jpg'."""
    parts = re.split(r'(\d+)', name)
    return [int(p) if p.isdigit() else p.lower() for p in parts]


def build_manifest(folder_path, allowed_exts):
    """Zwraca naturalnie posortowaną listę nazw plików danego typu w folderze."""
    names = []
    for entry in os.listdir(folder_path):
        full = os.path.join(folder_path, entry)
        if not os.path.isfile(full):
            continue
        ext = os.path.splitext(entry)[1].lower()
        if ext in allowed_exts and entry.lower() != "manifest.json":
            names.append(entry)
    names.sort(key=natural_key)
    return names


def main():
    base = os.path.dirname(os.path.abspath(__file__))
    for rel, allowed_exts in FOLDERS:
        folder_path = os.path.join(base, rel)
        if not os.path.isdir(folder_path):
            print(f"[pomijam] Brak folderu: {rel}")
            continue
        names = build_manifest(folder_path, allowed_exts)
        manifest_path = os.path.join(folder_path, "manifest.json")
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(names, f, ensure_ascii=False, indent=0)
        print(f"[ok] {rel}/manifest.json - zapisano {len(names)} plików")


if __name__ == "__main__":
    main()
