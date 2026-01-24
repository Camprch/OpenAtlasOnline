# Modele SQLModel pour stocker un message traite. 
from datetime import datetime
from sqlmodel import SQLModel, Field
from sqlalchemy import Index

class Message(SQLModel, table=True):
    # Cle primaire auto-incrementee.
    id: int | None = Field(default=None, primary_key=True)

    # Identifiants et provenance Telegram.
    telegram_message_id: int | None = Field(default=None, index=True)
    source: str = Field(index=True)
    channel: str | None = Field(default=None, index=True)

    # Texte brut et traduction eventuelle.
    raw_text: str
    translated_text: str | None = None

    # Informations de geolocalisation extraites.
    country: str | None = Field(default=None, index=True)
    region: str | None = Field(default=None, index=True)
    location: str | None = Field(default=None, index=True)

    # Metadonnees d'affichage / evenement.
    title: str | None = Field(default=None)
    event_timestamp: datetime | None = Field(default=None, index=True)

    # Orientation / classification optionnelle.
    orientation: str | None = Field(default=None, index=True)

    # Date d'insertion en base.
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    # Index composite pour requetes frequentes.
    __table_args__ = (
        Index("ix_message_country_created", "country", "created_at"),
    )
