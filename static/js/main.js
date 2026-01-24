// Point d'entree principal, initialisation globale
import { initMap } from './map.js';
import { loadCountryData } from './countries.js';
import { loadTimeline } from './timeline.js';
import { loadActiveCountries } from './countries.js';
import { store } from './store.js';

// Sequence d'initialisation cote client.
export async function init() {
    initMap();
    await loadCountryData();
    await loadTimeline();
    await loadActiveCountries(store.currentGlobalDate);
}

// Lance l'init au chargement complet de la page.
window.addEventListener("load", init);
