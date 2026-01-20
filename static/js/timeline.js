// timeline.js
// Gestion de la timeline et des sélecteurs de dates


import { loadActiveCountries } from './countries.js';
import { loadEvents } from './events.js';
import { store } from './store.js';

export let timelineDates = [];

export async function loadTimeline() {
    const resp = await fetch("/static/data/generated/dates.json");
    const data = await resp.json();
    timelineDates = data.dates || [];
    const selectGlobal = document.getElementById("timeline-global");
    const selectPanel = document.getElementById("timeline-panel");
    function fillSelect(select, value) {
        select.innerHTML = "";
        const allOpt = document.createElement("option");
        allOpt.value = "ALL";
        allOpt.textContent = "Toutes les dates";
        select.appendChild(allOpt);
        timelineDates.forEach((dateStr) => {
            const opt = document.createElement("option");
            opt.value = dateStr;
            opt.textContent = dateStr;
            select.appendChild(opt);
        });
        select.value = value || "ALL";
    }
    store.currentGlobalDate = "ALL";
    store.currentPanelDate = "ALL";
    if (selectGlobal) fillSelect(selectGlobal, store.currentGlobalDate);
    if (selectPanel) fillSelect(selectPanel, store.currentPanelDate);
    if (selectGlobal && selectPanel) {
        selectGlobal.addEventListener("change", () => {
            store.currentGlobalDate = selectGlobal.value;
            store.currentPanelDate = store.currentGlobalDate;
            selectPanel.value = store.currentPanelDate;
            loadActiveCountries(store.currentGlobalDate);
            if (store.currentCountry) {
                loadEvents(store.currentCountry);
            }
        });
        selectPanel.addEventListener("change", () => {
            store.currentPanelDate = selectPanel.value;
            store.currentGlobalDate = store.currentPanelDate;
            selectGlobal.value = store.currentGlobalDate;
            loadActiveCountries(store.currentGlobalDate);
            if (store.currentCountry) {
                loadEvents(store.currentCountry);
            }
        });
    }
}
