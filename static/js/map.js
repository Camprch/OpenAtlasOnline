// Gestion de la carte Leaflet et des marqueurs

// Carte Leaflet et index des marqueurs par pays.
export let map;
export let markersByCountry = {};
export let flagMarkersByCountry = {};

// Detecte l'affichage mobile.
const IS_MOBILE = window.matchMedia("(max-width: 768px)").matches;

// Initialise la carte et la couche de tuiles.
export function initMap() {
    map = L.map("map", {
        worldCopyJump: true,
        minZoom: 2,
        maxZoom: 8,
        tapTolerance: 30,
    }).setView([20, 0], IS_MOBILE ? 2 : 3);

    L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
            attribution: "&copy; CARTO",
            noWrap: true,
        }
    ).addTo(map);
}

// Supprime tous les marqueurs de pays.
export function clearMarkers() {
    Object.values(markersByCountry).forEach((m) => map.removeLayer(m));
    Object.values(flagMarkersByCountry).forEach((fm) => map.removeLayer(fm));
    markersByCountry = {};
    flagMarkersByCountry = {};
}

// Calcule la taille/couleur d'un marqueur selon le volume d'evenements.
export function markerStyle(count) {
    const n = Math.max(1, count || 1);
    const minRadius = IS_MOBILE ? 8 : 7;
    const maxRadius = IS_MOBILE ? 13 : 12;
    const maxCount = 30;
    const ratio = Math.min(n / maxCount, 1);
    const radius = minRadius + (maxRadius - minRadius) * ratio;
    let color;
    if (n < 5) {
        color = "#22c55e";
    } else if (n < 15) {
        color = "#eab308";
    } else {
        color = "#f97316";
    }
    return {
        radius,
        color,
        fillColor: color,
        fillOpacity: 0.85,
        weight: IS_MOBILE ? 2 : 1,
    };
}

export { IS_MOBILE };
