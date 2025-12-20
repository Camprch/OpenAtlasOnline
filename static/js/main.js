// main.js
// Point d'entrée principal, initialisation globale

import { initMap } from './map.js';
import { loadCountryData } from './countries.js';
import { loadTimeline } from './timeline.js';
import { loadActiveCountries } from './countries.js';
import { store } from './store.js';

export async function init() {
    initMap();
    await loadCountryData();
    await loadTimeline();
    await loadActiveCountries(store.currentGlobalDate);
}

window.addEventListener("load", init);
