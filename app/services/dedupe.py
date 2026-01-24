# Deduplication des messages collecte.
from typing import List, Dict

def dedupe_messages(messages: List[Dict]) -> List[Dict]:
    """
    Déduplication très simple :
    - si on a un title : clé = (source, channel, country, title)
    - sinon : clé = (source, channel, translated_text / raw_text)
    On garde le premier, on jette les suivants.
    """
    # Ensemble de cles deja vues.
    seen = set()
    result: List[Dict] = []

    for msg in messages:
        # Champs utilises pour construire la cle de deduplication.
        source = msg.get("source")
        channel = msg.get("channel")
        country = msg.get("country") or ""

        title = (msg.get("title") or "").strip()
        text = (msg.get("translated_text") or msg.get("raw_text") or msg.get("text") or "").strip()

        # Cle basee sur le titre si disponible, sinon sur le texte.
        if title:
            key = ("title", source, channel, country, title)
        else:
            key = ("text", source, channel, country, text)

        # Ignore les doublons.
        if key in seen:
            continue
        seen.add(key)
        result.append(msg)

    return result
