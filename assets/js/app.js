/* ========= Utilities ========= */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const isNum = (v) => v !== null && v !== "" && !isNaN(Number(v));

function showError(msg) {
  const box = $("#inputErrors");
  box.textContent = msg || "";
}

function copyFrom(codeId) {
  const el = document.getElementById(codeId);
  if (!el) return;
  const text = el.textContent.trim();
  if (!text || text === "–") return;
  navigator.clipboard.writeText(text).then(() => {
    // Optional: tiny feedback
  });
}

/* ========= Map (Leaflet) ========= */

const map = L.map("map", {
  zoomControl: true,
  attributionControl: true,
}).setView([40.4093, 49.8671], 11); // Default: Baku

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 20,
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

L.control.scale({ metric: true, imperial: false }).addTo(map);

let marker = null;
let lastClickLatLng = null;

map.on("click", (e) => {
  lastClickLatLng = e.latlng;
  placeMarker(e.latlng.lat, e.latlng.lng);
  updateOutputs(e.latlng.lat, e.latlng.lng);
});

function placeMarker(lat, lng) {
  if (!marker) {
    marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    marker.on("dragend", (ev) => {
      const p = ev.target.getLatLng();
      updateOutputs(p.lat, p.lng);
    });
  } else {
    marker.setLatLng([lat, lng]);
  }
  map.setView([lat, lng], Math.max(map.getZoom(), 12));
}

/* ========= Theme ========= */

const root = document.documentElement;
const themeToggle = $("#themeToggle");
const savedTheme = localStorage.getItem("theme") || "dark";
if (savedTheme === "light") root.classList.add("light");
themeToggle.addEventListener("click", () => {
  root.classList.toggle("light");
  localStorage.setItem("theme", root.classList.contains("light") ? "light" : "dark");
});

/* ========= Format Switching ========= */

const formatSelect = $("#inputFormat");
const formBlocks = $$(".form-block");

formatSelect.addEventListener("change", () => {
  formBlocks.forEach(b => b.classList.add("hidden"));
  const chosen = formatSelect.value;
  const block = document.querySelector(`.form-block[data-form="${chosen}"]`);
  if (block) block.classList.remove("hidden");
  showError("");
});

/* ========= Conversions ========= */

// DD -> DMS
function ddToDms(dd, isLat = true) {
  const hemi = isLat ? (dd >= 0 ? "N" : "S") : (dd >= 0 ? "E" : "W");
  const abs = Math.abs(dd);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = (minFloat - min) * 60;
  return { deg, min, sec, hemi };
}

// DMS -> DD
function dmsToDd(deg, min, sec, hemi, isLat = true) {
  if (![deg, min, sec].every(isNum)) return null;
  const d = Math.abs(Number(deg));
  const m = Math.abs(Number(min));
  const s = Math.abs(Number(sec));
  if (m >= 60 || s >= 60) return null;
  let sign = 1;
  if (isLat && (hemi === "S")) sign = -1;
  if (!isLat && (hemi === "W")) sign = -1;
  const val = d + (m / 60) + (s / 3600);
  return sign * val;
}

// DD -> DDM
function ddToDdm(dd, isLat = true) {
  const hemi = isLat ? (dd >= 0 ? "N" : "S") : (dd >= 0 ? "E" : "W");
  const abs = Math.abs(dd);
  const deg = Math.floor(abs);
  const decMin = (abs - deg) * 60;
  return { deg, decMin, hemi };
}

// DDM -> DD
function ddmToDd(deg, decMin, hemi, isLat = true) {
  if (![deg, decMin].every(isNum)) return null;
  const d = Math.abs(Number(deg));
  const m = Math.abs(Number(decMin));
  if (m >= 60) return null;
  let sign = 1;
  if (isLat && (hemi === "S")) sign = -1;
  if (!isLat && (hemi === "W")) sign = -1;
  return sign * (d + m / 60);
}

// Determine UTM zone with Norway/Svalbard exceptions
function lonToUtmZone(lon, lat) {
  let zone = Math.floor((lon + 180) / 6) + 1;
  // Norway exception
  if (lat >= 56 && lat < 64 && lon >= 3 && lon < 12) zone = 32;
  // Svalbard exceptions
  if (lat >= 72 && lat < 84) {
    if (lon >= 0 && lon < 9) zone = 31;
    else if (lon >= 9 && lon < 21) zone = 33;
    else if (lon >= 21 && lon < 33) zone = 35;
    else if (lon >= 33 && lon < 42) zone = 37;
  }
  return zone;
}

// DD -> UTM using proj4
function ddToUtm(lat, lon) {
  const zone = lonToUtmZone(lon, lat);
  const south = lat < 0;
  const utmProj = `+proj=utm +zone=${zone} ${south ? "+south " : ""}+datum=WGS84 +units=m +no_defs`;
  const [E, N] = proj4("EPSG:4326", utmProj, [lon, lat]);
  return { zone, hemi: south ? "S" : "N", E, N };
}

// UTM -> DD using proj4
function utmToDd(zone, hemi, E, N) {
  if (![zone, E, N].every(isNum)) return null;
  const south = (hemi || "N").toUpperCase() === "S";
  const utmProj = `+proj=utm +zone=${Number(zone)} ${south ? "+south " : ""}+datum=WGS84 +units=m +no_defs`;
  const [lon, lat] = proj4(utmProj, "EPSG:4326", [Number(E), Number(N)]);
  return { lat, lon };
}

/* ========= Output Rendering ========= */

function fmt(n, digits = 6) {
  return Number(n).toFixed(digits);
}
function fmtSec(n) { return Number(n).toFixed(2); }
function fmtMin(n) { return Number(n).toFixed(4); }

function renderAll(lat, lon) {
  // Clamp lat/lon to valid ranges (safety)
  lat = clamp(lat, -90, 90);
  lon = clamp(lon, -180, 180);

  // DD
  const ddStr = `Lat ${fmt(lat, 6)}, Lng ${fmt(lon, 6)}`;
  $("#outDD").textContent = ddStr;

  // DMS
  const latDMS = ddToDms(lat, true);
  const lonDMS = ddToDms(lon, false);
  const dmsStr = `${latDMS.deg}° ${latDMS.min}' ${fmtSec(latDMS.sec)}" ${latDMS.hemi}, ` +
                 `${lonDMS.deg}° ${lonDMS.min}' ${fmtSec(lonDMS.sec)}" ${lonDMS.hemi}`;
  $("#outDMS").textContent = dmsStr;

  // DDM
  const latDDM = ddToDdm(lat, true);
  const lonDDM = ddToDdm(lon, false);
  const ddmStr = `${latDDM.deg}° ${fmtMin(latDDM.decMin)}' ${latDDM.hemi}, ` +
                 `${lonDDM.deg}° ${fmtMin(lonDDM.decMin)}' ${lonDDM.hemi}`;
  $("#outDDM").textContent = ddmStr;

  // UTM
  const utm = ddToUtm(lat, lon);
  const utmStr = `Zone ${utm.zone}${utm.hemi}, E ${fmt(utm.E, 2)} m, N ${fmt(utm.N, 2)} m`;
  $("#outUTM").textContent = utmStr;
}

/* ========= Read inputs & Convert ========= */

function readFromDD() {
  const lat = Number($("#ddLat").value.trim());
  const lng = Number($("#ddLng").value.trim());
  if (!isFinite(lat) || !isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function readFromDMS() {
  const latDeg = $("#dmsLatDeg").value.trim();
  const latMin = $("#dmsLatMin").value.trim();
  const latSec = $("#dmsLatSec").value.trim();
  const latHem = $("#dmsLatHem").value;

  const lngDeg = $("#dmsLngDeg").value.trim();
  const lngMin = $("#dmsLngMin").value.trim();
  const lngSec = $("#dmsLngSec").value.trim();
  const lngHem = $("#dmsLngHem").value;

  const lat = dmsToDd(latDeg, latMin, latSec, latHem, true);
  const lng = dmsToDd(lngDeg, lngMin, lngSec, lngHem, false);
  if (lat == null || lng == null) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function readFromDDM() {
  const latDeg = $("#ddmLatDeg").value.trim();
  const latMin = $("#ddmLatMin").value.trim();
  const latHem = $("#ddmLatHem").value;

  const lngDeg = $("#ddmLngDeg").value.trim();
  const lngMin = $("#ddmLngMin").value.trim();
  const lngHem = $("#ddmLngHem").value;

  const lat = ddmToDd(latDeg, latMin, latHem, true);
  const lng = ddmToDd(lngDeg, lngMin, lngHem, false);
  if (lat == null || lng == null) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function readFromUTM() {
  const zone = $("#utmZone").value.trim();
  const hemi = $("#utmHem").value;
  const E = $("#utmE").value.trim();
  const N = $("#utmN").value.trim();

  const res = utmToDd(zone, hemi, E, N);
  if (!res) return null;
  const { lat, lon } = res;
  if (!isFinite(lat) || !isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lng: lon };
}

/* ========= Actions ========= */

function updateOutputs(lat, lng) {
  showError("");
  renderAll(lat, lng);
  placeMarker(lat, lng);
}

$("#btnConvert").addEventListener("click", (e) => {
  e.preventDefault();
  showError("");
  const fmt = formatSelect.value;

  let pair = null;
  if (fmt === "dd") pair = readFromDD();
  if (fmt === "dms") pair = readFromDMS();
  if (fmt === "ddm") pair = readFromDDM();
  if (fmt === "utm") pair = readFromUTM();

  if (!pair) {
    showError("Invalid input. Please check fields and try again.");
    return;
  }
  updateOutputs(pair.lat, pair.lng);
});

$("#btnFromMap").addEventListener("click", (e) => {
  e.preventDefault();
  if (!lastClickLatLng && !marker) {
    showError("Click on the map first to pick a location.");
    return;
  }
  const p = marker ? marker.getLatLng() : lastClickLatLng;
  updateOutputs(p.lat, p.lng);
});

// Copy buttons
$$(".copy").forEach(btn => {
  btn.addEventListener("click", () => {
    const id = btn.getAttribute("data-copy");
    copyFrom(id);
  });
});

// Year in footer
$("#year").textContent = new Date().getFullYear();
