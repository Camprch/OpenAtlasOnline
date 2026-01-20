from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, date
import json
from pathlib import Path
import shutil
import sys
from typing import Iterable, Optional

from dotenv import load_dotenv

from sqlmodel import select

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

load_dotenv()

from app.database import get_session, init_db  # noqa: E402
from app.models.message import Message  # noqa: E402
from app.api.utils import normalize_country_names, COUNTRY_ALIASES, COUNTRY_COORDS  # noqa: E402


SITE_DIR = ROOT_DIR / "site"
STATIC_DIR = ROOT_DIR / "static"
TEMPLATES_DIR = ROOT_DIR / "templates"
GENERATED_DIR = SITE_DIR / "static" / "data" / "generated"


@dataclass
class MessageView:
    id: int
    telegram_message_id: Optional[int]
    channel: Optional[str]
    title: Optional[str]
    source: Optional[str]
    orientation: Optional[str]
    event_timestamp: Optional[datetime]
    created_at: datetime
    url: Optional[str]
    translated_text: str
    preview: str
    region: Optional[str]
    location: Optional[str]
    country: Optional[str]


def _safe_iso(dt: Optional[datetime]) -> Optional[str]:
    if not dt:
        return None
    try:
        return dt.isoformat()
    except Exception:
        return str(dt)


def _serialize_message(m: Message) -> MessageView:
    url = None
    if m.channel and m.telegram_message_id:
        url = f"https://t.me/{m.channel}/{m.telegram_message_id}"

    full_text = (m.translated_text or m.raw_text or "").strip()
    preview = full_text[:277] + "..." if len(full_text) > 280 else full_text

    return MessageView(
        id=m.id,
        telegram_message_id=m.telegram_message_id,
        channel=m.channel,
        title=m.title,
        source=m.source,
        orientation=m.orientation,
        event_timestamp=m.event_timestamp,
        created_at=m.created_at,
        url=url,
        translated_text=full_text,
        preview=preview,
        region=m.region,
        location=m.location,
        country=m.country,
    )


def _dump_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))


def _normalize_display_name(val: Optional[str]) -> str:
    if val is None:
        return ""
    s = str(val).strip().lower()
    if not s:
        return ""
    import unicodedata
    import re

    s = "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")
    s = re.sub(r"\s+", " ", s)
    return s


def _build_zones_all(messages: Iterable[Message]) -> list[dict]:
    def display_name(msg: Message) -> str:
        if msg.region and msg.region.strip():
            return msg.region.strip()
        if msg.location and msg.location.strip():
            return msg.location.strip()
        return "Zone inconnue"

    buckets: dict[str, list[Message]] = defaultdict(list)
    for m in messages:
        key = _normalize_display_name(display_name(m))
        buckets[key].append(m)

    zones = []
    for _, items in buckets.items():
        name = display_name(items[0])
        event_messages = [_serialize_message(m) for m in items]
        zones.append(
            {
                "region": name,
                "location": None,
                "messages_count": len(items),
                "messages": [
                    {
                        **ev.__dict__,
                        "event_timestamp": _safe_iso(ev.event_timestamp),
                        "created_at": _safe_iso(ev.created_at),
                    }
                    for ev in event_messages
                ],
            }
        )
    zones.sort(key=lambda z: z["messages_count"], reverse=True)
    return zones


def _build_zones_by_region_location(messages: Iterable[Message]) -> list[dict]:
    buckets: dict[tuple[str, str], list[Message]] = defaultdict(list)
    for m in messages:
        key = (_normalize_display_name(m.region), _normalize_display_name(m.location))
        buckets[key].append(m)

    zones = []
    for _, items in buckets.items():
        region = next((m.region for m in items if m.region), None)
        location = next((m.location for m in items if m.location), None)
        event_messages = [_serialize_message(m) for m in items]
        zones.append(
            {
                "region": region,
                "location": location,
                "messages_count": len(items),
                "messages": [
                    {
                        **ev.__dict__,
                        "event_timestamp": _safe_iso(ev.event_timestamp),
                        "created_at": _safe_iso(ev.created_at),
                    }
                    for ev in event_messages
                ],
            }
        )
    zones.sort(key=lambda z: z["messages_count"], reverse=True)
    return zones


def _build_active_countries(messages: Iterable[Message]) -> dict:
    stats: dict[str, dict[str, object]] = {}
    ignored_countries = set()
    for m in messages:
        if not m.country:
            continue
        country = m.country.strip()
        if not country:
            continue
        norm_countries = normalize_country_names(country, COUNTRY_ALIASES)
        if not norm_countries:
            ignored_countries.add(country)
            continue
        d = m.created_at.date()
        for norm_country in norm_countries:
            if norm_country not in stats:
                stats[norm_country] = {"count": 0, "last_date": d}
            stats[norm_country]["count"] += 1
            if d > stats[norm_country]["last_date"]:
                stats[norm_country]["last_date"] = d

    result = [
        {
            "country": c,
            "events_count": v["count"],
            "last_date": v["last_date"].isoformat(),
        }
        for c, v in stats.items()
        if c in COUNTRY_COORDS
    ]
    result.sort(key=lambda c: c["events_count"], reverse=True)
    return {"countries": result, "ignored_countries": sorted(ignored_countries)}


def _encode_country_filename(country: str) -> str:
    # Keep UTF-8 filenames so web servers can resolve decoded URLs.
    return f"{country.replace('/', '-')}.json"


def build_site() -> None:
    if SITE_DIR.exists():
        shutil.rmtree(SITE_DIR)
    SITE_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copytree(STATIC_DIR, SITE_DIR / "static")
    shutil.copy(TEMPLATES_DIR / "dashboard.html", SITE_DIR / "index.html")

    init_db()
    with get_session() as session:
        messages = session.exec(select(Message)).all()

    messages = [m for m in messages if m.created_at]
    if not messages:
        GENERATED_DIR.mkdir(parents=True, exist_ok=True)
        _dump_json(GENERATED_DIR / "dates.json", {"dates": []})
        _dump_json(GENERATED_DIR / "active" / "ALL.json", {"countries": [], "ignored_countries": []})
        return

    # Timeline dates (latest 10 based on created_at)
    date_list = sorted({m.created_at.date() for m in messages}, reverse=True)
    dates = [d.isoformat() for d in date_list[:10]]
    _dump_json(GENERATED_DIR / "dates.json", {"dates": dates})

    # Active countries (ALL = last 30 days from max created_at)
    max_created = max(m.created_at for m in messages)
    cutoff = max_created - timedelta(days=30)
    active_all_msgs = [m for m in messages if m.created_at >= cutoff]
    _dump_json(GENERATED_DIR / "active" / "ALL.json", _build_active_countries(active_all_msgs))

    # Active countries per date in timeline
    messages_by_date: dict[date, list[Message]] = defaultdict(list)
    for m in messages:
        messages_by_date[m.created_at.date()].append(m)

    for d in date_list[:10]:
        day_msgs = messages_by_date.get(d, [])
        _dump_json(GENERATED_DIR / "active" / f"{d.isoformat()}.json", _build_active_countries(day_msgs))

    # Precompute normalized countries per message
    msg_norm_countries: dict[int, list[str]] = {}
    for m in messages:
        if not m.country:
            continue
        norm = normalize_country_names(m.country, COUNTRY_ALIASES)
        if norm:
            msg_norm_countries[m.id] = norm

    # Messages per country (ALL)
    messages_by_country: dict[str, list[Message]] = defaultdict(list)
    for m in messages:
        norm_countries = msg_norm_countries.get(m.id, [])
        for nc in norm_countries:
            if nc in COUNTRY_COORDS:
                messages_by_country[nc].append(m)

    for country, msgs in messages_by_country.items():
        zones = _build_zones_all(msgs)
        payload = {
            "date": max(m.created_at for m in msgs).date().isoformat(),
            "country": country,
            "zones": zones,
        }
        out = GENERATED_DIR / "events" / "ALL" / _encode_country_filename(country)
        _dump_json(out, payload)

    # Messages per country per date
    for d in date_list[:10]:
        day_msgs = messages_by_date.get(d, [])
        msgs_by_country_day: dict[str, list[Message]] = defaultdict(list)
        for m in day_msgs:
            norm_countries = msg_norm_countries.get(m.id, [])
            for nc in norm_countries:
                if nc in COUNTRY_COORDS:
                    msgs_by_country_day[nc].append(m)
        for country, msgs in msgs_by_country_day.items():
            zones = _build_zones_by_region_location(msgs)
            payload = {
                "date": d.isoformat(),
                "country": country,
                "zones": zones,
            }
            out = GENERATED_DIR / "events" / d.isoformat() / _encode_country_filename(country)
            _dump_json(out, payload)


if __name__ == "__main__":
    build_site()
