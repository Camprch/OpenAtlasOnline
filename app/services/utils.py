# Normalisation des noms des pays pour georeferencement.
import os
import json
from typing import Dict

def normalize_country_names(name: str, aliases: dict) -> list:
    # Retourne une liste vide si l'entree est vide.
    if not name:
        return []
    # Normalise les noms separes par des virgules.
    names = [n.strip().lower() for n in name.split(',') if n.strip()]
    result = []
    for n in names:
        # Remplace par l'alias canonique si disponible.
        norm = aliases.get(n, None)
        if norm:
            result.append(norm)
    return result

# Chemin vers le fichier d'alias/coordonnees.
COUNTRIES_JSON_PATH = os.path.join(os.path.dirname(__file__), '../../static/data/countries.json')
# Chargement du fichier d'alias a l'import.
with open(COUNTRIES_JSON_PATH, encoding='utf-8') as f:
    _countries_data = json.load(f)
    # Dictionnaire d'alias de pays.
    COUNTRY_ALIASES = _countries_data.get('aliases', {})
    # Coordonnees associees aux pays.
    COUNTRY_COORDS = _countries_data.get('coordinates', {})
