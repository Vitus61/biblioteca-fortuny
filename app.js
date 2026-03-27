/* ===================================================
   Biblioteca Digitale — IIS Fortuny-Moretto
   app.js — Navigazione viste e logica applicativa
   =================================================== */

// ===== CATALOGO LOCALE =====
let catalogo = [];

async function caricaCatalogo() {
  const resp = await fetch("catalogo.json");
  const data = await resp.json();
  catalogo = data.libri;
  popolaGeneri();
}

function popolaGeneri() {
  const select = document.getElementById("search-genere");
  select.innerHTML = '<option value="">— Tutti —</option>';
  const generi = [...new Set(catalogo.map(l => l.genere))].sort();
  generi.forEach(genere => {
    const opt = document.createElement("option");
    opt.value = genere;
    opt.textContent = genere;
    select.appendChild(opt);
  });
}

// ===== ELEMENTI DOM =====
const $ = (sel) => document.querySelector(sel);
const views = {
  splash: $("#splash"),
  home:   $("#home"),
  search: $("#search"),
  reader: $("#reader")
};

// ===== NAVIGAZIONE VISTE =====
function navigateTo(viewName) {
  const current = document.querySelector(".view.active");
  const target = views[viewName];
  if (!target || current === target) return;

  current.classList.add("fade-out");
  current.addEventListener("animationend", function handler() {
    current.removeEventListener("animationend", handler);
    current.classList.remove("active", "fade-out");
    target.classList.add("active", "fade-in");
    target.addEventListener("animationend", function h2() {
      target.removeEventListener("animationend", h2);
      target.classList.remove("fade-in");
    });
  });
}

// ===== 1. SPLASH → HOME (dopo 2.5s) =====
function initSplash() {
  setTimeout(() => navigateTo("home"), 2500);
}

// ===== 2. HOME — OROLOGIO =====
function updateClock() {
  const now = new Date();
  const ore = now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const data = now.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  document.getElementById("clock-time").textContent = ore;
  document.getElementById("clock-date").textContent = data.charAt(0).toUpperCase() + data.slice(1);
}

// ===== 2. HOME — RIPRENDI LETTURA =====
function checkRiprendiLettura() {
  const libro = localStorage.getItem("ultimoLibro");
  const file = localStorage.getItem("ultimoFile");
  const btn = $("#btn-riprendi");
  if (libro && file) {
    btn.disabled = false;
    btn.title = `Riprendi: ${libro}`;
  } else {
    btn.disabled = true;
    btn.title = "Nessuna lettura in corso";
  }
}

// ===== 3. TEMA CHIARO / SCURO =====
function initTheme() {
  const saved = localStorage.getItem("tema");
  if (saved === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
    toggleThemeIcons(true);
  }
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  if (isDark) {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("tema", "light");
    toggleThemeIcons(false);
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("tema", "dark");
    toggleThemeIcons(true);
  }
}

function toggleThemeIcons(dark) {
  $("#icon-sun").classList.toggle("hidden", dark);
  $("#icon-moon").classList.toggle("hidden", !dark);
}

// ===== 4. RICERCA CATALOGO LOCALE =====
function cercaLibri() {
  const genere = $("#search-genere").value;
  const autore = $("#search-autore").value.trim();
  const titolo = $("#search-titolo").value.trim();
  const container = $("#search-results");

  if (!genere && !autore && !titolo) {
    container.innerHTML = '<p class="result-empty">Inserisci almeno un criterio di ricerca.</p>';
    return;
  }

  const risultati = catalogo.filter(libro => {
    const matchGenere = !genere || libro.genere === genere;
    const matchAutore = !autore || libro.autore.toLowerCase().includes(autore.toLowerCase());
    const matchTitolo = !titolo || libro.titolo.toLowerCase().includes(titolo.toLowerCase());
    return matchGenere && matchAutore && matchTitolo;
  });

  renderResults(risultati);
}

function renderResults(risultati) {
  const container = $("#search-results");
  if (risultati.length === 0) {
    container.innerHTML = '<p class="result-empty">Nessun risultato trovato.</p>';
    return;
  }

  container.innerHTML = "";
  for (const libro of risultati) {
    const div = document.createElement("div");
    div.className = "result-item";
    div.innerHTML = `
      <div class="result-title">${libro.titolo}</div>
      <div class="result-author">${libro.autore} · ${libro.genere} · ${libro.anno}</div>`;
    div.addEventListener("click", () => apriLibro(libro));
    container.appendChild(div);
  }
}

// ===== 5. LETTORE BIBI =====

function apriLibro(libro) {
  if (typeof libro === "string") {
    const file = localStorage.getItem("ultimoFile");
    if (!file) return;
    libro = { titolo: libro, file: file };
  }

  $("#reader-title").textContent = libro.titolo;
  localStorage.setItem("ultimoLibro", libro.titolo);
  localStorage.setItem("ultimoFile", libro.file);
  navigateTo("reader");

  const frame = document.getElementById("bibi-frame");
  frame.src = "bibi/index.html?book=../" + libro.file;
  document.getElementById("istituto-label").style.display = "block";
}

// ===== EVENT LISTENERS =====
function initEvents() {
  // Home
  $("#theme-toggle").addEventListener("click", toggleTheme);
  $("#btn-nuovo").addEventListener("click", () => navigateTo("search"));
  $("#btn-riprendi").addEventListener("click", () => {
    const titolo = localStorage.getItem("ultimoLibro");
    if (!titolo) return;
    const libro = catalogo.find(l => l.titolo === titolo);
    if (libro) {
      apriLibro(libro);
    } else {
      const file = localStorage.getItem("ultimoFile");
      if (file) apriLibro({ titolo: titolo, file: file });
    }
  });

  // Ricerca
  $("#search-back").addEventListener("click", () => navigateTo("home"));
  $("#btn-cerca").addEventListener("click", cercaLibri);
  $("#search-titolo").addEventListener("keydown", (e) => { if (e.key === "Enter") cercaLibri(); });
  $("#search-autore").addEventListener("keydown", (e) => { if (e.key === "Enter") cercaLibri(); });

  // Lettore — indietro
  $("#reader-back").addEventListener("click", () => {
    document.getElementById("bibi-frame").src = "";
    document.getElementById("istituto-label").style.display = "none";
    checkRiprendiLettura();
    navigateTo("home");
  });
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  await caricaCatalogo();
  initSplash();
  initEvents();
  checkRiprendiLettura();
  updateClock();
  setInterval(updateClock, 1000);
});