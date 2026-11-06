(function () {
  'use strict';

  var CFG = window.CONFIG || {};
  var DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  var DIAS_LARGO = { Lun: 'Lunes', Mar: 'Martes', 'Mié': 'Miércoles', Jue: 'Jueves', Vie: 'Viernes', 'Sáb': 'Sábado', Dom: 'Domingo' };
  var TURNOS = ['mañana', 'tarde', 'noche'];
  var EDADES = [
    ['hasta-6', 'Hasta 6 años'], ['7-10', '7 a 10 años'], ['11-13', '11 a 13 años'], ['14-16', '14 a 16 años'],
    ['17-29', '17 a 29 años'], ['30-59', '30 a 59 años'], ['60+', '60 años o más']
  ];
  var GRUPOS_EDAD = { chicos: ['hasta-6', '7-10', '11-13'], jovenes: ['14-16', '17-29'], adultos: ['30-59'], mayores: ['60+'] };
  var CENTRO = [-31.4135, -64.1811];

  var S = { polis: [], porId: {}, acts: [], ejemplo: false, actualizado: '', mapa: null, capa: null, yo: null,
            filtros: { act: '', edad: '', dia: '', turno: '', gratis: false } };

  // ---------- utilidades ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function icono(nombre) {
    var p = {
      wa: '<path d="M4 20l1.4-4A8 8 0 1 1 8.6 19z"/><path d="M9.5 9.5c.5 2 2 3.5 4 4"/>',
      pin: '<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
      share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',
      atras: '<path d="M15 5l-7 7 7 7"/>',
      gps: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'
    }[nombre];
    return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  }
  function chipCosto(c) {
    var k = norm(c);
    if (k.indexOf('grat') === 0) return '<span class="chip chip-gratis">Gratuita</span>';
    if (k.indexOf('aporte') > -1) return '<span class="chip chip-aporte">Con aporte</span>';
    return '<span class="chip chip-consultar">Consultar</span>';
  }
  function edadTexto(lista) {
    var ks = EDADES.map(function (e) { return e[0]; });
    var idx = (lista || []).map(function (e) { return ks.indexOf(e); }).filter(function (i) { return i > -1; }).sort(function (a, b) { return a - b; });
    if (!idx.length) return 'Todas las edades';
    var desde = { 'hasta-6': 0, '7-10': 7, '11-13': 11, '14-16': 14, '17-29': 17, '30-59': 30, '60+': 60 }[ks[idx[0]]];
    var hasta = { 'hasta-6': 6, '7-10': 10, '11-13': 13, '14-16': 16, '17-29': 29, '30-59': 59, '60+': null }[ks[idx[idx.length - 1]]];
    if (hasta === null) return desde === 0 ? 'Todas las edades' : desde + ' años o más';
    if (desde === 0) return 'Hasta ' + hasta + ' años';
    return desde + ' a ' + hasta + ' años';
  }
  function horariosTexto(h) {
    // agrupa días que comparten turno: "Mar y Jue a la tarde"
    var porTurno = {};
    (h || []).forEach(function (x) { porTurno[x.turno] = porTurno[x.turno] || []; porTurno[x.turno].push(x.dia); });
    return TURNOS.filter(function (t) { return porTurno[t]; }).map(function (t) {
      var ds = DIAS.filter(function (d) { return porTurno[t].indexOf(d) > -1; });
      var txt = ds.length === 5 && ds.indexOf('Sáb') < 0 && ds.indexOf('Dom') < 0 ? 'Lun a vie'
        : ds.length > 1 ? ds.slice(0, -1).join(', ') + ' y ' + ds[ds.length - 1].toLowerCase() : ds[0];
      return txt + (t === 'mañana' ? ' a la mañana' : t === 'tarde' ? ' a la tarde' : ' a la noche');
    }).join(' · ');
  }
  function distancia(a, b) {
    var R = 6371, r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLng = (b[1] - a[1]) * r;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  function waLink(poli, texto) {
    var num = (poli && poli.whatsapp) || CFG.WHATSAPP_GENERAL;
    if (!num) return '';
    return 'https://wa.me/' + String(num).replace(/\D/g, '') + '?text=' + encodeURIComponent(texto);
  }
  function enlaceForm(url, texto, sufijo) {
    if (url) return '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + texto + ' →</a>';
    return '<a href="#/#sumate" aria-disabled="true">' + texto + ' <span class="pronto">(formulario próximamente)</span></a>';
  }

  // ---------- datos ----------
  function parsearHorario(s) {
    var p = String(s).trim().split(/\s+/);
    var dia = DIAS.filter(function (d) { return norm(d) === norm(p[0]).slice(0, 3); })[0];
    var turno = TURNOS.filter(function (t) { return norm(t) === norm(p[1]); })[0];
    return dia && turno ? { dia: dia, turno: turno } : null;
  }
  function normalizarAct(a) {
    var lista = function (v) { return Array.isArray(v) ? v : String(v || '').split(';').map(function (x) { return x.trim(); }).filter(Boolean); };
    return {
      poli: String(a.poli || '').trim(), actividad: String(a.actividad || '').trim(), categoria: String(a.categoria || '').trim(),
      horarios: lista(a.horarios).map(parsearHorario).filter(Boolean), edades: lista(a.edades),
      costo: a.costo || 'Consultar', dicta: a.dicta || ''
    };
  }
  function csv(texto) {
    var filas = [], fila = [], campo = '', comillas = false;
    for (var i = 0; i < texto.length; i++) {
      var c = texto[i];
      if (comillas) {
        if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
        else if (c === '"') comillas = false;
        else campo += c;
      } else if (c === '"') comillas = true;
      else if (c === ',') { fila.push(campo); campo = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && texto[i + 1] === '\n') i++;
        fila.push(campo); filas.push(fila); fila = []; campo = '';
      } else campo += c;
    }
    if (campo || fila.length) { fila.push(campo); filas.push(fila); }
    var cab = filas.shift().map(norm);
    return filas.filter(function (f) { return f.join('').trim(); }).map(function (f) {
      var o = {}; cab.forEach(function (k, j) { o[k] = f[j]; }); return o;
    });
  }
  function cargar() {
    var pPolis = fetch('data/polideportivos.json').then(function (r) { return r.json(); });
    var pActs = CFG.ACTIVIDADES_CSV
      ? fetch(CFG.ACTIVIDADES_CSV).then(function (r) { return r.text(); }).then(function (t) {
          var filas = csv(t).filter(function (f) { return !f.publicar || /^s/i.test(norm(f.publicar)); });
          return { ejemplo: false, actualizado: '', actividades: filas };
        })
      : fetch('data/actividades.json').then(function (r) { return r.json(); });
    return Promise.all([pPolis, pActs]).then(function (res) {
      S.polis = res[0].slice().sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
      S.polis.forEach(function (p) { S.porId[p.id] = p; p.acts = []; });
      S.ejemplo = !!res[1].ejemplo; S.actualizado = res[1].actualizado || '';
      S.acts = (res[1].actividades || []).map(normalizarAct).filter(function (a) { return S.porId[a.poli] && a.actividad; });
      S.acts.forEach(function (a) { S.porId[a.poli].acts.push(a); });
    });
  }

  // ---------- filtros ----------
  function pasa(a) {
    var f = S.filtros;
    if (f.act && norm(a.actividad) !== f.act) return false;
    if (f.gratis && norm(a.costo).indexOf('grat') !== 0) return false;
    if (f.edad && a.edades.length && a.edades.indexOf(f.edad) < 0) return false;
    if (f.dia || f.turno) {
      var ok = a.horarios.some(function (h) { return (!f.dia || h.dia === f.dia) && (!f.turno || h.turno === f.turno); });
      if (!ok) return false;
    }
    return true;
  }

  // ---------- inicio ----------
  function vistaInicio() {
    var nombresAct = {};
    S.acts.forEach(function (a) { nombresAct[norm(a.actividad)] = a.actividad; });
    var opcionesAct = Object.keys(nombresAct).sort().map(function (k) { return '<option value="' + esc(k) + '">' + esc(nombresAct[k]) + '</option>'; }).join('');
    var conCoord = S.polis.filter(function (p) { return p.lat != null && p.lng != null; }).length;

    $('#app').innerHTML =
      '<section class="hero"><div class="contenedor">' +
        '<p class="eyebrow">' + S.polis.length + ' espacios públicos en los barrios de la ciudad</p>' +
        '<h1>Encontrá qué hacer en el polideportivo de tu barrio</h1>' +
        '<p class="bajada">Deporte, cultura y encuentro para todas las edades. Buscá por actividad, edad y horario, y escribile al polideportivo.</p>' +
      '</div></section>' +
      '<section id="buscar" class="contenedor buscador" aria-label="Buscador de actividades"><form id="filtros">' +
        '<label class="campo">¿Qué querés hacer?<select name="act"><option value="">Todas las actividades</option>' + opcionesAct + '</select></label>' +
        '<label class="campo">¿Para quién?<select name="edad"><option value="">Todas las edades</option>' +
          EDADES.map(function (e) { return '<option value="' + e[0] + '">' + e[1] + '</option>'; }).join('') + '</select></label>' +
        '<label class="campo">Día<select name="dia"><option value="">Cualquier día</option>' +
          DIAS.map(function (d) { return '<option value="' + d + '">' + DIAS_LARGO[d] + '</option>'; }).join('') + '</select></label>' +
        '<label class="campo">Turno<select name="turno"><option value="">Cualquier turno</option>' +
          TURNOS.map(function (t) { return '<option value="' + t + '">' + t[0].toUpperCase() + t.slice(1) + '</option>'; }).join('') + '</select></label>' +
        '<label class="check"><input type="checkbox" name="gratis"> Solo gratuitas</label>' +
      '</form></section>' +
      '<section class="contenedor resultados" aria-label="Resultados">' +
        '<div class="res-cabeza"><p id="conteo" aria-live="polite"></p>' +
          '<button type="button" class="btn btn-borde" id="cerca">' + icono('gps') + 'Cerca mío</button></div>' +
        '<div class="res-cuerpo">' +
          '<div class="mapa-caja"><div id="mapa" role="region" aria-label="Mapa de polideportivos"></div>' +
            '<div class="leyenda"><span><i class="pto"></i>Con actividades</span><span><i class="pto vacio"></i>Disponible para propuestas</span></div>' +
            (conCoord < S.polis.length ? '<p class="sin-mapa" style="margin-top:10px">' + (S.polis.length - conCoord) + ' polideportivos todavía no tienen su ubicación cargada en el mapa. Igual los encontrás en la lista de abajo.</p>' : '') +
          '</div>' +
          '<div class="lista"><div class="lista-scroll" id="lista"></div></div>' +
        '</div>' +
      '</section>' +
      '<section id="todos" class="contenedor seccion" aria-labelledby="t-todos">' +
        '<div><p class="eyebrow">Polideportivos</p><h2 id="t-todos">Los ' + S.polis.length + ' polideportivos</h2><div class="trazo celeste"></div></div>' +
        '<label class="campo filtro-todos">Buscar por nombre o barrio<input type="search" id="buscar-poli" placeholder="Ej.: Villa El Libertador"></label>' +
        '<div class="todos" id="lista-todos"></div>' +
      '</section>' +
      '<section id="sumate" class="contenedor seccion" aria-labelledby="t-sumate">' +
        '<div><p class="eyebrow">Sumate</p><h2 id="t-sumate">El polideportivo es del barrio</h2><div class="trazo"></div></div>' +
        '<div class="grilla-3">' +
          cardSumate('#32A1D7', 'Proponé una actividad', '¿Sos profe, tallerista o tenés algo para enseñar? Hay polideportivos con espacio y horarios libres esperando propuestas.', enlaceForm(CFG.FORM_PROPONER, 'Quiero dar una actividad')) +
          cardSumate('#F2A81D', 'Pedí una actividad', '¿Te gustaría que haya vóley, ajedrez o un taller en tu barrio? Contanos y lo llevamos a la mesa territorial.', enlaceForm(CFG.FORM_PEDIR, 'Hacer un pedido')) +
          cardSumate('#16447E', 'Usá el espacio con tu institución', 'Clubes, escuelas, centros vecinales y organizaciones pueden hacer sus actividades con un acuerdo de uso.', enlaceForm(CFG.FORM_INSTITUCIONES, 'Cómo es el acuerdo de uso')) +
        '</div>' +
      '</section>' +
      '<section class="banda-navy" aria-labelledby="t-mesas"><div class="contenedor"><div>' +
        '<p class="eyebrow">Mesas territoriales</p><h2 id="t-mesas">Lo que pasa en el polideportivo se decide en el barrio</h2>' +
        '<p>Vecinos, instituciones y la coordinación se juntan en la mesa territorial para organizar actividades y eventos. Es abierta: podés sumarte.</p>' +
      '</div><a class="btn" href="#todos">Buscá tu polideportivo</a></div></section>';

    var form = $('#filtros');
    Object.keys(S.filtros).forEach(function (k) {
      var el = form.elements[k]; if (!el) return;
      if (el.type === 'checkbox') el.checked = S.filtros[k]; else el.value = S.filtros[k];
    });
    form.addEventListener('change', function () {
      S.filtros = { act: form.act.value, edad: form.edad.value, dia: form.dia.value, turno: form.turno.value, gratis: form.gratis.checked };
      pintarResultados();
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    $('#cerca').addEventListener('click', cercaMio);
    $('#buscar-poli').addEventListener('input', pintarTodos);
    iniciarMapa();
    pintarResultados();
    pintarTodos();
  }

  function cardSumate(color, titulo, texto, enlace) {
    return '<article class="card-sumate"><div class="franja" style="background:' + color + '"></div><div class="cuerpo">' +
      '<h3>' + titulo + '</h3><p>' + texto + '</p>' + enlace + '</div></article>';
  }

  function iniciarMapa() {
    if (!window.L) { $('#mapa').innerHTML = '<p class="sin-mapa">No se pudo cargar el mapa.</p>'; return; }
    S.mapa = L.map('mapa', { scrollWheelZoom: false }).setView(CENTRO, 11);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19, subdomains: 'abcd',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(S.mapa);
    S.capa = L.layerGroup().addTo(S.mapa);
  }

  function pintarResultados() {
    var filtrando = S.filtros.act || S.filtros.edad || S.filtros.dia || S.filtros.turno || S.filtros.gratis;
    var acts = S.acts.filter(pasa);
    var polisCon = {}; acts.forEach(function (a) { polisCon[a.poli] = true; });

    if (S.yo) acts.sort(function (a, b) { return dist(a.poli) - dist(b.poli); });

    $('#conteo').innerHTML = '<strong>' + acts.length + ' ' + (acts.length === 1 ? 'actividad' : 'actividades') + '</strong> en ' +
      Object.keys(polisCon).length + ' ' + (Object.keys(polisCon).length === 1 ? 'polideportivo' : 'polideportivos');

    $('#lista').innerHTML = acts.length ? acts.map(function (a) {
      var p = S.porId[a.poli], d = dist(a.poli);
      return '<a class="tarjeta" href="#/p/' + esc(p.id) + '">' +
        '<div class="tarjeta-top"><h3>' + esc(a.actividad) + '</h3>' + chipCosto(a.costo) + '</div>' +
        '<p class="meta">' + esc(edadTexto(a.edades)) + ' · ' + esc(horariosTexto(a.horarios)) + '</p>' +
        '<p class="donde">Polideportivo ' + esc(p.nombre) + (isFinite(d) ? ' · a ' + d.toFixed(1).replace('.', ',') + ' km' : '') + '</p>' +
        (norm(a.costo).indexOf('aporte') > -1 ? '<p class="nota-aporte">Si no podés aportar, consultá: hay lugar gratuito.</p>' : '') +
      '</a>';
    }).join('') : '<div class="vacio-msg"><h3>No encontramos actividades con esos filtros</h3><p>Probá con otro día u otra edad. Si te gustaría que exista, <a href="#sumate">pedila acá</a>.</p></div>';

    if (!S.capa) return;
    S.capa.clearLayers();
    S.polis.forEach(function (p) {
      if (p.lat == null || p.lng == null) return;
      var activo = filtrando ? !!polisCon[p.id] : p.acts.length > 0;
      if (filtrando && !activo) return;
      var m = L.marker([p.lat, p.lng], {
        title: p.nombre, alt: 'Polideportivo ' + p.nombre,
        icon: L.divIcon({ className: '', html: '<div class="marcador' + (activo ? '' : ' vacio') + '"></div>', iconSize: [22, 22], iconAnchor: [11, 11] })
      });
      var tipos = {}; p.acts.forEach(function (a) { tipos[a.actividad] = 1; });
      m.bindPopup('<div class="pop"><p class="eyebrow">Polideportivo social</p><h3>' + esc(p.nombre) + '</h3><p class="dir">' + esc(p.direccion) + '</p>' +
        (p.acts.length ? '<div class="etiquetas">' + Object.keys(tipos).slice(0, 4).map(function (t) { return '<span class="etiqueta">' + esc(t) + '</span>'; }).join('') + '</div>'
                       : '<p class="dir">Disponible para propuestas</p>') +
        '<a class="btn btn-navy" href="#/p/' + esc(p.id) + '">' + (p.acts.length ? 'Ver actividades y horarios' : 'Ver el polideportivo') + '</a></div>');
      S.capa.addLayer(m);
    });
  }

  function dist(id) {
    var p = S.porId[id];
    return S.yo && p && p.lat != null ? distancia(S.yo, [p.lat, p.lng]) : Infinity;
  }

  function cercaMio() {
    var b = $('#cerca');
    if (!navigator.geolocation) { b.textContent = 'Tu navegador no comparte ubicación'; return; }
    b.textContent = 'Buscando tu ubicación…';
    navigator.geolocation.getCurrentPosition(function (pos) {
      S.yo = [pos.coords.latitude, pos.coords.longitude];
      b.innerHTML = icono('gps') + 'Ordenado por cercanía';
      if (S.mapa) {
        S.mapa.setView(S.yo, 13);
        L.circleMarker(S.yo, { radius: 7, color: '#fff', weight: 3, fillColor: '#A4123F', fillOpacity: 1 }).addTo(S.mapa).bindTooltip('Vos');
      }
      pintarResultados(); pintarTodos();
    }, function () { b.innerHTML = icono('gps') + 'No pudimos ver tu ubicación'; }, { timeout: 10000 });
  }

  function pintarTodos() {
    var q = norm(($('#buscar-poli') || {}).value);
    var lista = S.polis.filter(function (p) { return !q || norm(p.nombre + ' ' + p.direccion).indexOf(q) > -1; });
    if (S.yo) lista = lista.slice().sort(function (a, b) { return dist(a.id) - dist(b.id); });
    $('#lista-todos').innerHTML = lista.map(function (p) {
      var n = p.acts.length, d = dist(p.id);
      return '<a href="#/p/' + esc(p.id) + '">' + esc(p.nombre) + '<span>' +
        (isFinite(d) ? d.toFixed(1).replace('.', ',') + ' km · ' : '') + (n ? n + (n === 1 ? ' actividad' : ' actividades') : 'Sin actividades cargadas') + '</span></a>';
    }).join('') || '<p>No hay polideportivos con ese nombre.</p>';
  }

  // ---------- ficha ----------
  function vistaFicha(id) {
    var p = S.porId[id];
    if (!p) { $('#app').innerHTML = '<div class="contenedor seccion"><h1>No encontramos ese polideportivo</h1><p><a href="#/">Volver al inicio</a></p></div>'; return; }
    document.title = 'Polideportivo ' + p.nombre + ' · Polideportivos Sociales';
    var wa = waLink(p, 'Hola, vi en la web del Polideportivo ' + p.nombre + ' y quería consultar por las actividades.');
    var hayAporte = p.acts.some(function (a) { return norm(a.costo).indexOf('aporte') > -1; });

    $('#app').innerHTML =
      '<section class="ficha-head"><div class="contenedor">' +
        '<a class="volver" href="#/">' + icono('atras').replace('<svg', '<svg width="20" height="20"') + 'Todos los polideportivos</a>' +
        '<p class="eyebrow">Polideportivo social</p><h1>' + esc(p.nombre) + '</h1><p class="dir">' + esc(p.direccion) + '</p>' +
      '</div></section>' +
      '<div class="contenedor">' +
        '<div class="ficha-acciones">' +
          (wa ? '<a class="btn btn-primario" href="' + esc(wa) + '" target="_blank" rel="noopener">' + icono('wa') + 'Escribir por WhatsApp</a>'
              : '<span class="btn btn-primario" aria-disabled="true">' + icono('wa') + 'Contacto por WhatsApp: próximamente</span>') +
          '<a class="btn btn-borde" href="' + esc(p.maps) + '" target="_blank" rel="noopener">' + icono('pin') + 'Cómo llegar</a>' +
          '<button type="button" class="btn btn-borde" id="compartir">' + icono('share') + 'Compartir</button>' +
        '</div>' +
        '<p class="actualizado" style="margin-top:10px">' + (S.ejemplo ? 'Actividades de ejemplo · ' : '') + (S.actualizado ? 'Actualizado el ' + esc(S.actualizado) : 'Datos del relevamiento 2026') + '</p>' +
        '<div class="ficha-cuerpo">' +
          '<div class="ficha-main">' + (p.acts.length ? bloqueActividades(p, hayAporte) : bloqueConvocatoria(p)) + '</div>' +
          '<aside class="ficha-lado">' + bloqueLado(p) + '</aside>' +
        '</div>' +
      '</div>';

    $('#compartir').addEventListener('click', function () {
      var url = location.href, b = this;
      if (navigator.share) navigator.share({ title: 'Polideportivo ' + p.nombre, url: url }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { b.lastChild.textContent = 'Enlace copiado'; });
    });
    var chips = document.querySelectorAll('.chips-filtro button');
    Array.prototype.forEach.call(chips, function (btn) {
      btn.addEventListener('click', function () {
        Array.prototype.forEach.call(chips, function (x) { x.setAttribute('aria-pressed', x === btn ? 'true' : 'false'); });
        $('#acts-ficha').innerHTML = tarjetasFicha(p, btn.getAttribute('data-g'));
      });
    });
  }

  function tarjetasFicha(p, grupo) {
    var hoy = DIAS[(new Date().getDay() + 6) % 7];
    var acts = p.acts.filter(function (a) {
      if (!grupo || grupo === 'todos') return true;
      if (grupo === 'hoy') return a.horarios.some(function (h) { return h.dia === hoy; });
      var g = GRUPOS_EDAD[grupo]; return !a.edades.length || a.edades.some(function (e) { return g.indexOf(e) > -1; });
    });
    if (!acts.length) return '<div class="vacio-msg"><p>No hay actividades para este filtro.</p></div>';
    return acts.map(function (a) {
      return '<article class="tarjeta"><div class="tarjeta-top"><h3>' + esc(a.actividad) + '</h3>' + chipCosto(a.costo) + '</div>' +
        '<div class="etiquetas">' + a.horarios.map(function (h) { return '<span class="etiqueta">' + esc(h.dia) + ' · ' + esc(h.turno) + '</span>'; }).join('') + '</div>' +
        '<p class="donde">' + esc(edadTexto(a.edades)) + (a.dicta ? ' · La dicta: ' + esc(a.dicta) : '') + '</p></article>';
    }).join('');
  }

  function bloqueActividades(p, hayAporte) {
    return '<div><p class="eyebrow">Actividades</p><h2 style="font-size:30px">Qué podés hacer acá</h2><div class="trazo"></div></div>' +
      '<div class="chips-filtro" role="group" aria-label="Filtrar actividades">' +
        [['todos', 'Todas'], ['hoy', 'Hoy'], ['chicos', 'Chicos'], ['jovenes', 'Jóvenes'], ['adultos', 'Adultos'], ['mayores', 'Mayores']].map(function (g, i) {
          return '<button type="button" data-g="' + g[0] + '" aria-pressed="' + (i === 0) + '">' + g[1] + '</button>';
        }).join('') + '</div>' +
      '<div id="acts-ficha" class="lista-scroll" style="max-height:none">' + tarjetasFicha(p, 'todos') + '</div>' +
      (hayAporte ? '<div class="caja-ambar"><p class="eyebrow">Sobre el aporte</p><p>Las actividades con aporte tienen lugares gratuitos. Si no podés aportar, consultá sin problema.</p></div>' : '');
  }

  function bloqueConvocatoria(p) {
    return '<section class="convocatoria"><div class="franja"></div><div class="cuerpo">' +
      '<p class="eyebrow">Espacio disponible</p><h2>Este polideportivo espera tu propuesta</h2><div class="trazo celeste" style="margin-top:0"></div>' +
      '<p>Todavía no hay actividades cargadas. Hay espacio y horarios libres para quien quiera enseñar, entrenar u organizar algo con el barrio.</p>' +
      (CFG.FORM_PROPONER ? '<a class="btn btn-primario" href="' + esc(CFG.FORM_PROPONER) + '" target="_blank" rel="noopener">Quiero dar una actividad acá</a>'
                         : '<span class="btn btn-primario" aria-disabled="true">Quiero dar una actividad acá (próximamente)</span>') +
      (CFG.FORM_PEDIR ? '<a class="btn btn-borde" href="' + esc(CFG.FORM_PEDIR) + '" target="_blank" rel="noopener">Pedir una actividad para el barrio</a>' : '') +
      '</div></section>' +
      '<div class="caja"><p class="eyebrow" style="color:var(--gris)">Cómo funciona</p><div class="pasos">' +
        '<div class="paso"><b>1</b><p>Contás qué querés hacer, para quién y en qué horario.</p></div>' +
        '<div class="paso"><b>2</b><p>La coordinación te contacta y lo presenta en la mesa territorial.</p></div>' +
        '<div class="paso"><b>3</b><p>Firman un acuerdo de uso y la actividad aparece en esta página.</p></div>' +
      '</div></div>';
  }

  function bloqueLado(p) {
    var h = '';
    if (p.horario_apertura) h += '<div class="caja"><p class="eyebrow" style="color:var(--gris)">Cuándo está abierto</p><p>' + esc(p.horario_apertura) + '</p></div>';
    if (p.instalaciones && p.instalaciones.length) h += '<div class="caja"><p class="eyebrow" style="color:var(--gris)">Qué hay en el espacio</p><div class="etiquetas">' +
      p.instalaciones.map(function (i) { return '<span class="etiqueta">' + esc(i) + '</span>'; }).join('') + '</div></div>';
    h += '<div class="caja-navy"><p class="eyebrow">Mesa territorial</p><p class="grande">' + (p.proxima_mesa ? 'Próxima mesa: ' + esc(p.proxima_mesa) : 'La mesa es abierta') + '</p>' +
      '<p>Vecinos e instituciones deciden con la coordinación qué actividades y eventos se hacen en el polideportivo.</p></div>';
    h += '<div style="display:flex;flex-direction:column;gap:10px"><p class="eyebrow" style="color:var(--gris)">¿Falta algo?</p>' +
      (CFG.FORM_PEDIR ? '<a class="enlace-fila" href="' + esc(CFG.FORM_PEDIR) + '" target="_blank" rel="noopener">Pedí una actividad para este barrio<span aria-hidden="true">→</span></a>' : '') +
      (CFG.FORM_PROPONER ? '<a class="enlace-fila" href="' + esc(CFG.FORM_PROPONER) + '" target="_blank" rel="noopener">Quiero dar una actividad acá<span aria-hidden="true">→</span></a>' : '') +
      (CFG.FORM_ACTUALIZAR ? '<a class="enlace-fila" href="' + esc(CFG.FORM_ACTUALIZAR) + '" target="_blank" rel="noopener">Avisanos si algo cambió<span aria-hidden="true">→</span></a>' : '') +
      (!CFG.FORM_PEDIR && !CFG.FORM_PROPONER ? '<p class="actualizado">Los formularios para proponer y pedir actividades estarán disponibles pronto.</p>' : '') +
      '</div>';
    return h;
  }

  // ---------- ruteo ----------
  function rutear() {
    var h = location.hash || '#/';
    if (h.indexOf('#/') !== 0) {
      // ancla dentro de la página de inicio (#sumate, #todos…)
      var el = document.getElementById(h.slice(1));
      if (el) { el.scrollIntoView(); return; }
      h = '#/';
    }
    var m = h.match(/^#\/p\/([a-z0-9-]+)/);
    S.mapa = null; S.capa = null;
    if (m) { vistaFicha(m[1]); window.scrollTo(0, 0); return; }
    document.title = 'Polideportivos Sociales · Municipalidad de Córdoba';
    vistaInicio();
    var ancla = h.split('#')[2];
    if (ancla && document.getElementById(ancla)) document.getElementById(ancla).scrollIntoView();
  }

  cargar().then(function () {
    if (S.ejemplo) $('#aviso-ejemplo').hidden = false;
    if (S.actualizado) $('#pie-actualizado').textContent = 'Datos actualizados el ' + S.actualizado;
    window.addEventListener('hashchange', rutear);
    rutear();
  }).catch(function (e) {
    $('#app').innerHTML = '<p class="contenedor cargando">No pudimos cargar los datos. Probá recargar la página.</p>';
    console.error(e);
  });
})();
