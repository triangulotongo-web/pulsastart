// Adivina el tanque: una foto al día y cuatro respuestas. Las estadísticas se guardan solo en este navegador.
(async () => {
  const datos = await (await fetch('../tanques.json')).json();
  const lista = datos.tanques;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CLAVE = 'enciclopedia-tanques-adivina';

  let guardado = {};
  try { guardado = JSON.parse(localStorage.getItem(CLAVE) || '{}'); } catch (e) { guardado = {}; }
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(guardado)); } catch (e) { /* sin almacenamiento */ } };
  guardado.jugadas = guardado.jugadas || 0;
  guardado.aciertos = guardado.aciertos || 0;
  guardado.racha = guardado.racha || 0;
  guardado.mejor = guardado.mejor || 0;

  // generador pseudoaleatorio con semilla, para que el reto del día sea el mismo para todos
  function azar(semilla) {
    let s = semilla >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  const hoy = new Date();
  const diaNum = Math.floor(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) / 86400000);
  const diaTexto = hoy.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  function ronda(rnd) {
    const correcto = lista[Math.floor(rnd() * lista.length)];
    const misma = lista.filter(t => t.slug !== correcto.slug && t.epoca === correcto.epoca);
    const opciones = [correcto];
    while (opciones.length < 4) {
      const fuente = misma.length >= 3 ? misma : lista;
      const c = fuente[Math.floor(rnd() * fuente.length)];
      if (!opciones.includes(c)) opciones.push(c);
    }
    for (let i = opciones.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [opciones[i], opciones[j]] = [opciones[j], opciones[i]];
    }
    return { correcto, opciones };
  }

  let modo = 'diario';
  let actual;

  function mostrarStats() {
    const pct = guardado.jugadas ? Math.round(100 * guardado.aciertos / guardado.jugadas) : 0;
    $('stats').innerHTML = `<div><strong>${guardado.jugadas}</strong><span>Retos jugados</span></div>
      <div><strong>${pct} %</strong><span>Aciertos</span></div>
      <div><strong>${guardado.racha}</strong><span>Racha actual</span></div>
      <div><strong>${guardado.mejor}</strong><span>Mejor racha</span></div>`;
  }

  function empezar(nuevoModo) {
    modo = nuevoModo;
    actual = modo === 'diario' ? ronda(azar(diaNum * 7919)) : ronda(Math.random);
    const t = actual.correcto;
    $('titulo-ronda').textContent = modo === 'diario' ? `Reto del día · ${diaTexto}` : 'Práctica libre';
    $('foto').innerHTML = `<img src="../../img/${t.slug}.jpg" alt="Fotografía del tanque que hay que adivinar" width="${t.w}" height="${t.h}">`;
    $('pista').textContent = `Pista: ${t.tipo.toLowerCase()} · ${datos.epocas.find(e => e.clave === t.epoca).nombre}`;
    $('mensaje').innerHTML = '';
    $('opciones').innerHTML = actual.opciones.map(o => `<button type="button" class="chip opcion" data-slug="${o.slug}">${esc(o.nombre)}</button>`).join('');
    const yaJugado = modo === 'diario' && guardado.ultimoDia === diaNum;
    for (const b of document.querySelectorAll('.opcion')) {
      b.addEventListener('click', () => responder(b));
      if (yaJugado) b.disabled = true;
    }
    if (yaJugado) resolver(guardado.ultimaRespuesta, false);
  }

  function resolver(slugElegido, contar) {
    const t = actual.correcto;
    const acierto = slugElegido === t.slug;
    for (const b of document.querySelectorAll('.opcion')) {
      b.disabled = true;
      if (b.dataset.slug === t.slug) b.classList.add('bien');
      else if (b.dataset.slug === slugElegido) b.classList.add('mal');
    }
    if (contar) {
      guardado.jugadas++;
      if (acierto) { guardado.aciertos++; guardado.racha++; guardado.mejor = Math.max(guardado.mejor, guardado.racha); }
      else guardado.racha = 0;
      if (modo === 'diario') { guardado.ultimoDia = diaNum; guardado.ultimaRespuesta = slugElegido; }
      guardar();
      mostrarStats();
    }
    $('mensaje').innerHTML = `<p class="note"><b>${acierto ? '¡Correcto!' : 'No era ese.'}</b> Era el <a href="../../tanques/${t.slug}/">${esc(t.nombre)}</a>, ${esc(t.tipo.toLowerCase())} de ${esc(t.nacion)} (${t.anio}). ${modo === 'diario' ? 'Mañana habrá un tanque nuevo.' : ''}</p>`;
  }

  function responder(boton) {
    resolver(boton.dataset.slug, true);
  }

  $('practica').addEventListener('click', () => empezar('libre'));
  $('diario').addEventListener('click', () => empezar('diario'));
  mostrarStats();
  empezar('diario');
})();
