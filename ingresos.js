/* =====================================================
   Modulo: Ingresos (no-venta)
   - Cada ingreso tiene TIPO (Operacionales / Financieros / Otros)
     y CATEGORIA dentro de ese tipo
   - Dos selectores independientes
   - Al elegir "Otros" se abre input para el nombre real
   - Las categorias personalizadas se guardan por negocio
   - Cada ingreso suma a Efectivo
   ===================================================== */

KF.registrarModulo({
  id: 'ingresos',
  nombre: 'Ingresos',
  icono: '💰',
  orden: 6,
  render: function (cont) {

    var MODULO = 'ingresos';
    var filtroFecha = 'mes';

    // Tipos de ingreso
    var TIPOS = [
      { id: 'operacionales', nombre: 'Ingresos Operacionales' },
      { id: 'financieros',   nombre: 'Ingresos Financieros' },
      { id: 'otros',         nombre: 'Otros Ingresos' }
    ];

    // Categorias base por tipo
    var CATS_BASE = {
      operacionales: ['Alquiler', 'Servicios', 'Comisiones', 'Devolución'],
      financieros:   ['Intereses', 'Dividendos'],
      otros:         ['Varios', 'Aporte']
    };

    // ---------- Categorias personalizadas (por negocio) ----------
    function leerCatCustom() {
      var obj = KF.leer('cat-ingresos', {});
      return (obj && typeof obj === 'object') ? obj : {};
    }
    function guardarCatCustom(obj) {
      KF.escribir('cat-ingresos', obj);
    }
    function agregarCatCustom(tipo, nombre) {
      var n = String(nombre || '').trim();
      if (!n) return;
      var custom = leerCatCustom();
      if (!custom[tipo]) custom[tipo] = [];
      if (custom[tipo].indexOf(n) === -1) {
        custom[tipo].push(n);
        guardarCatCustom(custom);
      }
    }
    function categoriasDeTipo(tipo) {
      var base = (CATS_BASE[tipo] || []).slice();
      var custom = leerCatCustom();
      var extra = custom[tipo] || [];
      extra.forEach(function (c) {
        if (base.indexOf(c) === -1) base.push(c);
      });
      return base;
    }
    function tipoPorId(id) {
      for (var i = 0; i < TIPOS.length; i++) {
        if (TIPOS[i].id === id) return TIPOS[i];
      }
      return TIPOS[0]; // operacionales por defecto
    }
    function nombreTipo(id) {
      return tipoPorId(id).nombre;
    }

    // Inferir tipo a partir de la categoria (para registros viejos)
    function inferirTipo(categoria) {
      if (!categoria) return 'operacionales';
      var tipos = Object.keys(CATS_BASE);
      for (var i = 0; i < tipos.length; i++) {
        if (CATS_BASE[tipos[i]].indexOf(categoria) !== -1) return tipos[i];
      }
      var custom = leerCatCustom();
      for (var t in custom) {
        if ((custom[t] || []).indexOf(categoria) !== -1) return t;
      }
      return 'operacionales';
    }
    function normalizar(i) {
      if (!i.tipo) i.tipo = inferirTipo(i.categoria);
      return i;
    }

    // ---------- Lectura / escritura ----------
    function leerIngresos() {
      var lista = KF.leer(MODULO, []);
      lista.forEach(normalizar);
      return lista;
    }
    function guardarIngresos(l) { KF.escribir(MODULO, l); }

    function rangoSegunFiltro() {
      var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      var d = new Date(hoy);
      if (filtroFecha === 'hoy')    d = hoy;
      if (filtroFecha === 'semana') d.setDate(hoy.getDate() - 6);
      if (filtroFecha === 'mes')    d.setDate(1);
      if (filtroFecha === 'todo')   d = new Date(0);
      return d.getTime();
    }
    function dentro(iso) { return new Date(iso).getTime() >= rangoSegunFiltro(); }

    // ---------- Interfaz principal ----------
    function pintar() {
      var todos = leerIngresos();
      var lista = todos.filter(function (i) { return dentro(i.fecha); });

      var total = 0;
      var porTipo = {};
      TIPOS.forEach(function (t) { porTipo[t.id] = 0; });
      lista.forEach(function (i) {
        var m = KF.num(i.monto);
        total += m;
        var t = i.tipo || 'operacionales';
        porTipo[t] = (porTipo[t] || 0) + m;
      });

      // Desglose por categoria (con tipo)
      var porCat = {};
      lista.forEach(function (i) {
        var m = KF.num(i.monto);
        var cat = i.categoria || 'Otros';
        var t = i.tipo || 'operacionales';
        var key = t + '|' + cat;
        if (!porCat[key]) porCat[key] = { tipo: t, categoria: cat, monto: 0 };
        porCat[key].monto += m;
      });
      var topCats = Object.keys(porCat).map(function (k) { return porCat[k]; })
        .sort(function (a, b) { return b.monto - a.monto; });

      var html = '';
      html += '<div class="kf-titulo-modulo">💰 Ingresos</div>';
      html += '<div class="kf-subtitulo">Ingresos operacionales, financieros y otros</div>';

      html += '<select id="kf-i-filtro" class="kf-buscador" style="padding-left:12px;background-image:none;margin-bottom:12px;">';
      html += '<option value="hoy"'    + (filtroFecha==='hoy'   ?' selected':'') + '>Hoy</option>';
      html += '<option value="semana"' + (filtroFecha==='semana'?' selected':'') + '>Últimos 7 días</option>';
      html += '<option value="mes"'    + (filtroFecha==='mes'   ?' selected':'') + '>Este mes</option>';
      html += '<option value="todo"'   + (filtroFecha==='todo'  ?' selected':'') + '>Todo</option>';
      html += '</select>';

      html += '<div class="kf-grid-resumen">';
      html += '<div class="kf-mini-card positivo"><div class="lbl">Total ingresos</div><div class="val">' + KF.dinero(total) + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Operaciones</div><div class="val">' + lista.length + '</div></div>';
      html += '</div>';

      // Desglose por TIPO
      html += '<div class="kf-card">';
      html += '<div class="kf-card-titulo">Por tipo</div>';
      TIPOS.forEach(function (t) {
        var monto = porTipo[t.id] || 0;
        var pct = total > 0 ? (monto / total * 100) : 0;
        html += '<div style="margin-bottom:8px;">';
        html += '<div style="display:flex;justify-content:space-between;font-size:13px;">';
        html += '<span>' + KF.esc(t.nombre) + '</span>';
        html += '<b style="color:var(--verde);">' + KF.dinero(monto) + '</b>';
        html += '</div>';
        html += '<div style="height:6px;background:var(--gris-borde);border-radius:4px;overflow:hidden;margin-top:3px;">';
        html += '<div style="height:100%;background:var(--verde);width:' + pct.toFixed(1) + '%;"></div>';
        html += '</div></div>';
      });
      html += '</div>';

      // Desglose por CATEGORIA
      if (topCats.length) {
        html += '<div class="kf-card">';
        html += '<div class="kf-card-titulo">Por categoría</div>';
        topCats.forEach(function (c) {
          var pct = total > 0 ? (c.monto / total * 100) : 0;
          html += '<div style="margin-bottom:8px;">';
          html += '<div style="display:flex;justify-content:space-between;font-size:13px;">';
          html += '<span>' + KF.esc(c.categoria) + ' <small style="color:#7b8a9a;">· ' + KF.esc(nombreTipo(c.tipo)) + '</small></span>';
          html += '<b style="color:var(--verde);">' + KF.dinero(c.monto) + '</b>';
          html += '</div>';
          html += '<div style="height:6px;background:var(--gris-borde);border-radius:4px;overflow:hidden;margin-top:3px;">';
          html += '<div style="height:100%;background:var(--verde);width:' + pct.toFixed(1) + '%;"></div>';
          html += '</div></div>';
        });
        html += '</div>';
      }

      html += '<button class="kf-btn kf-btn-dorado kf-btn-bloque" id="kf-i-add" type="button" style="margin-bottom:12px;">+ Registrar ingreso</button>';
      html += '<div id="kf-i-lista"></div>';

      cont.innerHTML = html;

      document.getElementById('kf-i-add').addEventListener('click', function () { abrirFormulario(); });
      document.getElementById('kf-i-filtro').addEventListener('change', function (e) {
        filtroFecha = e.target.value; pintar();
      });

      pintarLista(lista);
    }

    function pintarLista(lista) {
      var cont = document.getElementById('kf-i-lista');
      if (!cont) return;

      if (!lista.length) {
        cont.innerHTML = '<div class="kf-vacio"><span class="kf-vacio-icono">💰</span>No hay ingresos en este período.</div>';
        return;
      }

      lista = lista.slice().sort(function (a, b) {
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      });

      var html = '';
      lista.forEach(function (i) {
        var t = tipoPorId(i.tipo || 'operacionales');
        html += '<div class="kf-item" style="border-left-color:var(--verde);">';
        html += '<div class="kf-item-cab">';
        html += '<div class="kf-item-nombre">' + KF.esc(i.concepto || '(sin concepto)') + '</div>';
        html += '<div style="font-weight:800;color:var(--verde);white-space:nowrap;">+ ' + KF.dinero(i.monto) + '</div>';
        html += '</div>';
        html += '<div style="margin-bottom:6px;"><span class="kf-badge kf-badge-dorado" style="font-size:10px;">' + KF.esc(t.nombre) + '</span></div>';
        html += '<div class="kf-item-datos">';
        html += '<div>Categoría: <b>' + KF.esc(i.categoria || 'Otros') + '</b></div>';
        html += '<div>Fecha: <b>' + formatearFecha(i.fecha) + '</b></div>';
        if (i.notas) html += '<div style="grid-column:1/-1;">Notas: <b>' + KF.esc(i.notas) + '</b></div>';
        html += '</div>';
        html += '<div class="kf-item-acciones">';
        html += '<button class="kf-btn kf-btn-gris kf-btn-chico" data-accion="editar" data-id="' + i.id + '">Editar</button>';
        html += '<button class="kf-btn kf-btn-rojo kf-btn-chico" data-accion="eliminar" data-id="' + i.id + '">Eliminar</button>';
        html += '</div></div>';
      });
      cont.innerHTML = html;

      var btns = cont.querySelectorAll('button[data-accion]');
      for (var k = 0; k < btns.length; k++) {
        btns[k].addEventListener('click', function (e) {
          var acc = e.currentTarget.getAttribute('data-accion');
          var id = e.currentTarget.getAttribute('data-id');
          if (acc === 'editar') abrirFormulario(id);
          if (acc === 'eliminar') eliminar(id);
        });
      }
    }

    function formatearFecha(iso) {
      var d = new Date(iso);
      return String(d.getDate()).padStart(2, '0') + '/' +
             String(d.getMonth() + 1).padStart(2, '0') + '/' +
             d.getFullYear();
    }

    // ---------- Formulario ----------
    function abrirFormulario(id) {
      var i = id ? leerIngresos().find(function (x) { return x.id === id; }) : null;
      var datos = i || { concepto: '', monto: '', tipo: 'operacionales', categoria: 'Alquiler', notas: '' };
      if (!datos.tipo) datos.tipo = 'operacionales';

      var opsTipo = TIPOS.map(function (t) {
        return '<option value="' + t.id + '"' + (datos.tipo === t.id ? ' selected' : '') + '>' + KF.esc(t.nombre) + '</option>';
      }).join('');

      var contenido = '';
      contenido += '<div class="kf-campo"><label>Concepto</label><input type="text" id="i-concepto" value="' + KF.esc(datos.concepto) + '" placeholder="Ej: Alquiler de local"></div>';
      contenido += '<div class="kf-campo"><label>Monto</label><input type="number" step="0.01" inputmode="decimal" id="i-monto" value="' + KF.esc(datos.monto) + '" placeholder="0.00"></div>';
      contenido += '<div class="kf-campo"><label>Tipo de ingreso</label><select id="i-tipo">' + opsTipo + '</select></div>';
      contenido += '<div class="kf-campo"><label>Categoría</label><select id="i-categoria"></select></div>';
      contenido += '<div class="kf-campo" id="i-cat-otra-wrap" style="display:none;"><label>Nombre de la categoría</label><input type="text" id="i-cat-otra" placeholder="Ej: Servicios de diseño"></div>';
      contenido += '<div class="kf-campo"><label>Notas (opcional)</label><input type="text" id="i-notas" value="' + KF.esc(datos.notas || '') + '"></div>';

      KF.abrirModal({
        titulo: i ? 'Editar ingreso' : 'Nuevo ingreso',
        contenido: contenido,
        textoGuardar: i ? 'Guardar cambios' : 'Registrar ingreso',
        alGuardar: function () {
          if (KF.diaCerrado(KF.hoy())) {
            KF.aviso('El día ya está cerrado. No se pueden registrar ingresos.', 'error');
            return;
          }
          var concepto = document.getElementById('i-concepto').value.trim();
          var monto = KF.num(document.getElementById('i-monto').value);
          var tipo = document.getElementById('i-tipo').value;
          var categoriaSel = document.getElementById('i-categoria').value;
          var catOtra = document.getElementById('i-cat-otra') ? document.getElementById('i-cat-otra').value.trim() : '';
          var notas = document.getElementById('i-notas').value.trim();

          if (!concepto) { KF.aviso('Escribe un concepto', 'error'); return; }
          if (monto <= 0) { KF.aviso('Monto inválido', 'error'); return; }

          var categoria = categoriaSel;
          if (categoriaSel === '__otra__') {
            if (!catOtra) { KF.aviso('Escribe el nombre de la categoría', 'error'); return; }
            categoria = catOtra;
            agregarCatCustom(tipo, catOtra);
          }
          if (!categoria) { KF.aviso('Elige una categoría', 'error'); return; }

          var lista = leerIngresos();
          if (i) {
            var ef = KF.leer('efectivo', []).filter(function (m) {
              return !(m.referencia === 'ingresos' && m.refId === i.id);
            });
            KF.escribir('efectivo', ef);

            var idx = lista.findIndex(function (x) { return x.id === i.id; });
            lista[idx] = {
              id: i.id, fecha: i.fecha, concepto: concepto, monto: monto,
              tipo: tipo, categoria: categoria, notas: notas, actualizado: KF.ahora()
            };
          } else {
            lista.push({
              id: KF.id(), fecha: KF.ahora(), concepto: concepto, monto: monto,
              tipo: tipo, categoria: categoria, notas: notas, creado: KF.ahora()
            });
          }
          guardarIngresos(lista);

          var guardado = i ? lista.find(function (x) { return x.id === i.id; }) : lista[lista.length - 1];

          var ef2 = KF.leer('efectivo', []);
          ef2.push({
            id: KF.id(), fecha: KF.ahora(), tipo: 'ingreso', monto: monto,
            concepto: 'Ingreso: ' + concepto + ' (' + categoria + ')',
            referencia: 'ingresos', refId: guardado.id
          });
          KF.escribir('efectivo', ef2);

          KF.cerrarModal();
          KF.aviso(i ? 'Ingreso actualizado' : 'Ingreso registrado', 'ok');
          pintar();
        }
      });

      // Poblar categorias segun el tipo
      var selTipo = document.getElementById('i-tipo');
      var selCat = document.getElementById('i-categoria');
      var wrapOtra = document.getElementById('i-cat-otra-wrap');
      var inpOtra = document.getElementById('i-cat-otra');

      function actualizarVisibilidadOtra() {
        var esOtra = selCat.value === '__otra__';
        wrapOtra.style.display = esOtra ? 'block' : 'none';
      }

      function poblarCategorias() {
        var tipo = selTipo.value;
        var cats = categoriasDeTipo(tipo);
        var html = '';
        var esCustom = datos.categoria && cats.indexOf(datos.categoria) === -1;

        cats.forEach(function (c) {
          var sel = (datos.categoria === c) ? ' selected' : '';
          html += '<option value="' + KF.esc(c) + '"' + sel + '>' + KF.esc(c) + '</option>';
        });

        if (esCustom) {
          html += '<option value="' + KF.esc(datos.categoria) + '" selected>' + KF.esc(datos.categoria) + '</option>';
        }

        html += '<option value="__otra__">Otros (escribir nombre)</option>';
        selCat.innerHTML = html;
        actualizarVisibilidadOtra();
      }

      selTipo.addEventListener('change', function () {
        var tipo = selTipo.value;
        var cats = categoriasDeTipo(tipo);
        datos.categoria = cats.length ? cats[0] : '';
        poblarCategorias();
      });

      selCat.addEventListener('change', actualizarVisibilidadOtra);

      poblarCategorias();

      setTimeout(function () {
        var el = document.getElementById('i-concepto');
        if (el && !i) el.focus();
      }, 100);
    }

    function eliminar(id) {
      var i = leerIngresos().find(function (x) { return x.id === id; });
      if (!i) return;
      KF.confirmar('¿Eliminar "' + i.concepto + '"? También se quitará de Efectivo.', function () {
        var lista = leerIngresos().filter(function (x) { return x.id !== id; });
        guardarIngresos(lista);
        var ef = KF.leer('efectivo', []).filter(function (m) {
          return !(m.referencia === 'ingresos' && m.refId === id);
        });
        KF.escribir('efectivo', ef);
        KF.aviso('Ingreso eliminado', 'ok');
        pintar();
      });
    }

    pintar();
  }
});