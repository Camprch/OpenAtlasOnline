// events.js
// Rendu et chargement des événements, gestion du panneau latéral

import { IS_MOBILE } from './map.js';
import { store } from './store.js';

export function renderEvents(data) {
    const eventsContainer = document.getElementById("events");
    if (!data || !data.zones || data.zones.length === 0) {
        eventsContainer.textContent = "Aucun événement.";
        return;
    }
    const html = data.zones
        .map((zone, idx) => {
            const header =
                [zone.region, zone.location].filter(Boolean).join(" – ") ||
                "Zone inconnue";
            const msgs = zone.messages
                .map((m, mIdx) => {
                    const title = m.title || "(Sans titre)";
                    const fullText = m.translated_text || m.preview || "";
                    const orientation = m.orientation ? ` • ${m.orientation}` : "";
                    const postLink = m.url ? `<a href="${m.url}" target="_blank">post n° ${m.telegram_message_id}</a>` : "";
                    const timeStr = new Date(m.event_timestamp || m.created_at).toLocaleString();
                    return `
            <li class="event">
                <div class="evt-title" data-zone="${idx}" data-msg="${mIdx}" style="cursor:pointer;">${title}</div>
                <div class="evt-text" style="display:none;">
                    ${fullText}
                    <div class="evt-meta">
                        <span class="evt-source">${m.source}${orientation}</span>
                        <span class="evt-time">${timeStr}</span>
                        <span class="evt-link">${postLink}</span>
                    </div>
                </div>
            </li>
        `;
                })
                .join("");
            return `
            <section class="zone-block">
                <h4 class="zone-header" data-idx="${idx}">
                    <span class="toggle-btn">▶</span> ${header}
                    <span class="evt-count">(${zone.messages_count})</span>
                </h4>
                <ul class="event-list" id="zone-list-${idx}" style="display:none;">
                    ${msgs}
                </ul>
            </section>
        `;
        })
        .join("");
    eventsContainer.innerHTML = html;
    data.zones.forEach((zone, idx) => {
        const headerEl = document.querySelector(
            `.zone-header[data-idx='${idx}']`
        );
        const listEl = document.getElementById(`zone-list-${idx}`);
        const btn = headerEl.querySelector(".toggle-btn");

        headerEl.addEventListener("click", () => {
            if (listEl.style.display === "none") {
                listEl.style.display = "";
                btn.textContent = "▼";
                listEl.querySelectorAll('.evt-title').forEach(titleEl => {
                    if (!titleEl.dataset.listener) {
                        titleEl.addEventListener('click', function(e) {
                            e.stopPropagation();
                            const text = this.nextElementSibling;
                            if (text.style.display === "none" || !text.style.display) {
                                text.style.display = "block";
                            } else {
                                text.style.display = "none";
                            }
                        });
                        titleEl.dataset.listener = "1";
                    }
                });
            } else {
                listEl.style.display = "none";
                btn.textContent = "▶";
            }
        });
    });
}


export async function openSidePanel(normCountry) {
    store.currentCountry = normCountry;
    document.getElementById("panel-country-text").textContent = normCountry;
    const selectPanel = document.getElementById("timeline-panel");
    if (selectPanel && store.currentGlobalDate) {
        selectPanel.value = store.currentGlobalDate;
        store.currentPanelDate = store.currentGlobalDate;
    }
    const panel = document.getElementById("sidepanel");
    panel.classList.add("visible");
    if (IS_MOBILE) {
        document.body.classList.add("no-scroll");
    }
    await loadEvents(normCountry);
}


document.getElementById("close-panel").addEventListener("click", () => {
    document.getElementById("sidepanel").classList.remove("visible");
    if (IS_MOBILE) {
        document.body.classList.remove("no-scroll");
    }
});
document.getElementById("sidepanel-backdrop").addEventListener("click", () => {
    if (!IS_MOBILE) {
        document.getElementById("sidepanel").classList.remove("visible");
    }
});

export async function loadLatestEvents(country) {
    const eventsContainer = document.getElementById("events");
    eventsContainer.innerHTML = "Chargement...";
    const resp = await fetch(
        `/static/data/generated/events/ALL/${encodeURIComponent(country)}.json`
    );
    if (!resp.ok) {
        eventsContainer.textContent = "Aucun événement pour ce pays.";
        return;
    }
    const data = await resp.json();
    store.currentPanelDate = data.date;
    const select = document.getElementById("timeline-panel");
    if (select && store.currentPanelDate) {
        let found = false;
        Array.from(select.options).forEach((opt) => {
            if (opt.value === store.currentPanelDate) {
                found = true;
            }
        });
        if (!found) {
            const opt = new Option(store.currentPanelDate, store.currentPanelDate);
            select.add(opt, 1);
        }
        select.value = store.currentPanelDate;
    }
    renderEvents(data);
}

export async function loadEvents(country) {
    const eventsContainer = document.getElementById("events");
    if (!store.currentPanelDate) {
        eventsContainer.textContent = "Aucune date sélectionnée.";
        return;
    }
    eventsContainer.innerHTML = "Chargement...";
    let url, resp, data;
    if (store.currentPanelDate === "ALL") {
        url = `/static/data/generated/events/ALL/${encodeURIComponent(country)}.json`;
        resp = await fetch(url);
    } else {
        url = `/static/data/generated/events/${store.currentPanelDate}/${encodeURIComponent(country)}.json`;
        resp = await fetch(url);
    }
    if (!resp.ok) {
        if (resp.status === 404) {
            eventsContainer.textContent = "Aucun événement pour cette date.";
        } else {
            eventsContainer.textContent = "Erreur de chargement.";
        }
        return;
    }
    data = await resp.json();
    renderEvents(data);
}
