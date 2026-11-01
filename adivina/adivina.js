// «Adivina el juego»: un juego al día, captura pixelada que se aclara y pistas que se desbloquean.
(function () {
  "use strict";

  const JUEGOS = window.ADIVINA_JUEGOS;
  const NOMBRES = window.ADIVINA_NOMBRES;
  const INICIO = "2026-11-01"; // día del juego #1
  const INTENTOS = 6;
  const PIXEL = [40, 26, 16, 10, 6, 3]; // tamaño del «píxel» según los intentos gastados
  const CLAVE = "pulsastart-adivina";
  const $ = (id) => document.getElementById(id);

  // ------------------------------------------------------------------ fecha y juego del día (hora de España)

  function hoyEnEspanya() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
  }
  function diasEntre(a, b) {
    const [y1, m1, d1] = a.split("-").map(Number);
    const [y2, m2, d2] = b.split("-").map(Number);
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
  }
  // Barajado fijo: el mismo orden para todo el mundo, distinto en cada vuelta a la lista
  function barajar(lista, semilla) {
    let s = semilla >>> 0;
    const rnd = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const a = lista.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const hoy = hoyEnEspanya();
  const dia = Math.max(0, diasEntre(INICIO, hoy));
  const numero = dia + 1;
  const vuelta = Math.floor(dia / JUEGOS.length);
  const juego = barajar(JUEGOS, 2026 + vuelta * 7919)[dia % JUEGOS.length];

  // ------------------------------------------------------------------ guardado (si el navegador lo permite)

  function leer() {
    try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { return {}; }
  }
  function guardar(datos) {
    try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch (e) { /* sin guardado: se juega igual */ }
  }
  const datos = leer();
  datos.stats = datos.stats || { jugadas: 0, ganadas: 0, racha: 0, mejor: 0, dist: [0, 0, 0, 0, 0, 0], ultimaGanada: 0 };
  if (!datos.partida || datos.partida.numero !== numero) {
    datos.partida = { numero, intentos: [], fin: false, ganada: false };
  }
  const partida = datos.partida;

  // ------------------------------------------------------------------ comparar respuestas

  function normal(t) {
    return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[™®:'’.,!?\-–—]/g, " ").replace(/^the\s+/, "").replace(/\s+/g, " ").trim();
  }
  const validas = new Set([juego.n, ...juego.a].map(normal));
  const nombresNorm = new Map(NOMBRES.map((n) => [normal(n), n]));
  // los alias («GTA V», «CS2»…) cuentan como el nombre del juego al que pertenecen
  JUEGOS.forEach((j) => j.a.forEach((a) => { if (!nombresNorm.has(normal(a))) nombresNorm.set(normal(a), j.n); }));
  [juego.n, ...juego.a].forEach((n) => nombresNorm.set(normal(n), juego.n));

  // ------------------------------------------------------------------ imagen pixelada

  const lienzo = $("adv-canvas");
  const ctx = lienzo.getContext("2d");
  const W = lienzo.width, H = lienzo.height;
  const img = new Image();
  let imgLista = false;
  img.onload = () => { imgLista = true; pintar(); };
  img.onerror = () => { $("adv-fallback").textContent = juego.e; $("adv-fallback").classList.remove("adv-hidden"); };
  img.src = juego.img;

  function pintar() {
    if (!imgLista) return;
    const bloque = partida.fin ? 0 : PIXEL[Math.min(partida.intentos.length, PIXEL.length - 1)];
    // recorte «cover» a 16:9
    const r = W / H, ri = img.width / img.height;
    let sw = img.width, sh = img.height, sx = 0, sy = 0;
    if (ri > r) { sw = img.height * r; sx = (img.width - sw) / 2; } else { sh = img.width / r; sy = (img.height - sh) / 2; }
    ctx.clearRect(0, 0, W, H);
    if (!bloque) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
      return;
    }
    const pw = Math.max(4, Math.ceil(W / bloque)), ph = Math.max(3, Math.ceil(H / bloque));
    const peq = document.createElement("canvas");
    peq.width = pw; peq.height = ph;
    peq.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, pw, ph);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(peq, 0, 0, pw, ph, 0, 0, W, H);
  }

  // ------------------------------------------------------------------ pistas

  // «Sea of Thieves» -> «S _ _   _ _   _ _ _ _ _ _ _» (espacios anchos entre palabras: el navegador no los junta)
  function patronLetras(nombre) {
    let primera = true;
    return nombre.split(/\s+/).map((palabra) => palabra.split("").map((c) => {
      if (/[a-z0-9áéíóúñ]/i.test(c)) {
        if (primera) { primera = false; return c.toUpperCase(); }
        return "_";
      }
      return c;
    }).join(" ")).join("  ");
  }
  const PISTAS = [
    { titulo: "Género", valor: () => juego.g.join(" · ") || "—" },
    { titulo: "Año", valor: () => juego.y + (juego.yn ? ` (${juego.yn})` : "") },
    { titulo: "En emojis", valor: () => juego.e, emoji: true },
    { titulo: "Estudio", valor: () => juego.d.join(", ") },
    { titulo: "Letras", valor: () => patronLetras(juego.n), ancho: true },
  ];
  function pintarPistas() {
    const usados = partida.intentos.length;
    $("adv-clues").innerHTML = PISTAS.map((p, i) => {
      const abierta = partida.fin || i <= usados;
      const clases = ["adv-clue", abierta ? "on" : "locked", p.emoji && abierta ? "emoji" : ""].join(" ");
      const estilo = p.ancho ? ' style="grid-column: 1 / -1"' : "";
      const valor = abierta ? p.valor() : `🔒 tras ${i} ${i === 1 ? "fallo" : "fallos"}`;
      return `<div class="${clases}"${estilo}><small>${p.titulo}</small><b>${escapar(valor)}</b></div>`;
    }).join("");
  }

  // ------------------------------------------------------------------ interfaz

  function escapar(t) {
    return String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  function pintarVidas() {
    $("adv-lives").innerHTML = Array.from({ length: INTENTOS }, (_, i) => {
      const t = partida.intentos[i];
      return `<span class="${t ? (t.tipo === "ok" ? "win" : t.tipo) : ""}"></span>`;
    }).join("");
  }
  function pintarIntentos() {
    $("adv-guesses").innerHTML = partida.intentos.map((t) =>
      t.tipo === "skip" ? "<li>⏭️ Saltado</li>" :
      t.tipo === "ok" ? `<li class="ok">✅ ${escapar(t.nombre)}</li>` : `<li>❌ ${escapar(t.nombre)}</li>`
    ).join("");
  }
  function cuadrados() {
    const c = partida.intentos.map((t) => (t.tipo === "ok" ? "🟩" : t.tipo === "skip" ? "⬛" : "🟥"));
    while (c.length < INTENTOS) c.push("⬜");
    return c.join("");
  }
  function textoCompartir() {
    const marca = partida.ganada ? `${partida.intentos.length}/${INTENTOS}` : `X/${INTENTOS}`;
    return `Pulsa Start · Adivina el juego #${numero}\n🎮 ${cuadrados()} ${marca}\nhttps://pulsastart.es/adivina/`;
  }
  function pintarFinal() {
    const fin = $("adv-end");
    if (!partida.fin) { fin.classList.add("adv-hidden"); return; }
    $("adv-play").classList.add("adv-hidden");
    fin.classList.remove("adv-hidden");
    $("adv-end-title").textContent = partida.ganada
      ? ["¡A la primera! 🤯", "¡Crack! 🔥", "¡Muy bien! 🎉", "¡Conseguido! 💪", "¡Por los pelos! 😅", "¡Agónico! 😱"][partida.intentos.length - 1]
      : "¡Ups! Esta vez no 😬";
    $("adv-answer").textContent = juego.n;
    $("adv-steam").href = `https://store.steampowered.com/app/${juego.id}/`;
    $("adv-squares").textContent = cuadrados();
    const s = datos.stats;
    $("adv-stats").innerHTML = [
      [s.jugadas, "jugadas"], [s.jugadas ? Math.round((100 * s.ganadas) / s.jugadas) + "%" : "0%", "ganadas"],
      [s.racha, "racha"], [s.mejor, "mejor racha"],
    ].map(([n, t]) => `<div><strong>${n}</strong><span>${t}</span></div>`).join("");
    const max = Math.max(1, ...s.dist);
    $("adv-dist").innerHTML = s.dist.map((n, i) => {
      const hoyAqui = partida.ganada && partida.intentos.length === i + 1;
      return `<div><span>${i + 1}</span><i class="${hoyAqui ? "today" : ""}" style="width:${Math.max(8, (100 * n) / max)}%">${n}</i></div>`;
    }).join("");
  }
  function pintarTodo() {
    pintar(); pintarPistas(); pintarVidas(); pintarIntentos(); pintarFinal();
  }

  function terminar(ganada) {
    partida.fin = true;
    partida.ganada = ganada;
    const s = datos.stats;
    s.jugadas++;
    if (ganada) {
      s.ganadas++;
      s.dist[partida.intentos.length - 1]++;
      s.racha = s.ultimaGanada === numero - 1 ? s.racha + 1 : 1;
      s.ultimaGanada = numero;
      s.mejor = Math.max(s.mejor, s.racha);
    } else {
      s.racha = 0;
    }
  }

  function intentar(tipo, nombre) {
    if (partida.fin) return;
    if (tipo === "ok" || tipo === "miss") {
      if (partida.intentos.some((t) => t.nombre === nombre)) { $("adv-msg").textContent = "Ese ya lo has probado 😉"; return; }
    }
    partida.intentos.push({ tipo, nombre });
    if (tipo === "ok") terminar(true);
    else if (partida.intentos.length >= INTENTOS) terminar(false);
    guardar(datos);
    $("adv-msg").textContent = tipo === "miss" ? "¡Nop! Se aclara un poco más…" : "";
    pintarTodo();
  }

  // ------------------------------------------------------------------ eventos

  $("adv-list").innerHTML = NOMBRES.map((n) => `<option value="${escapar(n)}">`).join("");
  $("adv-form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const texto = $("adv-input").value.trim();
    if (!texto) return;
    const n = normal(texto);
    const nombre = nombresNorm.get(n);
    if (!nombre) { $("adv-msg").textContent = "No conocemos ese juego: elige uno de las sugerencias 👇"; return; }
    $("adv-input").value = "";
    intentar(validas.has(n) || nombre === juego.n ? "ok" : "miss", nombre);
  });
  $("adv-skip").addEventListener("click", () => intentar("skip", null));
  $("adv-share").addEventListener("click", async () => {
    const texto = textoCompartir();
    try {
      if (navigator.share) { await navigator.share({ text: texto }); return; }
    } catch (e) { /* cancelado: probamos a copiar */ }
    try {
      await navigator.clipboard.writeText(texto);
      $("adv-share").textContent = "¡Copiado! Pégalo en WhatsApp 📋";
    } catch (e) {
      window.prompt("Copia tu resultado:", texto);
    }
  });

  // cuenta atrás hasta el siguiente juego (medianoche en España)
  function cuentaAtras() {
    const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date()).reduce((o, x) => ((o[x.type] = x.value), o), {});
    let r = 86400 - (Number(p.hour) * 3600 + Number(p.minute) * 60 + Number(p.second));
    const h = Math.floor(r / 3600); r %= 3600;
    const m = Math.floor(r / 60), s = r % 60;
    $("adv-next").textContent = `Siguiente juego en ${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  }
  cuentaAtras();
  setInterval(cuentaAtras, 1000);

  $("adv-day").textContent = `Juego #${numero}`;
  pintarTodo();
})();
