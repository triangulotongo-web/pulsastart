// «¿Te ha servido?»: solo guarda tu respuesta en tu navegador (no se envía a ningún sitio).
document.querySelectorAll('.util').forEach(box => {
  const key = 'pulsa-util:' + location.pathname;
  const gracias = box.querySelector('.util-gracias');
  const botones = box.querySelector('.util-botones');
  const mostrar = v => {
    botones.hidden = true;
    gracias.innerHTML = v === 'si'
      ? '¡Me alegro un montón! Gracias por decírmelo 🫶'
      : '¡Vaya! ¿Qué te ha faltado? <a href="mailto:tatifray835@gmail.com?subject=Le%20falta%20algo%20a%20' + encodeURIComponent(document.title.split(' · ')[0]) + '">Cuéntamelo</a> y lo mejoro.';
  };
  let guardado = null;
  try { guardado = localStorage.getItem(key); } catch (e) {}
  if (guardado) mostrar(guardado);
  box.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    try { localStorage.setItem(key, b.dataset.v); } catch (e) {}
    mostrar(b.dataset.v);
  }));
});
