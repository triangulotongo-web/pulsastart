// Comparador de tanques: lee herramientas/tanques.json y muestra dos fichas lado a lado.
(async () => {
  const datos = await (await fetch('../tanques.json')).json();
  const porSlug = Object.fromEntries(datos.tanques.map(t => [t.slug, t]));
  const selA = document.getElementById('tanque-a');
  const selB = document.getElementById('tanque-b');
  const salida = document.getElementById('resultado');

  for (const sel of [selA, selB]) {
    for (const ep of datos.epocas) {
      const grupo = document.createElement('optgroup');
      grupo.label = ep.nombre;
      for (const t of datos.tanques.filter(x => x.epoca === ep.clave)) {
        const o = document.createElement('option');
        o.value = t.slug;
        o.textContent = `${t.nombre} (${t.nacion}, ${t.anio})`;
        grupo.appendChild(o);
      }
      sel.appendChild(grupo);
    }
  }

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function figura(t) {
    return `<figure><a href="../../tanques/${t.slug}/"><img src="../../img/${t.slug}.jpg" alt="Fotografía del ${esc(t.nombre)}" width="${t.w}" height="${t.h}"></a>
      <figcaption><a href="../../tanques/${t.slug}/">${esc(t.nombre)}</a> · ${esc(t.tipo)} · ${esc(t.nacion)}, ${t.anio}</figcaption></figure>`;
  }

  function pintar() {
    const a = porSlug[selA.value], b = porSlug[selB.value];
    if (!a || !b) return;
    const claves = [...new Set([...Object.keys(a.ficha), ...Object.keys(b.ficha)])];
    const comunes = claves.filter(k => k in a.ficha && k in b.ficha);
    const resto = claves.filter(k => !(k in a.ficha && k in b.ficha));
    const filas = [...comunes, ...resto].map(k =>
      `<tr><th scope="row">${esc(k)}</th><td>${esc(a.ficha[k] ?? '—')}</td><td>${esc(b.ficha[k] ?? '—')}</td></tr>`).join('');
    salida.innerHTML = `
      <div class="duo">${figura(a)}${figura(b)}</div>
      <div class="tabla-scroll"><table class="specs versus">
        <thead><tr><th scope="col">Dato</th><th scope="col">${esc(a.nombre)}</th><th scope="col">${esc(b.nombre)}</th></tr></thead>
        <tbody>${filas}</tbody></table></div>
      <p class="sources">Datos de las fichas de la enciclopedia. Pulsa en la foto o el nombre de cada tanque para leer su historia completa.</p>`;
    const url = new URL(location.href);
    url.searchParams.set('a', a.slug);
    url.searchParams.set('b', b.slug);
    history.replaceState(null, '', url);
  }

  const p = new URLSearchParams(location.search);
  selA.value = porSlug[p.get('a')] ? p.get('a') : 't-34';
  selB.value = porSlug[p.get('b')] ? p.get('b') : 'panzer-iv';
  selA.addEventListener('change', pintar);
  selB.addEventListener('change', pintar);
  document.getElementById('intercambiar').addEventListener('click', () => {
    [selA.value, selB.value] = [selB.value, selA.value];
    pintar();
  });
  document.getElementById('azar').addEventListener('click', () => {
    const lista = datos.tanques;
    selA.value = lista[Math.floor(Math.random() * lista.length)].slug;
    do { selB.value = lista[Math.floor(Math.random() * lista.length)].slug; } while (selB.value === selA.value);
    pintar();
  });
  pintar();
})();
