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
  const select = $("#search-genere");
  const generi = [...new Set(catalogo.map(l => l.genere))].sort();
  // Rimuove le option esistenti tranne la prima ("— Tutti —")
  while (select.options.length > 1) select.remove(1);
  for (const g of generi) {
    const opt = document.createElement("option");
    opt.value = g;
    opt.textContent = g;
    select.appendChild(opt);
  }
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
  $("#clock").textContent = `${ore}  —  ${data.charAt(0).toUpperCase() + data.slice(1)}`;
}

// ===== 2. HOME — RIPRENDI LETTURA =====
function checkRiprendiLettura() {
  const libro = localStorage.getItem("ultimoLibro");
  const pos = localStorage.getItem("ultimaPosizione");
  const btn = $("#btn-riprendi");
  if (libro && pos) {
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

// ===== 5. LETTORE EPUB =====
let currentBook = null;
let currentRendition = null;
let paginatedMode = true;

async function apriLibro(libro) {
  // Quando si riprende, libro è ricostruito da localStorage
  if (typeof libro === "string") {
    const file = localStorage.getItem("ultimoFile");
    if (!file) return;
    libro = { titolo: libro, file: file };
  }

  $("#reader-title").textContent = libro.titolo;
  navigateTo("reader");

  const viewer = document.getElementById("epub-viewer");
  viewer.innerHTML = "<p>Caricamento in corso...</p>";

  if (currentBook) {
    currentBook.destroy();
  }

  // Aspetta che la vista sia visibile
  await new Promise(resolve => setTimeout(resolve, 300));

  viewer.innerHTML = "";

  try {
    currentBook = ePub(libro.file);

    currentBook.ready.then(() => {
      console.log("Book ready:", currentBook.packaging.metadata.title);
    }).catch(err => {
      console.error("Book ready error:", err);
      viewer.innerHTML = "<p>Errore book.ready: " + err + "</p>";
    });

    currentRendition = currentBook.renderTo(viewer, {
      width: viewer.clientWidth,
      height: viewer.clientHeight,
      spread: "none"
    });

    renditionDisplay(libro);

  } catch (err) {
    console.error("Errore generale:", err);
    viewer.innerHTML = "<p>Errore: " + err.message + "</p>";
  }
}

function renditionDisplay(libro) {
  // Se stiamo riprendendo questo libro, vai alla posizione salvata
  const savedBook = localStorage.getItem("ultimoLibro");
  const savedPos = localStorage.getItem("ultimaPosizione");
  const cfi = (savedBook === libro.titolo && savedPos) ? savedPos : undefined;

  currentRendition.display(cfi).then(() => {
    console.log("Displayed successfully");
  }).catch(err => {
    console.error("Display error:", err);
    document.getElementById("epub-viewer").innerHTML = "<p>Errore display: " + err + "</p>";
  });

  // Salva posizione ad ogni cambio pagina
  currentRendition.on("relocated", (location) => {
    if (location && location.start && location.start.cfi) {
      localStorage.setItem("ultimaPosizione", location.start.cfi);
      localStorage.setItem("ultimoLibro", libro.titolo);
      localStorage.setItem("ultimoFile", libro.file);
    }
  });

  applyReaderTheme();
}

function applyReaderTheme() {
  if (!currentRendition) return;
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  if (isDark) {
    currentRendition.themes.default({ body: { color: "#e0e0e0", background: "#1a1a2e" } });
  } else {
    currentRendition.themes.default({ body: { color: "#1a1a2e", background: "#f5f5f0" } });
  }
}

function toggleReaderMode() {
  paginatedMode = !paginatedMode;
  if (currentRendition) {
    currentRendition.flow(paginatedMode ? "paginated" : "scrolled-doc");
  }
}

// ===== EVENT LISTENERS =====
function initEvents() {
  // Home
  $("#theme-toggle").addEventListener("click", toggleTheme);
  $("#btn-nuovo").addEventListener("click", () => navigateTo("search"));
  $("#btn-riprendi").addEventListener("click", () => {
    const libro = localStorage.getItem("ultimoLibro");
    if (libro) apriLibro(libro);
  });

  // Ricerca
  $("#search-back").addEventListener("click", () => navigateTo("home"));
  $("#btn-cerca").addEventListener("click", cercaLibri);
  // Enter per cercare
  $("#search-titolo").addEventListener("keydown", (e) => { if (e.key === "Enter") cercaLibri(); });
  $("#search-autore").addEventListener("keydown", (e) => { if (e.key === "Enter") cercaLibri(); });

  // Lettore
  $("#reader-back").addEventListener("click", () => {
    if (currentBook) {
      currentBook.destroy();
      currentBook = null;
      currentRendition = null;
    }
    navigateTo("search");
  });
  $("#reader-mode-toggle").addEventListener("click", toggleReaderMode);
  $("#prev-page").addEventListener("click", () => { if (currentRendition) currentRendition.prev(); });
  $("#next-page").addEventListener("click", () => { if (currentRendition) currentRendition.next(); });

  // Navigazione da tastiera nel lettore
  document.addEventListener("keydown", (e) => {
    if (!views.reader.classList.contains("active") || !currentRendition) return;
    if (e.key === "ArrowLeft") currentRendition.prev();
    if (e.key === "ArrowRight") currentRendition.next();
  });
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  initSplash();
  initEvents();
  checkRiprendiLettura();
  updateClock();
  setInterval(updateClock, 1000);
  await caricaCatalogo();
});
