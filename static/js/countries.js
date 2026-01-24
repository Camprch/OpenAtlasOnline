// Gestion des données pays et des pastilles
import { map, markersByCountry, flagMarkersByCountry, clearMarkers, markerStyle, IS_MOBILE } from './map.js';
import { openSidePanel } from './events.js';
import { store } from './store.js';

// Coordonnees et alias charges depuis countries.json.
export let countryCoords = {};
export let countryAliases = {};

// Charge les coordonnees et alias des pays.
export async function loadCountryData() {
    const resp = await fetch("/static/data/countries.json");
    const data = await resp.json();
    countryCoords = data.coordinates || {};
    countryAliases = data.aliases || {};
}

// Charge les pays actifs et affiche les pastilles.
export async function loadActiveCountries(currentGlobalDate = store.currentGlobalDate) {
    console.log("[DEBUG] Clés countryCoords:", Object.keys(countryCoords));
    console.log("[DEBUG] Aliases:", countryAliases);
    let url = "/static/data/generated/active/ALL.json";
    if (currentGlobalDate && currentGlobalDate !== "ALL") {
        url = `/static/data/generated/active/${encodeURIComponent(currentGlobalDate)}.json`;
    }
    const resp = await fetch(url);
    if (!resp.ok) {
        console.error("Erreur /api/countries/active", resp.status);
        return;
    }
    const apiData = await resp.json();
    const countries = apiData.countries || [];
    const ignored = apiData.ignored_countries || [];
    console.log("[DEBUG] Pays reçus de l'API:", countries.map(c => c.country));
    clearMarkers();
    const missing = [];
    const alert = document.getElementById("dashboard-alert");
    // Ajuste la tolerance de click selon le zoom.
    const getTolerance = () => {
        const zoom = map.getZoom();
        if (zoom >= 5) return 2000;
        if (zoom >= 4) return 6000;
        if (zoom >= 3) return 15000;
        return 30000;
    };
    countries.forEach((c) => {
        let normName = c.country;
        const count = c.events_count;
        let key = normName;
        // Normalise le pays via aliases si besoin.
        if (!(key in countryCoords)) {
            if (countryAliases[normName] && countryCoords[countryAliases[normName]]) {
                key = countryAliases[normName];
            } else {
                missing.push(normName);
                return;
            }
        }
        const [lat, lon] = countryCoords[key];
        if (markersByCountry[key]) {
            return;
        }
        const style = markerStyle(count);
        const clickableRadius = style.radius * 2.5;
        // Cercle invisible pour une zone de clic plus large.
        const interactiveCircle = L.circleMarker([lat, lon], {
            radius: clickableRadius,
            color: 'transparent',
            fillColor: 'transparent',
            fillOpacity: 0,
            weight: 0,
            interactive: true,
            pane: 'markerPane',
        });
        // Affiche la pastille colorée (circleMarker)
        const marker = L.circleMarker([lat, lon], style);
        // Ajoute le drapeau au centre avec un marker HTML transparent superposé
        const flag = key.split(' ')[0];
        const flagMarker = L.marker([lat, lon], {
            icon: L.divIcon({
                className: 'country-flag-marker',
                html: `<div style="display:flex;align-items:center;justify-content:center;width:${style.radius*2}px;height:${style.radius*2}px;font-size:${style.radius*1.2}px;pointer-events:none;">${flag}</div>`,
                iconSize: [style.radius*2, style.radius*2],
                iconAnchor: [style.radius, style.radius],
            }),
            interactive: false,
            pane: 'markerPane',
        });
        if (!IS_MOBILE) {
            const countryName = key.substring(flag.length + 1);
            marker.bindPopup(`
                <div style="font-size:2em; line-height:1; margin-bottom:2px;">${flag}</div>
                <b>${countryName}</b>
            `);
        }
        // Effets hover et clic vers le panneau lateral.
        interactiveCircle.on("mouseover", function (e) {
            marker.setStyle({ radius: style.radius * 1.15 });
            if (!IS_MOBILE) {
                marker.openPopup && marker.openPopup();
            }
        });
        interactiveCircle.on("mouseout", function (e) {
            marker.setStyle({ radius: style.radius });
            if (!IS_MOBILE) {
                marker.closePopup && marker.closePopup();
            }
        });
        interactiveCircle.on("click", () => openSidePanel(key));
        interactiveCircle.addTo(map);
        marker.addTo(map);
        flagMarker.addTo(map);
        markersByCountry[key] = marker;
        flagMarkersByCountry[key] = flagMarker;
    });
    // Affiche un message si des pays sont manquants/ignores.
    if (alert) {
        let alertMsg = "";
        if (missing.length > 0) {
            alertMsg += `⚠️ Pays non géolocalisés : ${missing.join(", ")}`;
        }
        if (ignored.length > 0) {
            if (alertMsg) alertMsg += " | ";
            alertMsg += `⚠️ Pays non reconnus côté backend : ${ignored.join(", ")}`;
        }
        if (alertMsg) {
            alert.textContent = alertMsg;
            alert.style.display = "block";
        } else {
            alert.style.display = "none";
        }
    }
}
