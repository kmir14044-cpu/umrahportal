const { hotels: baseHotels, routePresets, transportRates: baseTransportRates, transportVehicles, exchangeRate, defaultProfitSar } = window.portalData;

const state = {
  startDate: "",
  routePresetId: "mk-md",
  nights: 6,
  adults: 2,
  children: 0,
  infants: 0,
  childAges: [],
  infantAges: [],
  rooms: 1,
  roomType: "Double",
  selectedHotels: {},
  vehicle: "",
  selectedSectors: [],
  visa: false,
  ziyarat: false,
  contactName: "",
  phone: "",
  currentStep: 0,
  customSequence: ["Makkah", "Madinah"],
  stopNights: [],
  activeHotelStop: 0,
  hotelCategory: "Standard",
  transportMode: "full",
  vehicleOpen: false,
  submitted: false,
  leadSaved: false
};

const wizardSteps = [
  { title: "Dates", hint: "Route and nights" },
  { title: "Group", hint: "Travelers" },
  { title: "Hotels", hint: "Makkah and Madinah" },
  { title: "Transport", hint: "Vehicle and sectors" },
  { title: "Quote", hint: "Review and PDF" }
];

const hotelImages = {
  "Makkah-Standard": "https://tour-designer.lovable.app/assets/makkah-standard-B4tA1pgB.jpg",
  "Makkah-Deluxe": "https://tour-designer.lovable.app/assets/makkah-deluxe-orNj5W32.jpg",
  "Makkah-Executive": "https://tour-designer.lovable.app/assets/makkah-executive-DKEjOIdI.jpg",
  "Madinah-Standard": "https://tour-designer.lovable.app/assets/madinah-standard-BywP17cg.jpg",
  "Madinah-Deluxe": "https://tour-designer.lovable.app/assets/madinah-deluxe-BNVFZdme.jpg",
  "Madinah-Executive": "https://tour-designer.lovable.app/assets/madinah-executive-D1rwdrR7.jpg"
};

const vehicleImages = {
  Car: { src: "https://loremflickr.com/640/360/toyota,camry,sedan/all" },
  Staria: { src: "https://loremflickr.com/640/360/hyundai,staria,van/all" },
  GMC: { src: "https://loremflickr.com/640/360/gmc,yukon,suv/all" },
  Hiace: { src: "https://loremflickr.com/640/360/toyota,hiace,van/all" },
  Coaster: { src: "https://loremflickr.com/640/360/toyota,coaster,bus/all" }
};

const vehicleDefaults = {
  Car: { id: "Car", name: "Car", capacity: "4 pax", type: "Sedan", note: "Private car for small families", photo: vehicleImages.Car.src },
  Staria: { id: "Staria", name: "Staria", capacity: "7 pax", type: "Van", note: "Hyundai Staria style family van", photo: vehicleImages.Staria.src },
  GMC: { id: "GMC", name: "GMC", capacity: "6 pax", type: "Premium SUV", note: "Premium SUV for private transfers", photo: vehicleImages.GMC.src },
  Hiace: { id: "Hiace", name: "Hiace", capacity: "12 pax", type: "Van", note: "Toyota Hiace for medium groups", photo: vehicleImages.Hiace.src },
  Coaster: { id: "Coaster", name: "Coaster", capacity: "20 pax", type: "Bus", note: "Coaster bus for larger groups", photo: vehicleImages.Coaster.src }
};

const pricingDefaults = {
  exchangeRate: String(exchangeRate),
  profitSar: String(defaultProfitSar || 250),
  profitEconomySar: "200",
  profitStandardSar: "250",
  profitExecutiveSar: "300",
  visaPrice: "43000",
  ziyaratSar: "500",
  pdfNote: "Final price may vary based on availability and confirmation."
};

function localSettings() {
  try {
    return { ...pricingDefaults, ...(JSON.parse(localStorage.getItem("umrahSettings") || "{}") || {}) };
  } catch {
    return pricingDefaults;
  }
}

function activeHotels() {
  const overrides = JSON.parse(localStorage.getItem("umrahHotelOverrides") || "{}");
  const deleted = new Set(JSON.parse(localStorage.getItem("umrahDeletedHotels") || "[]"));
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

function activeTransportRates() {
  const overrides = JSON.parse(localStorage.getItem("umrahTransportOverrides") || "{}");
  const deleted = new Set(JSON.parse(localStorage.getItem("umrahDeletedTransport") || "[]"));
  const baseRows = baseTransportRates
    .filter((row) => !deleted.has(row.sector))
    .map((row) => ({ ...row, rates: { ...row.rates, ...(overrides[row.sector]?.rates || {}) }, ...(overrides[row.sector] || {}) }));
  const baseSectors = new Set(baseRows.map((row) => row.sector));
  const customRows = Object.values(overrides).filter((row) => row?.sector && !deleted.has(row.sector) && !baseSectors.has(row.sector));
  return [...baseRows, ...customRows];
}

function activeVehicles() {
  const overrides = JSON.parse(localStorage.getItem("umrahVehicleOverrides") || "{}");
  const deleted = new Set(JSON.parse(localStorage.getItem("umrahDeletedVehicles") || "[]"));
  const baseRows = transportVehicles
    .filter((id) => !deleted.has(id))
    .map((id) => ({ ...(vehicleDefaults[id] || { id, name: id, capacity: "", type: "", note: "", photo: "" }), ...(overrides[id] || {}) }));
  const baseIds = new Set(baseRows.map((vehicle) => vehicle.id));
  const customRows = Object.values(overrides).filter((vehicle) => vehicle?.id && !deleted.has(vehicle.id) && !baseIds.has(vehicle.id));
  return [...baseRows, ...customRows];
}

function vehicleRecord(id) {
  return activeVehicles().find((vehicle) => vehicle.id === id);
}

function vehicleLabel(id) {
  return vehicleRecord(id)?.name || id || "";
}

const categoryOrder = ["Economy", "Standard", "Executive"];
const categoryRank = { Economy: 0, Standard: 1, Executive: 2 };
function displayCategory(category) {
  if (category === "Deluxe") return "Economy";
  return category || "Standard";
}

function selectedPackageCategory(hotelLines) {
  return hotelLines.reduce((best, line) => {
    const category = displayCategory(line.hotel?.category);
    return categoryRank[category] > categoryRank[best] ? category : best;
  }, "Economy");
}

function categoryProfitSar(category, settings) {
  const values = {
    Economy: settings.profitEconomySar ?? 200,
    Standard: settings.profitStandardSar ?? settings.profitSar ?? 250,
    Executive: settings.profitExecutiveSar ?? 300
  };
  return Number(values[category] ?? settings.profitSar ?? 250) || 0;
}

const money = (value) => `Rs. ${Math.round(value).toLocaleString()}`;
const sar = (value) => Math.round(value * (Number(localSettings().exchangeRate) || exchangeRate));
const today = new Date();
const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
const route = () => state.routePresetId === "custom"
  ? { id: "custom", label: "Custom Route", sequence: state.customSequence }
  : routePresets.find((item) => item.id === state.routePresetId);
const routeSequence = () => route()?.sequence || [];
const stopKey = (city, index) => `${city}-${index}`;
function searchImageUrl(query) {
  return `https://tse3.mm.bing.net/th?q=${encodeURIComponent(query)}&w=640&h=360&c=7&rs=1&p=0&o=5&pid=1.7`;
}

const hotelImage = (hotel) => {
  if (hotel?.photo) return hotel.photo;
  return searchImageUrl(`${hotel?.name || "hotel"} ${hotel?.city || "Saudi Arabia"} hotel exterior`);
};

function distributedNights(total, stops) {
  const nights = Math.max(0, Number(total) || 0);
  if (!stops) return [];
  const base = Math.floor(nights / stops);
  const remainder = nights % stops;
  return Array.from({ length: stops }, (_, index) => base + (index < remainder ? 1 : 0));
}

function stopNightValues() {
  const sequence = routeSequence();
  if (!sequence.length) return [];
  const saved = Array.isArray(state.stopNights) ? state.stopNights.map(Number) : [];
  const savedTotal = saved.reduce((sum, value) => sum + value, 0);
  if (saved.length === sequence.length && saved.every((value) => value >= 0) && savedTotal === Number(state.nights)) {
    return saved;
  }
  return distributedNights(state.nights, sequence.length);
}

function resetStopNights() {
  state.stopNights = [];
}

function parseDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function displayDate(date) {
  if (!date) return "date pending";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function addDays(date, days) {
  if (!date) return null;
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isSaudiWeekend(date) {
  return date.getDay() === 5 || date.getDay() === 6;
}

function rateFromSet(rateSet, roomType, extraBed = 0) {
  if (!rateSet) return 0;
  const rates = rateSet.rates || rateSet;
  if (Object.prototype.hasOwnProperty.call(rates, roomType)) return Number(rates[roomType]) || 0;
  if (roomType === "Triple" && rates.Double && extraBed) return rates.Double + extraBed;
  if (roomType === "Quad" && rates.Double && extraBed) return rates.Double + extraBed * 2;
  if (roomType === "Single" && rates.Double) return rates.Double;
  return rates.Double || rates.Single || Object.values(rates)[0] || 0;
}

function rateKeysForHotel(hotel) {
  const keys = new Set();
  (hotel?.seasonRates || []).forEach((season) => {
    const sets = season.weekday || season.weekend ? [season.weekday, season.weekend] : [season.rates];
    sets.filter(Boolean).forEach((set) => {
      Object.entries(set.rates || set).forEach(([key, value]) => {
        if (Number(value) > 0) keys.add(key);
      });
    });
  });
  return [...keys];
}

function roomTypeOptions() {
  const selectedId = stopPlan()[state.activeHotelStop]
    ? state.selectedHotels[stopKey(stopPlan()[state.activeHotelStop].city, state.activeHotelStop)]
    : "";
  const selectedHotel = activeHotels().find((hotel) => hotel.id === selectedId);
  const base = ["Double", "Triple", "Quad", "Single"];
  const options = [...new Set([...base, ...rateKeysForHotel(selectedHotel)])];
  return [["", "Select room type"], ...options.map((option) => [option, option])];
}

function sanitizePhone(value) {
  const trimmed = String(value || "").trim();
  const plus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "").slice(0, plus ? 12 : 11);
  return plus ? `+${digits}` : digits;
}

function validPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return (digits.startsWith("92") && digits.length === 12) || (digits.startsWith("03") && digits.length === 11);
}

function daysBetween(from, to) {
  const start = parseDate(from);
  const end = parseDate(to);
  if (!start || !end) return Number.MAX_SAFE_INTEGER;
  return Math.max(1, Math.round((end - start) / 86400000));
}

function rateForSeason(season, roomType, date, hotel) {
  if (!season || !date) return 0;
  const weekend = isSaudiWeekend(date);
  const selectedSet = season.weekday || season.weekend
    ? (weekend ? season.weekend || season.weekday : season.weekday || season.weekend)
    : season.rates;
  return rateFromSet(selectedSet, roomType, season.extraBed || hotel?.extraBed || 0);
}

function matchingSeason(hotel, date, roomType = state.roomType || "Double") {
  if (!hotel?.seasonRates?.length || !date) return null;
  const iso = formatDate(date);
  const matches = hotel.seasonRates
    .filter((season) => iso >= season.from && iso < season.to)
    .filter((season) => rateForSeason(season, roomType, date, hotel) > 0)
    .sort((a, b) => daysBetween(a.from, a.to) - daysBetween(b.from, b.to));
  return matches[0] || null;
}

function nightlyHotelRate(hotel, roomType, date) {
  if (!hotel || !roomType || !date) return { sar: 0, note: "pending" };
  const season = matchingSeason(hotel, date, roomType);
  if (!season) return { sar: 0, note: "unavailable" };
  const weekend = isSaudiWeekend(date);
  return {
    sar: rateForSeason(season, roomType, date, hotel),
    note: weekend ? "weekend" : "weekday",
    season
  };
}

function minimumHotelRate(hotel, roomType = state.roomType || "Double") {
  const values = (hotel.seasonRates || []).flatMap((season) => {
    const sets = season.weekday || season.weekend ? [season.weekday, season.weekend].filter(Boolean) : [season.rates];
    return sets.map((set) => rateFromSet(set, roomType, season.extraBed || hotel.extraBed || 0)).filter(Boolean);
  });
  return values.length ? Math.min(...values) : 0;
}

function hotelRateLabel(hotel) {
  if (!hotel) return "Hotel pending";
  return hotel.distance || "Distance on request";
}

function stopPlan() {
  const sequence = routeSequence();
  const nights = stopNightValues();
  let cursor = parseDate(state.startDate);
  return sequence.map((city, index) => {
    const stopNights = nights[index] || 0;
    const checkIn = cursor;
    const checkOut = cursor ? addDays(cursor, stopNights) : null;
    cursor = checkOut;
    return { city, index, nights: stopNights, checkIn, checkOut };
  });
}

function hotelStayCost(hotel, roomType, checkIn, nights) {
  const breakdown = [];
  let totalSar = 0;
  for (let night = 0; night < nights; night += 1) {
    const date = addDays(checkIn, night);
    const rate = nightlyHotelRate(hotel, roomType, date);
    breakdown.push({ date, ...rate });
    totalSar += rate.sar;
  }
  return {
    breakdown,
    totalSar,
    avgSar: nights ? Math.round(totalSar / nights) : 0,
    hasMissingRates: breakdown.some((item) => !item.sar)
  };
}

function quote() {
  const hotelLines = stopPlan().map(({ city, index, nights, checkIn, checkOut }) => {
    const hotel = activeHotels().find((item) => item.id === state.selectedHotels[stopKey(city, index)]);
    const stay = hotelStayCost(hotel, state.roomType, checkIn, nights);
    return { city, hotel, nights, checkIn, checkOut, stay, total: sar(stay.totalSar) * state.rooms };
  });
  const hotelTotal = hotelLines.reduce((sum, line) => sum + line.total, 0);
  const transportSectors = effectiveTransportSectors();
  const transportTotal = transportSectors.reduce((sum, sector) => {
    const row = activeTransportRates().find((item) => item.sector === sector);
    return sum + sar(row && state.vehicle ? row.rates[state.vehicle] || 0 : 0);
  }, 0);
  const travelers = state.adults + state.children;
  const settings = localSettings();
  const visaTotal = state.visa ? travelers * (Number(settings.visaPrice) || 0) : 0;
  const ziyaratTotal = state.ziarat ? sar(Number(settings.ziyaratSar) || 0) : 0;
  const subtotal = hotelTotal + transportTotal + visaTotal + ziyaratTotal;
  const packageCategory = selectedPackageCategory(hotelLines);
  const profitTotal = subtotal ? sar(categoryProfitSar(packageCategory, settings)) : 0;
  return {
    hotelLines,
    hotelTotal,
    transportTotal,
    visaTotal,
    ziyaratTotal,
    packageCategory,
    subtotal,
    profitTotal,
    total: subtotal + profitTotal
  };
}

function render() {
  document.body.dataset.step = wizardSteps[state.currentStep].title.toLowerCase();
  if (!state.submitted) {
    document.getElementById("resultBar").classList.add("hidden");
    document.getElementById("itinerary").classList.add("hidden");
  }
  renderSteps();
  document.getElementById("wizardGrid").innerHTML = stepContent();
  bind();
  renderSummary();
  renderStepButtons();
}

function stepContent() {
  const step = state.currentStep;
  if (step === 0) {
    return `
      <div class="formIntro"><div><b>Your contact details</b><small>So our team can reach out about your quote.</small></div></div>
      ${contactField()}
      <div class="formIntro routeIntro"><div><b>Route Selection</b><small>Choose a standard route or build a custom city order.</small></div></div>
      ${routeCards()}
      ${customRouteBuilder()}
      ${field("Trip Start Date", "startDate", "date", state.startDate, true)}
      ${field("Duration / Nights", "nights", "number", state.nights, true, "e.g. 7")}
      ${nightsPerStop()}
    `;
  }
  if (step === 1) {
    return `
      <div class="formIntro"><div><b>Group Size</b><small>Enter travelers, ages for children/infants, and room requirement.</small></div></div>
      ${counterPanel("Guests", [["Adults", "adults", 1], ["Children", "children", 0], ["Infants", "infants", 0]])}
      ${ageFields()}
      <div class="groupRoomControls">
        ${selectField("Room Type", "roomType", state.roomType, roomTypeOptions(), true)}
        ${roomsControl()}
      </div>
      <div class="groupNote">${state.adults + state.children} payable pax<br><small>Infants are recorded for travel details and are not counted in hotel room pricing.</small></div>
    `;
  }
  if (step === 2) {
    return `
      <div class="formIntro"><div><b>Choose Your Hotels</b><small>Pick one hotel for each stop. Room type and rooms are already set from Group.</small></div></div>
      ${hotelStopTabs()}
      ${hotelPreview()}
    `;
  }
  if (step === 3) {
    return `
      <div class="formIntro"><div><b>Transport</b><small>Pick full transport or selective legs. Legs without a vehicle are not charged.</small></div></div>
      ${transportOptions()}
      ${vehicleField()}
      ${transportField()}
    `;
  }
  return `
    <div class="formIntro"><div><b>Extras & Review</b><small>Add optional services and download your full itinerary.</small></div></div>
    ${extrasField()}
    <div class="quoteBreakdown">
      ${quoteBreakdown()}
    </div>
  `;
}

function renderSteps() {
  document.getElementById("wizardSteps").innerHTML = wizardSteps.map((step, index) => `
    <button type="button" class="${index === state.currentStep ? "active" : ""} ${index < state.currentStep ? "done" : ""}" data-step="${index}" ${index > state.currentStep ? "disabled" : ""}>
      <span>${index + 1}</span>
      <b>${step.title}</b>
      <small>${step.hint}</small>
    </button>
  `).join("");
}

function renderStepButtons() {
  const back = document.getElementById("backStepBtn");
  const next = document.getElementById("designBtn");
  const complete = stepIsComplete();
  back.classList.toggle("hidden", state.currentStep === 0);
  const finalStep = state.currentStep === wizardSteps.length - 1;
  next.textContent = finalStep && state.submitted ? "Submitted" : finalStep ? "Submit" : "Next";
  next.disabled = !complete || (finalStep && state.submitted);
  next.classList.toggle("submittedBtn", finalStep && state.submitted);
  next.setAttribute("aria-disabled", String(next.disabled));
  next.title = complete ? "" : "Complete the required fields to continue";
}

function stepIsComplete() {
  if (state.currentStep === 0) return Boolean(state.startDate && routeSequence().length && Number(state.nights) > 0 && state.contactName && validPhone(state.phone));
  if (state.currentStep === 1) return state.adults > 0 && state.rooms > 0 && Boolean(state.roomType) && agesComplete();
  if (state.currentStep === 2) return Boolean(state.roomType && state.rooms > 0 && routeSequence().every((city, index) => state.selectedHotels[stopKey(city, index)]));
  if (state.currentStep === 3) return Boolean(state.vehicle);
  return true;
}

function routeCards() {
  const options = [
    ...routePresets.map((item) => [item.id, item.label, `${item.sequence[0]} first then ${item.sequence.slice(1).join(", ")}`]),
    ["custom", "Custom (Other)", "Choose your own city sequence"]
  ];
  return `<div class="routeCards">${options.map(([id, label, hint]) => `
    <button type="button" class="routeCard ${state.routePresetId === id ? "active" : ""}" data-route-card="${id}">
      <b>${label}</b><small>${hint}</small>
    </button>
  `).join("")}</div>`;
}

function customRouteBuilder() {
  if (state.routePresetId !== "custom") return "";
  return `<div class="customRoute">
    <div><b>Tap cities below in your travel order:</b><button type="button" data-clear-custom>Clear</button></div>
    <div class="customRouteActions">
      <button type="button" data-add-city="Makkah">Add Makkah</button>
      <button type="button" data-add-city="Madinah">Add Madinah</button>
    </div>
    <div class="cityChips">${state.customSequence.map((city, index) => `<span>${city}<button type="button" data-remove-city="${index}">x</button></span>`).join("<em>-></em>")}</div>
  </div>`;
}

function nightsPerStop() {
  const plan = stopPlan();
  if (!plan.length || !Number(state.nights)) return "";
  return `<div class="nightsPanel"><b>Nights per Stop</b>${plan.map((stop) => `
    <div class="nightStop">
      <span><small>Stop ${stop.index + 1}</small>${stop.city}</span>
      <div class="stopNightControl">
        <button type="button" class="circleBtn" data-stop-night="${stop.index}" data-dir="-1" ${stop.nights <= 1 ? "disabled" : ""}>-</button>
        <strong>${stop.nights} night${stop.nights === 1 ? "" : "s"}</strong>
        <button type="button" class="circleBtn" data-stop-night="${stop.index}" data-dir="1">+</button>
      </div>
    </div>
  `).join("")}<small>Adjust nights here; total duration updates automatically.</small></div>`;
}

function hotelStopTabs() {
  const plan = stopPlan();
  if (!plan.length) return `<div class="emptySelect">Complete Dates step first</div>`;
  state.activeHotelStop = Math.min(state.activeHotelStop, plan.length - 1);
  return `<div class="hotelStopTabs">${plan.map((stop) => `
    <button type="button" class="${state.activeHotelStop === stop.index ? "active" : ""}" data-hotel-stop="${stop.index}">
      <b>${stop.city}</b><small>Stop ${stop.index + 1} - ${stop.nights} nights</small>
    </button>
  `).join("")}</div>`;
}

function transportOptions() {
  return `<div class="optionGrid">
    <button type="button" class="${state.transportMode === "full" ? "active" : ""}" data-transport-mode="full"><b>Full Transport</b><small>One vehicle for all transfers</small></button>
    <button type="button" class="${state.transportMode === "selective" ? "active" : ""}" data-transport-mode="selective"><b>Selective Transport</b><small>Pick sectors yourself</small></button>
  </div>`;
}

function reviewItineraryBlock() {
  const q = quote();
  return `<div class="reviewBlock">
    <h3>Day-by-Day Itinerary</h3>
    ${q.hotelLines.map((line, index) => `
      <div class="reviewDay"><b>${line.city}</b><small>${displayDate(line.checkIn)} to ${displayDate(line.checkOut)} - ${line.hotel ? line.hotel.name : "Hotel not selected"}</small></div>
    `).join("")}
  </div>`;
}

function quoteBreakdown(q = quote()) {
  return `
    <div class="breakRow"><span>Hotels</span><b>${q.hotelTotal ? "Included" : "Pending"}</b></div>
    <div class="breakRow"><span>Transport</span><b>${q.transportTotal ? "Included" : "Pending"}</b></div>
    <div class="breakRow"><span>Extras</span><b>${q.visaTotal + q.ziyaratTotal ? "Included" : "Not included"}</b></div>
    <div class="breakRow"><span>Package category</span><b>${q.packageCategory}</b></div>
    <div class="breakRow total"><span>Total</span><b>${money(q.total)}</b></div>
  `;
}

function defaultTransportSectors() {
  const sequence = routeSequence();
  const sectors = [];
  if (sequence[0] === "Makkah") sectors.push("JED APT-MAK HTL");
  if (sequence[0] === "Madinah") sectors.push("MED APT-MED HTL");
  for (let index = 0; index < sequence.length - 1; index += 1) {
    if (sequence[index] === "Makkah" && sequence[index + 1] === "Madinah") sectors.push("MAK HTL-MED HTL");
    if (sequence[index] === "Madinah" && sequence[index + 1] === "Makkah") sectors.push("MED HTL-MAK HTL");
  }
  if (sequence[sequence.length - 1] === "Makkah") sectors.push("MAK HTL-JED APT");
  if (sequence[sequence.length - 1] === "Madinah") sectors.push("MED HTL-MED APT");
  return [...new Set(sectors)];
}

function effectiveTransportSectors() {
  if (state.transportMode === "full") return defaultTransportSectors();
  return state.selectedSectors;
}

const sectorNames = {
  "JED APT-MAK HTL": "Jeddah Airport to Makkah Hotel",
  "MAK HTL-JED APT": "Makkah Hotel to Jeddah Airport",
  "MAK HTL-MED HTL": "Makkah Hotel to Madinah Hotel",
  "MED HTL-MAK HTL": "Madinah Hotel to Makkah Hotel",
  "JED APT-MED HTL": "Jeddah Airport to Madinah Hotel",
  "MED APT-MED HTL": "Madinah Airport to Madinah Hotel",
  "MED HTL-MED APT": "Madinah Hotel to Madinah Airport",
  "MAKKAH ZIYARAT": "Makkah Ziyarat Tour",
  "MADINA ZIYARAT": "Madinah Ziyarat Tour",
  "MAK HTL-TAIF ZIYARAT": "Makkah Hotel to Taif Ziyarat",
  "MAK HTL-MAK RAILWAY": "Makkah Hotel to Makkah Railway Station",
  "MED HTL-MED RAILWAY": "Madinah Hotel to Madinah Railway Station",
  "MAD TO MED (Via Badar)": "Madinah to Madinah via Badr",
  "JED APT-JED CITY": "Jeddah Airport to Jeddah City",
  "WADI JIN+MED ZIYARAT": "Wadi Jinn and Madinah Ziyarat",
  "WADI JIN ZIYARAT ONLY": "Wadi Jinn Ziyarat Only",
  "BADAR+MED ZIYARAT": "Badr and Madinah Ziyarat",
  "BADAR ZIYARAT ONLY": "Badr Ziyarat Only",
  "TAIF APT-MAK HTL": "Taif Airport to Makkah Hotel",
  "JORANA MEEQAT": "Jorana Meeqat Transfer",
  "MAK HTL-MASJID AYESHA": "Makkah Hotel to Masjid Ayesha"
};

function sectorDisplayName(sector) {
  return sectorNames[sector] || String(sector || "").replace(/\bAPT\b/g, "Airport").replace(/\bHTL\b/g, "Hotel").replace(/\bMED\b/g, "Madinah").replace(/\bMAK\b/g, "Makkah");
}

function readableTransportSectors() {
  return effectiveTransportSectors().map(sectorDisplayName);
}

function field(label, key, type, value, required = false, placeholder = "") {
  const min = type === "date" ? todayIso : type === "number" ? "1" : "";
  const phoneAttrs = key === "phone" ? `inputmode="tel" autocomplete="tel" maxlength="13" pattern="(\\+?92[0-9]{10}|03[0-9]{9})"` : "";
  return `<label class="field big ${type === "date" ? "dateField" : ""}"><span>${label} ${required ? "<b>*</b>" : ""}</span><input data-field="${key}" type="${type}" value="${value}" placeholder="${placeholder}" ${min ? `min="${min}"` : ""} ${phoneAttrs}></label>`;
}

function selectField(label, key, value, options, required = false) {
  return `<label class="field big"><span>${label} ${required ? "<b>*</b>" : ""}</span><select data-field="${key}">${options.map(([optionValue, optionLabel]) => `<option value="${optionValue}" ${optionValue === value ? "selected" : ""}>${optionLabel}</option>`).join("")}</select></label>`;
}

function counterPanel(title, rows) {
  return `<div class="miniPanel"><h3>${title}</h3>${rows.map(([label, key, min]) => `
    <div class="counterRow">
      <span>${label}</span>
      <button type="button" class="circleBtn" data-count="${key}" data-dir="-1">-</button>
      <strong>${state[key]}</strong>
      <button type="button" class="circleBtn" data-count="${key}" data-dir="1">+</button>
    </div>`).join("")}</div>`;
}

function roomsControl() {
  return `<div class="roomsControl">
    <span>Rooms</span>
    <div class="counterRow compactCounter">
      <button type="button" class="circleBtn" data-count="rooms" data-dir="-1">-</button>
      <strong>${state.rooms}</strong>
      <button type="button" class="circleBtn" data-count="rooms" data-dir="1">+</button>
    </div>
  </div>`;
}

function syncAgeArrays() {
  state.childAges = Array.from({ length: state.children }, (_, index) => state.childAges[index] || "");
  state.infantAges = Array.from({ length: state.infants }, (_, index) => state.infantAges[index] || "");
}

function agesComplete() {
  syncAgeArrays();
  return state.childAges.every((age) => age !== "") && state.infantAges.every((age) => age !== "");
}

function ageFields() {
  syncAgeArrays();
  const childRows = state.childAges.map((age, index) => `
    <label class="field ageField"><span>Child ${index + 1} age</span><select data-age-group="childAges" data-age-index="${index}">
      <option value="">Select age</option>
      ${Array.from({ length: 10 }, (_, item) => item + 2).map((year) => `<option value="${year}" ${String(age) === String(year) ? "selected" : ""}>${year} years</option>`).join("")}
    </select></label>
  `).join("");
  const infantRows = state.infantAges.map((age, index) => `
    <label class="field ageField"><span>Infant ${index + 1} age</span><select data-age-group="infantAges" data-age-index="${index}">
      <option value="">Select age</option>
      <option value="0" ${String(age) === "0" ? "selected" : ""}>Under 1 year</option>
      <option value="1" ${String(age) === "1" ? "selected" : ""}>1 year</option>
    </select></label>
  `).join("");
  if (!childRows && !infantRows) return "";
  return `<div class="agePanel">${childRows}${infantRows}</div>`;
}

function hotelPreview() {
  const plan = stopPlan();
  if (!plan.length) {
    return `<div class="field big previewOnly"><span>Available Hotels</span><div class="emptySelect">Select a route first</div></div>`;
  }
  const activeStop = plan[state.activeHotelStop] || plan[0];
  const sequence = [activeStop.city];
  return `<div class="field big previewOnly hotelChooser"><span>Available Hotels <b>*</b></span>
    ${sequence.map((city) => {
      const index = activeStop.index;
      const key = stopKey(city, index);
      const cityHotels = activeHotels().filter((hotel) => hotel.city === city);
      const categories = categoryOrder.filter((category) => cityHotels.some((hotel) => displayCategory(hotel.category) === category));
      const activeCategory = categories.includes(state.hotelCategory) ? state.hotelCategory : categories[0];
      const visibleHotels = cityHotels.filter((hotel) => displayCategory(hotel.category) === activeCategory);
      return `<div class="hotelStop"><h4>${city} stop ${index + 1}</h4>
      <div class="categoryTabs">${categories.map((category) => `<button type="button" class="${activeCategory === category ? "active" : ""}" data-category="${category}">${category}<small>${cityHotels.filter((hotel) => displayCategory(hotel.category) === category).length} hotels</small></button>`).join("")}</div>
      <div class="choiceGrid hotelChoices">
        ${visibleHotels.map((hotel) => `<button type="button" class="choiceCard ${state.selectedHotels[key] === hotel.id ? "active" : ""}" data-hotel-key="${key}" data-hotel="${hotel.id}">
          <img src="${hotelImage(hotel)}" alt="${hotel.name}">
          <span><b>${hotel.name}</b><small>${displayCategory(hotel.category)} - ${hotelRateLabel(hotel)}</small></span>
        </button>`).join("")}
      </div></div>`;
    }).join("")}
  </div>`;
}

function vehicleField() {
  const vehicles = activeVehicles();
  const selectedVehicle = state.vehicle ? vehicleRecord(state.vehicle) : null;
  return `<div class="field big transportField">
    <span>Vehicle <b>*</b></span>
    <div class="vehicleDropdown">
      <button type="button" class="vehicleTrigger ${selectedVehicle ? "" : "empty"}" data-vehicle-toggle>
        ${selectedVehicle?.photo ? `<img src="${selectedVehicle.photo}" alt="${selectedVehicle.name}">` : ""}
        <span><b>${selectedVehicle?.name || "Select vehicle"}</b><small>${selectedVehicle ? selectedVehicle.capacity || "Vehicle selected" : "Choose one vehicle for pricing"}</small></span>
      </button>
      <div class="vehicleMenu ${state.vehicleOpen ? "open" : ""}">
        ${vehicles.map((vehicle) => {
          return `<button type="button" class="${state.vehicle === vehicle.id ? "active" : ""}" data-vehicle-option="${vehicle.id}">
            <img src="${vehicle.photo || vehicleImages.Car.src}" alt="${vehicle.name}">
            <span><b>${vehicle.name}</b><small>${vehicle.capacity || ""}</small></span>
          </button>`;
        }).join("")}
      </div>
    </div>
  </div>`;
}

function transportField() {
  if (state.transportMode !== "selective") return "";
  const selectedSectors = effectiveTransportSectors();
  return `<div class="field big transportSectors"><span>Transport Sectors</span>
    <div class="sectorList">
      ${activeTransportRates().map((item) => `<label class="sectorChoice ${selectedSectors.includes(item.sector) ? "active" : ""}">
        <input type="checkbox" data-sector="${item.sector}" ${selectedSectors.includes(item.sector) ? "checked" : ""} ${state.transportMode === "full" ? "disabled" : ""}>
        <span><b>${sectorDisplayName(item.sector)}</b><small>${item.sector} - ${state.vehicle ? `${vehicleLabel(state.vehicle)} selected` : "Select vehicle first"}</small></span>
      </label>`).join("")}
    </div>
  </div>`;
}

function extrasField() {
  return `<div class="miniPanel extrasPanel"><h3>Extras</h3>
    ${toggle("Visa Processing", "visa", "Optional service")}
    ${toggle("Ziyarat Tours", "ziarat", "Guided holy site visits")}
  </div>`;
}

function contactField() {
  return `<div class="contactGrid">
    ${field("Full Name", "contactName", "text", state.contactName, true, "Customer name")}
    ${field("WhatsApp Number", "phone", "tel", state.phone, true, "+923001234567")}
  </div>`;
}

function toggle(label, key, hint) {
  return `<label class="toggleLine"><span><b>${label}</b><small>${hint}</small></span><input type="checkbox" data-field="${key}" ${state[key] ? "checked" : ""}></label>`;
}

function commitField(input) {
  const key = input.dataset.field;
  let value = input.type === "checkbox" ? input.checked : input.value;
  if (key === "startDate" && value && value < todayIso) {
    value = todayIso;
    input.value = todayIso;
  }
  if (key === "phone") {
    value = sanitizePhone(value);
    input.value = value;
  }
  if (["contactName", "phone"].includes(key)) {
    state[key] = value;
    renderSummary();
    renderStepButtons();
    return;
  }
  state[key] = input.type === "number" ? Math.max(0, Number(value)) : value;
  if (key === "vehicle") state.vehicleOpen = false;
  if (key === "nights") resetStopNights();
  if (key === "routePresetId") {
    state.selectedHotels = {};
    resetStopNights();
  }
  render();
}

function bind() {
  document.querySelectorAll("[data-route-card]").forEach((button) => {
    button.addEventListener("click", () => {
      state.routePresetId = button.dataset.routeCard;
      state.selectedHotels = {};
      state.selectedSectors = [];
      state.activeHotelStop = 0;
      state.hotelCategory = "Standard";
      resetStopNights();
      render();
    });
  });
  document.querySelectorAll("[data-add-city]").forEach((button) => {
    button.addEventListener("click", () => {
      state.customSequence.push(button.dataset.addCity);
      state.selectedHotels = {};
      state.selectedSectors = [];
      state.activeHotelStop = 0;
      resetStopNights();
      render();
    });
  });
  document.querySelectorAll("[data-remove-city]").forEach((button) => {
    button.addEventListener("click", () => {
      state.customSequence.splice(Number(button.dataset.removeCity), 1);
      if (!state.customSequence.length) state.customSequence = ["Makkah", "Madinah"];
      state.selectedHotels = {};
      state.selectedSectors = [];
      state.activeHotelStop = 0;
      resetStopNights();
      render();
    });
  });
  document.querySelector("[data-clear-custom]")?.addEventListener("click", () => {
    state.customSequence = [];
    state.selectedHotels = {};
    state.selectedSectors = [];
    state.activeHotelStop = 0;
    resetStopNights();
    render();
  });
  document.querySelectorAll("[data-hotel-stop]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeHotelStop = Number(button.dataset.hotelStop);
      state.hotelCategory = "Standard";
      render();
    });
  });
  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.hotelCategory = button.dataset.category;
      render();
    });
  });
  document.querySelectorAll("[data-transport-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.transportMode = button.dataset.transportMode;
      if (state.transportMode === "full" && !state.selectedSectors.length) {
        state.selectedSectors = defaultTransportSectors();
      }
      render();
    });
  });
  document.querySelector("[data-vehicle-toggle]")?.addEventListener("click", () => {
    state.vehicleOpen = !state.vehicleOpen;
    render();
  });
  document.querySelectorAll(".dateField").forEach((label) => {
    label.addEventListener("click", () => {
      const input = label.querySelector("input[type='date']");
      input?.focus();
      input?.showPicker?.();
    });
  });
  document.querySelectorAll("[data-vehicle-option]").forEach((button) => {
    button.addEventListener("click", () => {
      state.vehicle = button.dataset.vehicleOption;
      state.vehicleOpen = false;
      render();
    });
  });
  document.querySelectorAll("[data-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = Number(button.dataset.step);
      if (target <= state.currentStep) {
        if (target < wizardSteps.length - 1) state.submitted = false;
        state.currentStep = target;
        render();
      } else {
        return;
      }
    });
  });
  document.querySelectorAll("[data-field]").forEach((input) => {
    if (["contactName", "phone"].includes(input.dataset.field)) {
      input.addEventListener("input", (event) => commitField(event.currentTarget));
      input.addEventListener("keydown", (event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          commitField(event.currentTarget);
          focusAdjacentField(event.currentTarget, event.key === "ArrowRight" ? 1 : -1);
        }
      });
      return;
    }
    const eventName = input.type === "checkbox" || input.tagName === "SELECT" || input.type === "date" ? "change" : "change";
    input.addEventListener(eventName, (event) => commitField(event.currentTarget));
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commitField(event.currentTarget);
      }
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        commitField(event.currentTarget);
        focusAdjacentField(event.currentTarget, event.key === "ArrowRight" ? 1 : -1);
      }
    });
  });
  document.querySelectorAll("[data-age-group]").forEach((input) => {
    input.addEventListener("change", () => {
      state[input.dataset.ageGroup][Number(input.dataset.ageIndex)] = input.value;
      renderSummary();
      renderStepButtons();
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        focusAdjacentField(event.currentTarget, event.key === "ArrowRight" ? 1 : -1);
      }
    });
  });
  document.querySelectorAll("[data-stop-night]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.stopNight);
      const values = stopPlan().map((stop) => stop.nights);
      const next = Math.max(1, (values[index] || 1) + Number(button.dataset.dir));
      values[index] = next;
      state.stopNights = values;
      state.nights = values.reduce((sum, value) => sum + value, 0);
      render();
    });
  });
  document.querySelectorAll("[data-count]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.count;
      const min = key === "adults" || key === "rooms" ? 1 : 0;
      state[key] = Math.max(min, state[key] + Number(button.dataset.dir));
      if (key === "children" || key === "infants") syncAgeArrays();
      render();
    });
  });
  document.querySelectorAll("[data-hotel]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedHotels[button.dataset.hotelKey] = button.dataset.hotel;
      render();
    });
  });
  document.querySelectorAll("[data-sector]").forEach((input) => {
    input.addEventListener("change", () => {
      const sector = input.dataset.sector;
      state.selectedSectors = input.checked ? [...new Set([...state.selectedSectors, sector])] : state.selectedSectors.filter((item) => item !== sector);
      render();
    });
  });
}

function focusAdjacentField(current, direction = 1) {
  const fields = [...document.querySelectorAll("#wizardGrid input:not(:disabled), #wizardGrid select:not(:disabled), #wizardGrid button:not(:disabled)")].filter((item) => item.offsetParent !== null);
  const index = fields.indexOf(current);
  if (index < 0 || !fields.length) return;
  fields[(index + direction + fields.length) % fields.length].focus();
}

function showStepMessage() {
  return;
}

function renderSummary() {
  const q = quote();
  const sequence = routeSequence();
  const selectedHotels = Object.keys(state.selectedHotels).length;
  document.getElementById("price").textContent = money(q.total);
  document.getElementById("previewTitle").textContent = sequence.length ? `${sequence.join(" -> ")} Umrah Package` : "Umrah package estimate";
  document.getElementById("previewMeta").textContent = `${state.adults} adults - ${state.children} children - ${state.rooms} rooms - ${state.nights || 0} nights`;
  document.getElementById("summaryTags").innerHTML = [
    sequence.length ? sequence.join(" -> ") : "Route pending",
    state.startDate ? `Start ${displayDate(parseDate(state.startDate))}` : "Start date pending",
    state.nights ? `${state.nights} nights` : "Dates pending",
    selectedHotels ? `${selectedHotels} hotel stop${selectedHotels > 1 ? "s" : ""}` : "Hotels pending",
    vehicleLabel(state.vehicle) || "Vehicle pending",
    q.total ? money(q.total) : "Rs. 0"
  ].map((item) => `<span>${item}</span>`).join("");
  renderEstimateCard(q);
  renderItinerary(q);
}

function renderEstimateCard(q) {
  const sequence = routeSequence();
  const hotelsSelected = q.hotelLines.some((line) => line.hotel);
  const hasPrice = Boolean(hotelsSelected || q.transportTotal || q.total);
  document.getElementById("estimateCard").innerHTML = `
    <span>Estimated Cost</span>
    <strong class="${hasPrice ? "" : "placeholderCost"}">${hasPrice ? money(q.total) : "Your estimate appears once you reach the Hotels step"}</strong>
    <small>${hasPrice ? "Final price may vary based on availability" : "Continue filling in your trip details to see pricing."}</small>
    <div class="estimateRows">
      <p><span>Duration</span><b>${state.nights || 0} nights</b></p>
      <p><span>Cities</span><b>${sequence.length ? [...new Set(sequence)].join(", ") : "-"}</b></p>
      <p><span>Travelers</span><b>${state.adults + state.children} pax</b></p>
      <p><span>Visa</span><b>${state.visa ? "Included" : "Not included"}</b></p>
    </div>
    <div class="estimateBlock">
      <b>Stops & Hotels</b>
      ${q.hotelLines.length ? q.hotelLines.map((line, index) => `<p><span>${line.city} - Stop ${index + 1}</span><b>${line.hotel ? line.hotel.name : "Not selected"}</b></p>`).join("") : "<small>No route selected yet</small>"}
      <small>${state.rooms} x ${state.roomType || "room type"}</small>
    </div>
    <div class="estimateBlock">
      <b>Transport</b>
      <small>${state.transportMode === "full" ? "Full" : "Selective"} - ${vehicleLabel(state.vehicle) || "pick a vehicle"}</small>
      ${state.transportMode === "selective" && effectiveTransportSectors().length ? `<small>${readableTransportSectors().join(", ")}</small>` : ""}
    </div>
  `;
}

function renderItinerary(q = quote()) {
  const itinerary = document.getElementById("itinerary");
  const resultBar = document.getElementById("resultBar");
  if (!state.submitted || resultBar.classList.contains("hidden")) {
    itinerary.classList.add("hidden");
    document.getElementById("itineraryList").innerHTML = "";
    return;
  }
  itinerary.classList.remove("hidden");
  document.getElementById("itineraryList").innerHTML = `
    ${q.hotelLines.map((line, index) => `<article class="day">
      <img class="photo" src="${line.hotel ? hotelImage(line.hotel) : "./hotel-rate-sheet.jpeg"}" alt="${line.city}">
      <div class="timeline">
        <h3>${line.city}</h3>
        <ul>
      <li>${line.nights} night${line.nights === 1 ? "" : "s"} stay - ${displayDate(line.checkIn)} to ${displayDate(line.checkOut)}</li>
          <li>${line.hotel ? `${line.hotel.name} - ${displayCategory(line.hotel.category)}` : "Hotel not selected yet"}</li>
          <li>${line.stay?.hasMissingRates ? "Some nights need manual confirmation" : "Rates included in final estimate"}</li>
        </ul>
      </div>
    </article>`).join("")}
  `;
}

function viewItinerary() {
  state.submitted = true;
  saveDashboardLead(quote());
  document.getElementById("resultBar").classList.remove("hidden");
  renderItinerary(quote());
  renderStepButtons();
  document.getElementById("itinerary").scrollIntoView({ behavior: "smooth", block: "start" });
}

function nextStep() {
  if (state.currentStep < wizardSteps.length - 1) {
    if (!stepIsComplete()) {
      showStepMessage();
      return;
    }
    state.submitted = false;
    state.currentStep += 1;
    render();
    document.getElementById("designer").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  viewItinerary();
}

function previousStep() {
  state.submitted = false;
  state.leadSaved = false;
  state.currentStep = Math.max(0, state.currentStep - 1);
  render();
  document.getElementById("designer").scrollIntoView({ behavior: "smooth", block: "start" });
}

function pdfEscape(value) {
  return String(value).replace(/[\\()]/g, "\\$&").replace(/[^\x20-\x7E]/g, "");
}

function saveDashboardLead(q) {
  if (state.leadSaved) return;
  if (!state.contactName && !state.phone) return;
  const lead = {
    id: `L-${Date.now()}`,
    name: state.contactName || "Walk-in customer",
    phone: state.phone || "Not provided",
    route: routeSequence().join(" -> ") || "Not selected",
    date: state.startDate || "Not selected",
    hotels: q.hotelLines.map((line) => line.hotel?.name).filter(Boolean).join(", ") || "Not selected",
    total: money(q.total),
    status: "Quoted",
    createdAt: new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  };
  const saved = JSON.parse(localStorage.getItem("umrahLeads") || "[]");
  localStorage.setItem("umrahLeads", JSON.stringify([lead, ...saved]));
  state.leadSaved = true;
}

async function downloadPdf() {
  const q = quote();
  saveDashboardLead(q);
  const logo = await loadPdfLogo("./toursinpakistan-logo.png?v=1");
  const pdfBytes = buildBrandedPdf(q, logo);
  const url = URL.createObjectURL(new Blob([pdfBytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  const customerName = (state.contactName || "Customer").trim().replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ");
  const todayLabel = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
  link.download = `${customerName} - Umrah Tour ${todayLabel}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function loadPdfLogo(src) {
  try {
    const response = await fetch(src);
    if (!response.ok) return null;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0);
      const jpegBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!jpegBlob) return null;
      return {
        bytes: new Uint8Array(await jpegBlob.arrayBuffer()),
        width: canvas.width,
        height: canvas.height
      };
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return null;
  }
}

function buildBrandedPdf(q, logo) {
  const settings = localSettings();
  const logoBytes = logo?.bytes || null;
  const travelers = state.adults + state.children;
  const hotelRows = q.hotelLines.map((line) => {
    const dates = `${displayDate(line.checkIn)} to ${displayDate(line.checkOut)}`;
    return `${line.city}: ${line.hotel ? line.hotel.name : "Not selected"} | ${line.nights} nights | ${dates}`;
  });
  const itineraryRows = q.hotelLines.map((line) => `${line.city} stay from ${displayDate(line.checkIn)} to ${displayDate(line.checkOut)} at ${line.hotel ? line.hotel.name : "selected hotel pending confirmation"}.`);
  const transportRows = [
    `Vehicle: ${vehicleLabel(state.vehicle) || "Not selected"}`,
    `Mode: ${state.transportMode === "full" ? "Full transport" : "Selective transport"}`,
    `Sectors: ${readableTransportSectors().join(", ") || "Not selected"}`
  ];
  const rules = [
    "Rates are subject to availability at the time of final booking and may change without prior notice.",
    "Hotel check-in and check-out policies are controlled by the selected hotel.",
    "Room bedding, view, floor and exact allocation remain subject to hotel confirmation.",
    "Saudi weekend pricing is applied for Friday and Saturday where weekend rates are supplied.",
    "Transport waiting time, parking, luggage handling and route changes may create extra charges.",
    "Jeddah Hajj terminal parking or airport parking charges are not included unless stated in writing.",
    "Visa approval is subject to Saudi authorities and passport validity requirements.",
    "Passport bio page copy must be clear and passport should normally have at least 6 months validity.",
    "Any force majeure, airline schedule change, hotel overbooking, government rule change or road closure is outside agency control.",
    "Final confirmation is issued only after payment clearance and supplier confirmation."
  ];
  const paymentRules = [
    "This quotation is an estimate, not a confirmed booking.",
    "Advance payment is required to block hotels and transport.",
    "Balance payment must be cleared before travel document delivery.",
    "Cancellation, refund and date-change penalties depend on hotel, transport and visa supplier policy.",
    settings.pdfNote || "Final price may vary based on availability and confirmation."
  ];

  const pages = [];
  let commands = [];
  let y = 696;
  const margin = 44;
  const pageBottom = 58;
  const green = "0.05 0.36 0.26";
  const black = "0.06 0.09 0.14";
  const muted = "0.33 0.41 0.52";

  const add = (cmd) => commands.push(cmd);
  const text = (value, x, yy, size = 10, font = "F1", color = black) => add(`${color} rg BT /${font} ${size} Tf ${x} ${yy} Td (${pdfEscape(value)}) Tj ET`);
  const line = (x1, yy, x2, color = "0.86 0.86 0.84") => add(`${color} RG ${x1} ${yy} m ${x2} ${yy} l S`);
  const wrap = (value, maxChars) => {
    const words = pdfEscape(value).split(/\s+/);
    const rows = [];
    let row = "";
    words.forEach((word) => {
      if (`${row} ${word}`.trim().length > maxChars) {
        rows.push(row);
        row = word;
      } else {
        row = `${row} ${word}`.trim();
      }
    });
    if (row) rows.push(row);
    return rows;
  };
  const newPage = () => {
    pages.push(commands.join("\n"));
    commands = [];
    y = 696;
  };
  const ensure = (height) => {
    if (y - height < pageBottom) {
      footer();
      newPage();
      header(false);
    }
  };
  const heading = (value) => {
    ensure(38);
    text(value, margin, y, 13, "F2", green);
    y -= 10;
    line(margin, y, 551, "0.05 0.36 0.26");
    y -= 18;
  };
  const row = (label, value) => {
    ensure(18);
    text(label, margin, y, 9, "F2", muted);
    text(value, 210, y, 9, "F1", black);
    y -= 16;
  };
  const bullets = (items) => {
    items.forEach((item) => {
      wrap(item, 92).forEach((part, index) => {
        ensure(14);
        text(index ? part : `- ${part}`, margin + (index ? 12 : 0), y, 9, "F1", black);
        y -= 13;
      });
    });
    y -= 4;
  };
  const header = (first = false) => {
    add(`${green} rg 0 792 595 50 re f`);
    add("1 1 1 rg 0 742 595 50 re f");
    if (logoBytes) add("q 92 0 0 48 42 744 cm /Logo Do Q");
    text("TOURS IN PAKISTAN", 44, 814, 18, "F2", "1 1 1");
    text("Umrah Package Quotation", 44, 796, 10, "F1", "1 1 1");
    text(first ? "Prepared quotation" : "Quotation details", 430, 762, 10, "F2", green);
    text(new Date().toLocaleDateString("en-GB"), 430, 748, 9, "F1", muted);
  };
  const footer = () => {
    line(44, 40, 551);
    text("Tours in Pakistan | Final booking subject to availability, supplier confirmation and payment clearance.", 44, 24, 8, "F1", muted);
  };

  header(true);
  heading("Customer & Package Summary");
  row("Customer", state.contactName || "Not provided");
  row("Phone / WhatsApp", state.phone || "Not provided");
  row("Route", routeSequence().join(" -> ") || "Not selected");
  row("Travel Date", state.startDate || "Not selected");
  row("Duration", `${state.nights || 0} nights`);
  row("Travelers", `${state.adults} adults, ${state.children} children, ${state.infants} infants`);
  row("Rooms", `${state.rooms} x ${state.roomType || "Not selected"}`);
  y -= 6;
  add("0.95 0.97 0.96 rg 44 510 507 58 re f");
  text("Estimated Total", 60, 548, 11, "F2", green);
  text(money(q.total), 60, 524, 22, "F2", green);
  text("Final price may vary based on availability and confirmation.", 285, 530, 9, "F1", muted);
  y = 484;

  heading("Hotels");
  bullets(hotelRows);
  heading("Transport");
  bullets(transportRows);
  heading("Extras");
  bullets([
    `Visa: ${state.visa ? "Included" : "Not included"}`,
    `Ziyarat: ${state.ziyarat ? "Included" : "Not included"}`
  ]);
  footer();
  newPage();

  header(false);
  heading("Day-by-Day Itinerary");
  bullets([
    ...itineraryRows,
    "Free time for prayers, personal worship and local movement according to hotel location.",
    "Hotel check-out according to the confirmed booking schedule."
  ]);
  heading("Rules & Regulations");
  bullets(rules);
  heading("Payment & Cancellation Notes");
  bullets(paymentRules);
  heading("Important Notes");
  bullets([
    "This PDF is generated from current portal data and dashboard pricing settings.",
    "Hotel seasonal rates are calculated night-by-night according to the selected travel dates.",
    "Any missing supplier rate will show as pending and must be confirmed manually before booking.",
    "Please verify passenger names, passport details, travel dates and route before payment."
  ]);
  footer();
  pages.push(commands.join("\n"));

  const imageObjectCount = logoBytes ? 1 : 0;
  const font1 = 3 + pages.length;
  const font2 = font1 + 1;
  const logoObj = logoBytes ? font2 + 1 : null;
  const objectParts = [];
  objectParts.push(ascii("<< /Type /Catalog /Pages 2 0 R >>"));
  objectParts.push(ascii(`<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index} 0 R`).join(" ")}] /Count ${pages.length} >>`));
  pages.forEach((pageContent, index) => {
    const contentObj = font2 + imageObjectCount + 1 + index;
    const logoResource = logoBytes ? `/XObject << /Logo ${logoObj} 0 R >>` : "";
    objectParts.push(ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> ${logoResource} >> /Contents ${contentObj} 0 R >>`));
  });
  objectParts.push(ascii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"));
  objectParts.push(ascii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"));
  if (logoBytes) {
    objectParts.push(combineBytes([
      ascii(`<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logoBytes.length} >>\nstream\n`),
      logoBytes,
      ascii("\nendstream")
    ]));
  }
  pages.forEach((pageContent) => {
    objectParts.push(ascii(`<< /Length ${ascii(pageContent).length} >>\nstream\n${pageContent}\nendstream`));
  });
  return writePdfObjects(objectParts);
}

function ascii(value) {
  return new TextEncoder().encode(value);
}

function combineBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    out.set(part, offset);
    offset += part.length;
  });
  return out;
}

function writePdfObjects(objects) {
  const parts = [ascii("%PDF-1.4\n")];
  const offsets = [0];
  let length = parts[0].length;
  objects.forEach((object, index) => {
    offsets.push(length);
    const prefix = ascii(`${index + 1} 0 obj\n`);
    const suffix = ascii("\nendobj\n");
    parts.push(prefix, object, suffix);
    length += prefix.length + object.length + suffix.length;
  });
  const xrefOffset = length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  xref += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  parts.push(ascii(xref));
  return combineBytes(parts);
}

document.getElementById("designBtn").addEventListener("click", nextStep);
document.getElementById("backStepBtn").addEventListener("click", previousStep);
document.getElementById("editTripBtn").addEventListener("click", () => document.getElementById("designer").scrollIntoView({ behavior: "smooth" }));
document.getElementById("pdfBtn").addEventListener("click", downloadPdf);

render();
