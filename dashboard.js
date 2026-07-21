const { hotels: baseHotels, transportRates: baseTransportRates, transportVehicles, exchangeRate, defaultProfitSar } = window.portalData;

const demoUser = { email: "admin@toursinpakistan.com", password: "admin123" };
const statuses = ["New", "Contacted", "Quoted", "Booked", "Cancelled"];

const hotelImages = {
  "Makkah-Standard": "https://tour-designer.lovable.app/assets/makkah-standard-B4tA1pgB.jpg",
  "Makkah-Deluxe": "https://tour-designer.lovable.app/assets/makkah-deluxe-orNj5W32.jpg",
  "Makkah-Executive": "https://tour-designer.lovable.app/assets/makkah-executive-DKEjOIdI.jpg",
  "Madinah-Standard": "https://tour-designer.lovable.app/assets/madinah-standard-BywP17cg.jpg",
  "Madinah-Deluxe": "https://tour-designer.lovable.app/assets/madinah-deluxe-BNVFZdme.jpg",
  "Madinah-Executive": "https://tour-designer.lovable.app/assets/madinah-executive-D1rwdrR7.jpg"
};

const vehicleDefaults = {
  Car: {
    id: "Car",
    name: "Car",
    capacity: "4 pax",
    type: "Sedan",
    note: "Private car for small families",
    photo: "https://loremflickr.com/640/360/toyota,camry,sedan/all"
  },
  Staria: {
    id: "Staria",
    name: "Staria",
    capacity: "7 pax",
    type: "Van",
    note: "Hyundai Staria style family van",
    photo: "https://loremflickr.com/640/360/hyundai,staria,van/all"
  },
  GMC: {
    id: "GMC",
    name: "GMC",
    capacity: "6 pax",
    type: "Premium SUV",
    note: "Premium SUV for private transfers",
    photo: "https://loremflickr.com/640/360/gmc,yukon,suv/all"
  },
  Hiace: {
    id: "Hiace",
    name: "Hiace",
    capacity: "12 pax",
    type: "Van",
    note: "Toyota Hiace for medium groups",
    photo: "https://loremflickr.com/640/360/toyota,hiace,van/all"
  },
  Coaster: {
    id: "Coaster",
    name: "Coaster",
    capacity: "20 pax",
    type: "Bus",
    note: "Coaster bus for larger groups",
    photo: "https://loremflickr.com/640/360/toyota,coaster,bus/all"
  }
};

const settingsDefaults = {
  companyName: "Tours in Pakistan",
  whatsappNumber: "+923703049245",
  exchangeRate: String(exchangeRate),
  profitSar: String(defaultProfitSar || 250),
  profitEconomySar: "200",
  profitStandardSar: "250",
  profitExecutiveSar: "300",
  visaPrice: "43000",
  ziyaratSar: "500",
  pdfNote: "Final price may vary based on availability and confirmation."
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
let recordMode = null;
let recordId = null;

function storageGet(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
}

function storageSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function isAuthed() {
  return localStorage.getItem("umrahAdminSession") === "active";
}

function getSettings() {
  return { ...settingsDefaults, ...storageGet("umrahSettings", {}) };
}

function displayCategory(category) {
  if (category === "Deluxe") return "Economy";
  return category || "Standard";
}

function displayText(value) {
  return String(value ?? "").replace(/Madinah/g, "Madina");
}

function getLeads() {
  const leads = storageGet("umrahLeads", []);
  const withoutLegacyDemo = leads.filter((lead) => !["L-1001", "L-1002"].includes(lead.id));
  if (withoutLegacyDemo.length !== leads.length) storageSet("umrahLeads", withoutLegacyDemo);
  return withoutLegacyDemo;
}

function getHotelOverrides() {
  return storageGet("umrahHotelOverrides", {});
}

function getDeletedHotels() {
  return storageGet("umrahDeletedHotels", []);
}

function getHotels() {
  const overrides = getHotelOverrides();
  const deleted = new Set(getDeletedHotels());
  const cleanHotel = (hotel) => {
    const { source, ...clean } = hotel || {};
    return clean;
  };
  const baseRows = baseHotels
    .filter((hotel) => !deleted.has(hotel.id))
    .map((hotel) => cleanHotel({ ...hotel, ...(overrides[hotel.id] || {}) }));
  const baseIds = new Set(baseRows.map((hotel) => hotel.id));
  const customRows = Object.values(overrides)
    .filter((hotel) => hotel?.id && !deleted.has(hotel.id) && !baseIds.has(hotel.id))
    .map(cleanHotel);
  return [...baseRows, ...customRows];
}

function getTransportOverrides() {
  return storageGet("umrahTransportOverrides", {});
}

function getDeletedTransport() {
  return storageGet("umrahDeletedTransport", []);
}

function getTransportRates() {
  const overrides = getTransportOverrides();
  const deleted = new Set(getDeletedTransport());
  const baseRows = baseTransportRates
    .filter((row) => !deleted.has(row.sector))
    .map((row) => ({ ...row, rates: { ...row.rates, ...(overrides[row.sector]?.rates || {}) }, ...(overrides[row.sector] || {}) }));
  const baseSectors = new Set(baseRows.map((row) => row.sector));
  const customRows = Object.values(overrides).filter((row) => row?.sector && !deleted.has(row.sector) && !baseSectors.has(row.sector));
  return [...baseRows, ...customRows];
}

function getVehicleOverrides() {
  return storageGet("umrahVehicleOverrides", {});
}

function getDeletedVehicles() {
  return storageGet("umrahDeletedVehicles", []);
}

function getVehicles() {
  const overrides = getVehicleOverrides();
  const deleted = new Set(getDeletedVehicles());
  const baseRows = transportVehicles
    .filter((id) => !deleted.has(id))
    .map((id) => ({ ...(vehicleDefaults[id] || { id, name: id, capacity: "", type: "", note: "", photo: "" }), ...(overrides[id] || {}) }));
  const baseIds = new Set(baseRows.map((vehicle) => vehicle.id));
  const customRows = Object.values(overrides).filter((vehicle) => vehicle?.id && !deleted.has(vehicle.id) && !baseIds.has(vehicle.id));
  return [...baseRows, ...customRows];
}

function showApp() {
  $("#loginShell").classList.toggle("hidden", isAuthed());
  $("#adminShell").classList.toggle("hidden", !isAuthed());
  if (isAuthed()) renderAll();
}

function hotelImage(hotel) {
  if (hotel.photo) return hotel.photo;
  return searchImageUrl(`${hotel.name} ${hotel.city} hotel exterior`);
}

function searchImageUrl(query) {
  return `https://tse3.mm.bing.net/th?q=${encodeURIComponent(query)}&w=640&h=360&c=7&rs=1&p=0&o=5&pid=1.7`;
}

function parseCustomFields(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split(":");
      return { label: label.trim(), value: rest.join(":").trim() || "Yes" };
    })
    .filter((item) => item.label);
}

function formatCustomFields(fields) {
  return (fields || []).map((item) => `${item.label}: ${item.value}`).join("\n");
}

function ratesForSeason(season) {
  const rates = season.weekday || season.rates || {};
  const weekend = season.weekend || {};
  return { rates, weekend };
}

function seasonEditor(season = {}, index = 0) {
  const { rates, weekend } = ratesForSeason(season);
  return `
    <section class="seasonEditor" data-season-row="${index}">
      <div class="seasonEditorHead">
        <b>Season ${index + 1}</b>
        <button type="button" class="dangerText" data-remove-season="${index}">Delete season</button>
      </div>
      <label>Rate From<input data-season-field="from" type="date" value="${escapeHtml(season.from || "2026-07-20")}" required></label>
      <label>Rate To<input data-season-field="to" type="date" value="${escapeHtml(season.to || "2027-01-10")}" required></label>
      <label>Single SAR<input data-season-field="single" type="number" min="0" value="${rates.Single || rates.Double || 0}"></label>
      <label>Double SAR<input data-season-field="double" type="number" min="0" value="${rates.Double || 0}"></label>
      <label>Triple SAR<input data-season-field="triple" type="number" min="0" value="${rates.Triple || rates.Double || 0}"></label>
      <label>Quad SAR<input data-season-field="quad" type="number" min="0" value="${rates.Quad || rates.Double || 0}"></label>
      <label>Weekend Single SAR<input data-season-field="weekendSingle" type="number" min="0" value="${weekend.Single || ""}" placeholder="Optional"></label>
      <label>Weekend Double SAR<input data-season-field="weekendDouble" type="number" min="0" value="${weekend.Double || ""}" placeholder="Optional"></label>
      <label>Weekend Triple SAR<input data-season-field="weekendTriple" type="number" min="0" value="${weekend.Triple || ""}" placeholder="Optional"></label>
      <label>Weekend Quad SAR<input data-season-field="weekendQuad" type="number" min="0" value="${weekend.Quad || ""}" placeholder="Optional"></label>
    </section>
  `;
}

function collectSeasonRates() {
  return $$("[data-season-row]").map((row) => {
    const get = (field) => row.querySelector(`[data-season-field="${field}"]`)?.value || "";
    const rates = {
      Single: Number(get("single")) || Number(get("double")) || 0,
      Double: Number(get("double")) || 0,
      Triple: Number(get("triple")) || Number(get("double")) || 0,
      Quad: Number(get("quad")) || Number(get("double")) || 0
    };
    const weekend = {
      Single: Number(get("weekendSingle")) || 0,
      Double: Number(get("weekendDouble")) || 0,
      Triple: Number(get("weekendTriple")) || 0,
      Quad: Number(get("weekendQuad")) || 0
    };
    const hasWeekend = Object.values(weekend).some(Boolean);
    return hasWeekend
      ? { from: get("from"), to: get("to"), weekday: rates, weekend }
      : { from: get("from"), to: get("to"), rates };
  }).filter((season) => season.from && season.to);
}

function renderSeasonList(seasons) {
  $("#seasonList").innerHTML = seasons.map((season, index) => seasonEditor(season, index)).join("");
  bindSeasonEditor();
}

function bindSeasonEditor() {
  $("#addSeasonBtn")?.addEventListener("click", () => {
    const seasons = collectSeasonRates();
    const last = seasons[seasons.length - 1] || { to: "2027-01-10", rates: { Single: 0, Double: 0, Triple: 0, Quad: 0 } };
    seasons.push({ from: last.to || "2026-07-20", to: last.to || "2027-01-10", rates: { Single: 0, Double: 0, Triple: 0, Quad: 0 } });
    renderSeasonList(seasons);
  });
  $$("[data-remove-season]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.removeSeason);
      const seasons = collectSeasonRates().filter((_, itemIndex) => itemIndex !== index);
      renderSeasonList(seasons.length ? seasons : [{ from: "2026-07-20", to: "2027-01-10", rates: { Single: 0, Double: 0, Triple: 0, Quad: 0 } }]);
    });
  });
}

function minSeasonRate(hotel) {
  const values = (hotel.seasonRates || []).flatMap((season) => {
    const sets = season.weekday || season.weekend ? [season.weekday, season.weekend].filter(Boolean) : [season.rates];
    return sets.flatMap((set) => Object.values(set || {}).filter((value) => Number(value) > 0));
  });
  return values.length ? Math.min(...values) : 0;
}

function seasonSummary(hotel) {
  const seasons = hotel.seasonRates || [];
  if (!seasons.length) return "No seasonal records yet";
  return `${seasons.length} season${seasons.length === 1 ? "" : "s"} | ${seasons[0].from} to ${seasons[seasons.length - 1].to}`;
}

function parseLeadDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function countRates(row) {
  return getVehicles().filter((vehicle) => Number(row.rates?.[vehicle.id]) > 0).length;
}

function hotelHasRates(hotel) {
  return (hotel.seasonRates || []).some((season) => {
    const sets = season.weekday || season.weekend ? [season.weekday, season.weekend] : [season.rates];
    return sets.filter(Boolean).some((set) => Object.values(set.rates || set).some((value) => Number(value) > 0));
  });
}

function hotelHasWeekendRates(hotel) {
  return (hotel.seasonRates || []).some((season) => season.weekend && Object.values(season.weekend).some((value) => Number(value) > 0));
}

function portalDiagnostics() {
  const leads = getLeads();
  const hotels = getHotels();
  const transportRates = getTransportRates();
  const vehicles = getVehicles();
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const recentLeads = leads.filter((lead) => {
    const date = parseLeadDate(lead.createdAt || lead.date);
    return date && date >= sevenDaysAgo;
  });
  const pendingLeads = leads.filter((lead) => ["New", "Contacted", "Quoted"].includes(lead.status)).length;
  const pricedHotels = hotels.filter(hotelHasRates);
  const missingRateHotels = hotels.filter((hotel) => !hotelHasRates(hotel));
  const missingPhotos = hotels.filter((hotel) => !hotel.photo).length;
  const weekendHotels = hotels.filter(hotelHasWeekendRates).length;
  const completeTransportRows = transportRates.filter((row) => countRates(row) === vehicles.length).length;
  return {
    leads,
    hotels,
    transportRates,
    recentLeads,
    pendingLeads,
    pricedHotels,
    missingRateHotels,
    missingPhotos,
    weekendHotels,
    completeTransportRows,
    vehicles
  };
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function cleanTotal(value) {
  return String(value || "Rs. 0").replace(/\s+/g, " ").trim();
}

function renderStats() {
  const { leads, hotels, recentLeads, pendingLeads } = portalDiagnostics();
  const makkah = hotels.filter((hotel) => hotel.city === "Makkah").length;
  const madinah = hotels.filter((hotel) => hotel.city === "Madinah").length;
  const stats = [
    ["Leads", leads.length, `${pendingLeads} active / ${recentLeads.length} last 7 days`],
    ["Hotels", hotels.length, `${makkah} Makkah / ${madinah} Madina`]
  ];
  $("#statsGrid").innerHTML = stats.map(([label, value, hint], index) => `<button type="button" class="statCard" data-stat-view="${index === 0 ? "leads" : "hotels"}"><span>${label}</span><strong>${value}</strong><small>${hint}</small></button>`).join("");
  $$("[data-stat-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.statView)));
}

function renderRecentLeads() {
  const leads = getLeads().slice(0, 5);
  $("#recentLeads").innerHTML = leads.length ? leads.map((lead) => `
    <button class="miniItem enquiryButton" type="button" data-view-lead="${lead.id}">
      <div><b>${escapeHtml(lead.name)}</b><small>${escapeHtml(lead.phone)} | ${escapeHtml(displayText(lead.route))} | ${escapeHtml(lead.date)}</small></div>
      <span class="badge ${lead.status === "New" ? "gold" : ""}">${escapeHtml(lead.status)}</span>
    </button>
  `).join("") : `<div class="miniItem emptyState"><div><b>No enquiries yet</b><small>Submit a quote from the designer or add a lead manually.</small></div><button type="button" data-empty-add-lead>Add Lead</button></div>`;
  $("[data-empty-add-lead]")?.addEventListener("click", () => openLeadModal());
  $$("#recentLeads [data-view-lead]").forEach((button) => button.addEventListener("click", () => viewRecord("Lead Details", getLeads().find((lead) => lead.id === button.dataset.viewLead))));
}

function renderHealth() {
  const { hotels, transportRates, missingRateHotels, missingPhotos, weekendHotels, completeTransportRows } = portalDiagnostics();
  const settings = getSettings();
  const missingTransport = transportRates.length - completeTransportRows;
  const rows = [
    ["Exchange rate", `SAR 1 = Rs. ${settings.exchangeRate}`, Number(settings.exchangeRate) > 0 ? "Ready" : "Fix"],
    ["Profit markup", `Economy SAR ${settings.profitEconomySar || 200} | Standard SAR ${settings.profitStandardSar || settings.profitSar || 250} | Executive SAR ${settings.profitExecutiveSar || 300}`, "Ready"],
    ["Hotel rate coverage", `${hotels.length - missingRateHotels.length}/${hotels.length} hotels priced`, missingRateHotels.length ? "Needs work" : "Ready"],
    ["Weekend pricing", `${weekendHotels} hotels have Friday/Saturday rows`, weekendHotels ? "Ready" : "Check"],
    ["Hotel photos", `${missingPhotos} hotels use fallback photos`, missingPhotos ? "Needs work" : "Ready"],
    ["Transport coverage", `${completeTransportRows}/${transportRates.length} sectors complete`, missingTransport ? "Needs work" : "Ready"]
  ];
  $("#healthList").innerHTML = rows.map(([label, value, tone]) => `
    <div class="healthItem"><div><b>${label}</b><small>${value}</small></div><span class="badge ${tone !== "Ready" ? "gold" : ""}">${tone}</span></div>
  `).join("");
}

function renderLeads() {
  const leads = getLeads();
  if (!leads.length) {
    $("#leadsTable").innerHTML = `<tr><td colspan="8"><div class="emptyTableState">No leads yet. Add one manually or submit a quote from the designer.</div></td></tr>`;
    return;
  }
  $("#leadsTable").innerHTML = leads.map((lead) => `
    <tr>
      <td class="leadNameCell"><b>${escapeHtml(lead.name || "Unnamed lead")}</b><small>${escapeHtml(lead.createdAt || "")}</small></td>
      <td>${escapeHtml(lead.phone || "-")}</td>
      <td class="leadRouteCell"><span>${escapeHtml(displayText(lead.route || "-"))}</span></td>
      <td class="leadDateCell"><b>${escapeHtml(formatDate(lead.date))}</b><small>${escapeHtml(lead.date || "")}</small></td>
      <td class="leadHotelsCell"><span>${escapeHtml(displayText(lead.hotels || "-"))}</span></td>
      <td class="moneyCell">${escapeHtml(cleanTotal(lead.total))}</td>
      <td><select data-lead-status="${lead.id}">${statuses.map((status) => `<option ${status === lead.status ? "selected" : ""}>${status}</option>`).join("")}</select></td>
      <td class="actionCell">
        <div class="rowActions leadActions">
          <button data-view-lead="${lead.id}" type="button">View</button>
          <button data-edit-lead="${lead.id}" type="button">Edit</button>
          <button class="danger" data-delete-lead="${lead.id}" type="button">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
  $$("[data-lead-status]").forEach((select) => select.addEventListener("change", () => updateLead(select.dataset.leadStatus, { status: select.value })));
  $$("[data-view-lead]").forEach((button) => button.addEventListener("click", () => viewRecord("Lead Details", getLeads().find((lead) => lead.id === button.dataset.viewLead))));
  $$("[data-edit-lead]").forEach((button) => button.addEventListener("click", () => openLeadModal(getLeads().find((lead) => lead.id === button.dataset.editLead))));
  $$("[data-delete-lead]").forEach((button) => button.addEventListener("click", () => deleteLead(button.dataset.deleteLead)));
}

function updateLead(id, patch) {
  storageSet("umrahLeads", getLeads().map((lead) => lead.id === id ? { ...lead, ...patch } : lead));
  renderAll();
}

function deleteLead(id) {
  if (!confirm("Delete this lead?")) return;
  storageSet("umrahLeads", getLeads().filter((lead) => lead.id !== id));
  renderAll();
}

function renderHotels() {
  const term = ($("#hotelSearch")?.value || "").toLowerCase().trim();
  const filtered = getHotels().filter((hotel) => `${hotel.name} ${hotel.city} ${displayCategory(hotel.category)}`.toLowerCase().includes(term));
  const renderHotelCards = (rows) => rows.length ? rows.map((hotel) => `
    <article class="hotelCard">
      <img src="${hotelImage(hotel)}" alt="${escapeHtml(displayText(hotel.name))}">
      <div class="hotelCardBody">
        <div><h3>${escapeHtml(displayText(hotel.name))}</h3><p class="seasonLine">${escapeHtml(displayText(hotel.city))} | ${escapeHtml(displayText(hotel.distance))}</p></div>
        <div class="hotelMeta"><span class="badge">${escapeHtml(displayCategory(hotel.category))}</span></div>
        <p class="seasonLine">${seasonSummary(hotel)}</p>
        ${(hotel.customFields || []).map((item) => `<p class="seasonLine">${escapeHtml(item.label)}: ${escapeHtml(displayText(item.value))}</p>`).join("")}
        <div class="rowActions cardActions">
          <button data-view-hotel="${hotel.id}" type="button">View</button>
          <button data-edit-hotel="${hotel.id}" type="button">Edit</button>
          <button class="danger" data-delete-hotel="${hotel.id}" type="button">Delete</button>
        </div>
      </div>
    </article>
  `).join("") : `<div class="emptyTableState hotelEmpty">No hotels found.</div>`;
  const makkahHotels = filtered.filter((hotel) => hotel.city === "Makkah");
  const madinaHotels = filtered.filter((hotel) => hotel.city === "Madinah");
  $("#makkahHotelCount").textContent = `${makkahHotels.length} hotel${makkahHotels.length === 1 ? "" : "s"}`;
  $("#madinaHotelCount").textContent = `${madinaHotels.length} hotel${madinaHotels.length === 1 ? "" : "s"}`;
  $("#makkahHotelGrid").innerHTML = renderHotelCards(makkahHotels);
  $("#madinaHotelGrid").innerHTML = renderHotelCards(madinaHotels);
  $$("[data-view-hotel]").forEach((button) => button.addEventListener("click", () => viewRecord("Hotel Details", getHotels().find((hotel) => hotel.id === button.dataset.viewHotel))));
  $$("[data-edit-hotel]").forEach((button) => button.addEventListener("click", () => openHotelEditor(getHotels().find((hotel) => hotel.id === button.dataset.editHotel))));
  $$("[data-delete-hotel]").forEach((button) => button.addEventListener("click", () => deleteHotel(button.dataset.deleteHotel)));
}

function renderTransport() {
  const vehicles = getVehicles();
  $("#transportHead").innerHTML = `<tr><th>Sector</th>${vehicles.map((vehicle) => `<th>${escapeHtml(vehicle.name)}</th>`).join("")}<th>Action</th></tr>`;
  $("#transportTable").innerHTML = getTransportRates().map((row) => `
    <tr>
      <td><b>${escapeHtml(row.sector)}</b></td>
      ${vehicles.map((vehicle) => `<td>SAR ${escapeHtml(row.rates[vehicle.id] || 0)}</td>`).join("")}
      <td class="actionCell">
        <div class="rowActions leadActions">
          <button data-view-transport="${escapeHtml(row.sector)}" type="button">View</button>
          <button data-edit-transport="${escapeHtml(row.sector)}" type="button">Edit</button>
          <button class="danger" data-delete-transport="${escapeHtml(row.sector)}" type="button">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
  $$("[data-view-transport]").forEach((button) => button.addEventListener("click", () => viewRecord("Transport Details", getTransportRates().find((row) => row.sector === button.dataset.viewTransport))));
  $$("[data-edit-transport]").forEach((button) => button.addEventListener("click", () => openTransportEditor(getTransportRates().find((row) => row.sector === button.dataset.editTransport))));
  $$("[data-delete-transport]").forEach((button) => button.addEventListener("click", () => deleteTransport(button.dataset.deleteTransport)));
}

function renderVehicles() {
  $("#vehiclesTable").innerHTML = getVehicles().map((vehicle) => `
    <tr>
      <td class="vehicleCell">
        <div class="vehicleInfo">
          <img src="${escapeHtml(vehicle.photo || "")}" alt="${escapeHtml(vehicle.name)}">
          <div><b>${escapeHtml(vehicle.name)}</b><small>${escapeHtml(vehicle.note || "No note added")}</small></div>
        </div>
      </td>
      <td>${escapeHtml(vehicle.capacity || "-")}</td>
      <td>${escapeHtml(vehicle.type || "-")}</td>
      <td class="urlCell">${vehicle.photo ? `<a href="${escapeHtml(vehicle.photo)}" target="_blank" rel="noreferrer">Open image</a><small>${escapeHtml(vehicle.photo)}</small>` : "-"}</td>
      <td class="actionCell">
        <div class="rowActions leadActions">
          <button data-view-vehicle="${escapeHtml(vehicle.id)}" type="button">View</button>
          <button data-edit-vehicle="${escapeHtml(vehicle.id)}" type="button">Edit</button>
          <button class="danger" data-delete-vehicle="${escapeHtml(vehicle.id)}" type="button">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
  $$("[data-view-vehicle]").forEach((button) => button.addEventListener("click", () => viewRecord("Vehicle Details", getVehicles().find((vehicle) => vehicle.id === button.dataset.viewVehicle))));
  $$("[data-edit-vehicle]").forEach((button) => button.addEventListener("click", () => openVehicleEditor(getVehicles().find((vehicle) => vehicle.id === button.dataset.editVehicle))));
  $$("[data-delete-vehicle]").forEach((button) => button.addEventListener("click", () => deleteVehicle(button.dataset.deleteVehicle)));
}

function renderSettings() {
  const settings = getSettings();
  $("#companyName").value = settings.companyName;
  $("#whatsappNumber").value = settings.whatsappNumber;
  $("#exchangeRateInput").value = settings.exchangeRate;
  $("#profitEconomySarInput").value = settings.profitEconomySar || "200";
  $("#profitStandardSarInput").value = settings.profitStandardSar || settings.profitSar || "250";
  $("#profitExecutiveSarInput").value = settings.profitExecutiveSar || "300";
  $("#visaPriceInput").value = settings.visaPrice;
  $("#ziyaratSarInput").value = settings.ziyaratSar;
  $("#pdfNote").value = settings.pdfNote;
  renderProfitSettings();
}

function renderProfitSettings() {
  const settings = getSettings();
  $("#overviewProfitEconomySar").value = settings.profitEconomySar || "200";
  $("#overviewProfitStandardSar").value = settings.profitStandardSar || settings.profitSar || "250";
  $("#overviewProfitExecutiveSar").value = settings.profitExecutiveSar || "300";
}

function renderAll() {
  renderStats();
  renderRecentLeads();
  renderLeads();
  renderHotels();
  renderVehicles();
  renderTransport();
  renderSettings();
}

function setView(view) {
  $$(".view").forEach((section) => section.classList.remove("active"));
  $(`#${view}View`).classList.add("active");
  $$("#sideNav button").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  $("#viewTitle").textContent = $(`#sideNav button[data-view="${view}"]`).textContent;
}

function humanLabel(key) {
  const labels = {
    id: "Record ID",
    createdAt: "Created",
    name: "Name",
    phone: "Phone",
    route: "Route",
    date: "Trip Date",
    hotels: "Hotels",
    total: "Estimated Total",
    status: "Status",
    city: "City",
    category: "Category",
    distance: "Distance / Area",
    meal: "Meal Plan",
    photo: "Photo URL",
    customFields: "Custom Fields",
    seasonRates: "Seasonal Rates",
    sector: "Transport Sector",
    rates: "Vehicle Rates",
    capacity: "Capacity",
    type: "Vehicle Type",
    note: "Notes"
  };
  return labels[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

function rateObjectTable(rates = {}) {
  const entries = Object.entries(rates);
  if (!entries.length) return "-";
  return `
    <table class="detailMiniTable">
      <tbody>
        ${entries.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>SAR ${escapeHtml(value || 0)}</td></tr>`).join("")}
      </tbody>
    </table>
  `;
}

function seasonRatesTable(seasons = []) {
  if (!seasons.length) return "-";
  return `
    <div class="detailNested">
      ${seasons.map((season, index) => {
        const weekday = season.weekday || season.rates || {};
        const weekend = season.weekend || {};
        return `
          <table class="detailMiniTable">
            <thead>
              <tr><th colspan="5">Season ${index + 1}: ${escapeHtml(formatDate(season.from))} to ${escapeHtml(formatDate(season.to))}</th></tr>
              <tr><th>Rate Type</th><th>Single</th><th>Double</th><th>Triple</th><th>Quad</th></tr>
            </thead>
            <tbody>
              <tr><td>Weekday</td><td>SAR ${escapeHtml(weekday.Single || 0)}</td><td>SAR ${escapeHtml(weekday.Double || 0)}</td><td>SAR ${escapeHtml(weekday.Triple || 0)}</td><td>SAR ${escapeHtml(weekday.Quad || 0)}</td></tr>
              ${Object.values(weekend).some(Boolean) ? `<tr><td>Weekend</td><td>SAR ${escapeHtml(weekend.Single || 0)}</td><td>SAR ${escapeHtml(weekend.Double || 0)}</td><td>SAR ${escapeHtml(weekend.Triple || 0)}</td><td>SAR ${escapeHtml(weekend.Quad || 0)}</td></tr>` : ""}
            </tbody>
          </table>
        `;
      }).join("")}
    </div>
  `;
}

function customFieldsView(fields = []) {
  if (!fields.length) return "-";
  return `<div class="detailPillList">${fields.map((item) => `<span class="badge">${escapeHtml(item.label)}: ${escapeHtml(displayText(item.value))}</span>`).join("")}</div>`;
}

function detailValue(key, value) {
  if (key === "category") return escapeHtml(displayCategory(value));
  if (key === "seasonRates") return seasonRatesTable(value);
  if (key === "rates") return rateObjectTable(value);
  if (key === "customFields") return customFieldsView(value);
  if (key === "photo" && value) return `<a href="${escapeHtml(value)}" target="_blank" rel="noreferrer">${escapeHtml(value)}</a>`;
  if (Array.isArray(value)) return value.length ? value.map((item) => escapeHtml(typeof item === "object" ? Object.values(item).join(": ") : item)).join("<br>") : "-";
  if (value && typeof value === "object") return rateObjectTable(value);
  if (key === "date" || key === "createdAt" || key === "from" || key === "to") return escapeHtml(formatDate(value));
  if (typeof value === "string") return escapeHtml(displayText(value || "-"));
  return escapeHtml(value || "-");
}

function viewRecord(title, record) {
  if (!record) return;
  const hiddenKeys = new Set(["source"]);
  $("#viewTitleModal").textContent = title;
  $("#viewDetails").innerHTML = `
    <table class="detailsTable">
      <tbody>
        ${Object.entries(record)
          .filter(([key]) => !hiddenKeys.has(key))
          .map(([key, value]) => `<tr><th>${escapeHtml(humanLabel(key))}</th><td>${detailValue(key, value)}</td></tr>`)
          .join("")}
      </tbody>
    </table>
  `;
  $("#viewModal").classList.remove("hidden");
}

function openLeadModal(lead = null) {
  $("#leadModalTitle").textContent = lead ? "Edit Lead" : "Add Lead";
  $("#leadId").value = lead?.id || "";
  $("#leadName").value = lead?.name || "";
  $("#leadPhone").value = lead?.phone || "";
  $("#leadRoute").value = lead?.route || "";
  $("#leadDate").value = lead?.date || "";
  $("#leadHotels").value = lead?.hotels || "";
  $("#leadTotal").value = lead?.total || "";
  $("#leadStatus").value = lead?.status || "New";
  $("#leadModal").classList.remove("hidden");
}

function closeLeadModal() {
  $("#leadModal").classList.add("hidden");
  $("#leadForm").reset();
  $("#leadId").value = "";
}

function openHotelEditor(hotel) {
  recordMode = "hotel";
  const record = hotel || {
    id: `hotel-${Date.now()}`,
    name: "",
    city: "Makkah",
    category: "Standard",
    distance: "",
    meal: "RO",
    photo: "",
    customFields: [],
    seasonRates: [{ from: "2026-07-20", to: "2027-01-10", rates: { Single: 0, Double: 0, Triple: 0, Quad: 0 } }]
  };
  recordId = record.id;
  const seasons = record.seasonRates || [];
  $("#recordTitle").textContent = hotel ? "Edit Hotel" : "Add Hotel";
  $("#recordFields").innerHTML = `
    <label>Hotel Name<input id="recordName" value="${escapeHtml(record.name)}" required></label>
    <label>Destination<select id="recordCity"><option value="Makkah" ${record.city === "Makkah" ? "selected" : ""}>Makkah</option><option value="Madinah" ${record.city === "Madinah" ? "selected" : ""}>Madina</option></select></label>
    <label>Category<select id="recordCategory" required>
      ${["Economy", "Standard", "Executive"].map((category) => `<option ${displayCategory(record.category) === category ? "selected" : ""}>${category}</option>`).join("")}
    </select></label>
    <label>Distance / Area<input id="recordDistance" value="${escapeHtml(record.distance || "")}"></label>
    <label>Meal Plan<input id="recordMeal" value="${escapeHtml(record.meal || "")}"></label>
    <label>Photo URL<input id="recordPhoto" value="${escapeHtml(record.photo || hotelImage(record))}" placeholder="https://..."></label>
    <label class="fullField">Custom Fields<textarea id="recordCustomFields" placeholder="Feature: Value&#10;Distance note: Near Haram">${escapeHtml(formatCustomFields(record.customFields))}</textarea></label>
    <div class="fullField seasonTools">
      <div>
        <b>Seasonal Rates</b>
        <small>Add one row per month/date range. Weekend rates are optional.</small>
      </div>
      <button type="button" class="ghostMiniBtn" id="addSeasonBtn">Add Season</button>
    </div>
    <div class="fullField seasonList" id="seasonList">
      ${(seasons.length ? seasons : record.seasonRates).map((season, index) => seasonEditor(season, index)).join("")}
    </div>
  `;
  bindSeasonEditor();
  $("#recordModal").classList.remove("hidden");
}

function openTransportEditor(row) {
  recordMode = "transport";
  const record = row || { sector: "", rates: {} };
  const vehicles = getVehicles();
  recordId = record.sector || "";
  $("#recordTitle").textContent = row ? "Edit Transport Sector" : "Add Transport Sector";
  $("#recordFields").innerHTML = `
    <label>Sector<input id="recordSector" value="${escapeHtml(record.sector)}" placeholder="MAK HTL-MASJID AYESHA" required></label>
    ${vehicles.map((vehicle) => `<label>${escapeHtml(vehicle.name)} SAR<input id="rate${escapeHtml(vehicle.id)}" type="number" min="0" value="${record.rates[vehicle.id] || 0}" required></label>`).join("")}
  `;
  $("#recordModal").classList.remove("hidden");
}

function openVehicleEditor(vehicle) {
  recordMode = "vehicle";
  const record = vehicle || { id: `vehicle-${Date.now()}`, name: "", capacity: "", type: "", note: "", photo: "" };
  recordId = record.id;
  $("#recordTitle").textContent = vehicle ? "Edit Vehicle" : "Add Vehicle";
  $("#recordFields").innerHTML = `
    <label>Vehicle Name<input id="vehicleName" value="${escapeHtml(record.name)}" placeholder="Car" required></label>
    <label>Capacity<input id="vehicleCapacity" value="${escapeHtml(record.capacity || "")}" placeholder="4 pax"></label>
    <label>Vehicle Type<input id="vehicleType" value="${escapeHtml(record.type || "")}" placeholder="Sedan, Van, SUV"></label>
    <label>Photo URL<input id="vehiclePhoto" value="${escapeHtml(record.photo || "")}" placeholder="https://..."></label>
    <label class="fullField">Notes<textarea id="vehicleNote" placeholder="Private car for small families">${escapeHtml(record.note || "")}</textarea></label>
  `;
  $("#recordModal").classList.remove("hidden");
}

function closeRecordModal() {
  $("#recordModal").classList.add("hidden");
  $("#recordForm").reset();
  recordMode = null;
  recordId = null;
}

function saveRecord(event) {
  event.preventDefault();
  if (recordMode === "hotel") {
    const overrides = getHotelOverrides();
    const seasonRates = collectSeasonRates();
    overrides[recordId] = {
      id: recordId,
      name: $("#recordName").value.trim(),
      city: $("#recordCity").value,
      category: $("#recordCategory").value.trim(),
      distance: $("#recordDistance").value.trim(),
      meal: $("#recordMeal").value.trim(),
      photo: $("#recordPhoto").value.trim(),
      customFields: parseCustomFields($("#recordCustomFields").value),
      seasonRates
    };
    storageSet("umrahHotelOverrides", overrides);
  }
  if (recordMode === "transport") {
    const overrides = getTransportOverrides();
    const newSector = $("#recordSector").value.trim();
    const rates = {};
    getVehicles().forEach((vehicle) => { rates[vehicle.id] = Number($(`#rate${CSS.escape(vehicle.id)}`).value) || 0; });
    if (newSector !== recordId) {
      const deleted = [...new Set([...getDeletedTransport(), recordId])];
      storageSet("umrahDeletedTransport", deleted);
    }
    overrides[newSector] = { sector: newSector, rates };
    storageSet("umrahTransportOverrides", overrides);
  }
  if (recordMode === "vehicle") {
    const overrides = getVehicleOverrides();
    overrides[recordId] = {
      id: recordId,
      name: $("#vehicleName").value.trim(),
      capacity: $("#vehicleCapacity").value.trim(),
      type: $("#vehicleType").value.trim(),
      note: $("#vehicleNote").value.trim(),
      photo: $("#vehiclePhoto").value.trim()
    };
    storageSet("umrahVehicleOverrides", overrides);
  }
  closeRecordModal();
  renderAll();
}

function deleteHotel(id) {
  if (!confirm("Delete this hotel from dashboard list?")) return;
  storageSet("umrahDeletedHotels", [...new Set([...getDeletedHotels(), id])]);
  renderAll();
}

function deleteTransport(sector) {
  if (!confirm("Delete this transport sector?")) return;
  storageSet("umrahDeletedTransport", [...new Set([...getDeletedTransport(), sector])]);
  renderAll();
}

function deleteVehicle(id) {
  if (!confirm("Delete this vehicle type? Its transport rate column will be hidden.")) return;
  storageSet("umrahDeletedVehicles", [...new Set([...getDeletedVehicles(), id])]);
  renderAll();
}

function downloadCsv() {
  const header = ["Name", "Phone", "Route", "Date", "Hotels", "Total", "Status", "Created"];
  const rows = getLeads().map((lead) => [lead.name, lead.phone, displayText(lead.route), lead.date, displayText(lead.hotels || ""), lead.total || "", lead.status, lead.createdAt || ""]);
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `umrah-leads-${Date.now()}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

$("#loginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if ($("#loginEmail").value.trim() === demoUser.email && $("#loginPassword").value === demoUser.password) {
    localStorage.setItem("umrahAdminSession", "active");
    $("#loginAlert").classList.add("hidden");
    showApp();
    return;
  }
  $("#loginAlert").textContent = "Invalid email or password.";
  $("#loginAlert").classList.remove("hidden");
});

$("#logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("umrahAdminSession");
  showApp();
});

$$("#sideNav button").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
$("#hotelSearch").addEventListener("input", renderHotels);
$("#exportLeadsBtn").addEventListener("click", downloadCsv);
$("#addLeadBtn").addEventListener("click", () => openLeadModal());
$("#addHotelBtn").addEventListener("click", () => openHotelEditor(null));
$("#addVehicleBtn").addEventListener("click", () => openVehicleEditor(null));
$("#addTransportBtn").addEventListener("click", () => openTransportEditor(null));
$$("[data-close-modal]").forEach((item) => item.addEventListener("click", closeLeadModal));
$$("[data-close-record]").forEach((item) => item.addEventListener("click", closeRecordModal));
$$("[data-close-view]").forEach((item) => item.addEventListener("click", () => $("#viewModal").classList.add("hidden")));
$("#recordForm").addEventListener("submit", saveRecord);

$("#leadForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const id = $("#leadId").value || `L-${Date.now()}`;
  const lead = {
    id,
    name: $("#leadName").value.trim(),
    phone: $("#leadPhone").value.trim(),
    route: $("#leadRoute").value.trim(),
    date: $("#leadDate").value,
    hotels: $("#leadHotels").value.trim() || "-",
    total: $("#leadTotal").value.trim() || "Rs. 0",
    status: $("#leadStatus").value,
    createdAt: getLeads().find((item) => item.id === id)?.createdAt || new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  };
  const existing = getLeads().filter((item) => item.id !== id);
  storageSet("umrahLeads", [lead, ...existing]);
  closeLeadModal();
  renderAll();
  setView("leads");
});

$("#saveSettingsBtn").addEventListener("click", () => {
  const existing = getSettings();
  storageSet("umrahSettings", {
    ...existing,
    companyName: $("#companyName").value.trim() || settingsDefaults.companyName,
    whatsappNumber: $("#whatsappNumber").value.trim() || settingsDefaults.whatsappNumber,
    exchangeRate: $("#exchangeRateInput").value || settingsDefaults.exchangeRate,
    profitSar: $("#profitStandardSarInput").value || settingsDefaults.profitSar,
    profitEconomySar: $("#profitEconomySarInput").value || settingsDefaults.profitEconomySar,
    profitStandardSar: $("#profitStandardSarInput").value || settingsDefaults.profitStandardSar,
    profitExecutiveSar: $("#profitExecutiveSarInput").value || settingsDefaults.profitExecutiveSar,
    visaPrice: $("#visaPriceInput").value || settingsDefaults.visaPrice,
    ziyaratSar: $("#ziyaratSarInput").value || settingsDefaults.ziyaratSar,
    pdfNote: $("#pdfNote").value.trim() || settingsDefaults.pdfNote
  });
  $("#settingsSaved").classList.remove("hidden");
  setTimeout(() => $("#settingsSaved").classList.add("hidden"), 1800);
  renderAll();
});

$("#saveOverviewProfitBtn").addEventListener("click", () => {
  const existing = getSettings();
  storageSet("umrahSettings", {
    ...existing,
    profitSar: $("#overviewProfitStandardSar").value || settingsDefaults.profitSar,
    profitEconomySar: $("#overviewProfitEconomySar").value || settingsDefaults.profitEconomySar,
    profitStandardSar: $("#overviewProfitStandardSar").value || settingsDefaults.profitStandardSar,
    profitExecutiveSar: $("#overviewProfitExecutiveSar").value || settingsDefaults.profitExecutiveSar
  });
  $("#overviewProfitSaved").classList.remove("hidden");
  setTimeout(() => $("#overviewProfitSaved").classList.add("hidden"), 1800);
  renderAll();
});

showApp();
