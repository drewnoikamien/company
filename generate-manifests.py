#!/usr/bin/env python3
"""
Generator manifestów zdjęć dla strony "Drewno i kamień".

Tworzy pliki manifest.json w folderach:
  - gallery/projects  (zdjęcia galerii, np. P00001.JPG ...)
  - gallery/main       (zdjęcia przewijane na górze strony, np. M00001.JPG ...)
  - videos             (filmy z realizacji, np. V00001.MP4 ...)

Dzięki manifestom strona nie musi "zgadywać" nazw plików ani wysyłać
setek zapytań do serwera - od razu wie, które zdjęcia załadować.

JAK UŻYWAĆ:
  1. Wgraj/zmień zdjęcia w folderach gallery/projects i gallery/main.
  2. Uruchom w terminalu, będąc w katalogu strony:
         python3 generate-manifests.py
  3. Wgraj zmienione pliki manifest.json do repozytorium (git add / commit / push).

Manifest to zwykła lista nazw plików posortowana rosnąco, np.:
  ["P00001.JPG", "P00002.JPG", "P00004.JPG"]
"""

import json
import os

# Rozszerzenia uznawane za obrazy (wielkość liter bez znaczenia)
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}

# Rozszerzenia uznawane za filmy
VIDEO_EXTS = {".mp4", ".webm", ".mov", ".ogg"}

# Foldery do zeskanowania (względem położenia tego skryptu)
# Dla każdego podajemy, jakie typy plików w nim uwzględnić.
FOLDERS = [
    ("gallery/projects", IMAGE_EXTS),
    ("gallery/main", IMAGE_EXTS),
    ("videos", VIDEO_EXTS),
]


def build_manifest(folder_path, allowed_exts):
    """Zwraca posortowaną listę nazw plików danego typu w folderze."""
    names = []
    for entry in os.listdir(folder_path):
        full = os.path.join(folder_path, entry)
        if not os.path.isfile(full):
            continue
        ext = os.path.splitext(entry)[1].lower()
        if ext in allowed_exts and entry.lower() != "manifest.json":
            names.append(entry)
    # Sortowanie naturalne po nazwie (P00001, P00002, ...)
    names.sort()
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
