/* =====================================================
   Modulo: Gastos
   - Cada gasto tiene TIPO (Ventas / Admin / Financieros / Otros)
     y CATEGORIA dentro de ese tipo
   - Dos selectores independientes
   - Al elegir "Otros" se abre input para el nombre real
   - Las categorias personalizadas se guardan por negocio
   - Cada gasto resta de Efectivo
   ===================================================== */

KF.registrarModulo({
  id: 'gastos',
  nombre: 'Gastos',
  icono: '🧮',
  orden: 5,
  render: function (cont) {

    var MODULO = 'gastos';
    var filtroFecha = 'mes';

    // Tipos de gasto
    var TIPOS = [
      { id: 'ventas',      nombre: 'Gastos de Ventas' },
      { id: 'admin',       nombre: 'Gastos de Administración' },
      { id: 'financieros', nombre: 'Gastos Financieros' },
      { id: 'otros',       nombre: 'Otros Gastos' }
    ];

    // Categorias base por tipo
    var CATS_BASE = {
      ventas:      ['Publicidad', 'Comisiones', 'Transporte', 'Empaque', 'Promociones'],
      admin:       ['Alquiler', 'Salarios', 'Servicios', 'Mantenimiento', 'Papelería', 'Limpieza', 'Impuestos'],
      financieros: ['Intereses', 'Comisiones bancarias', 'Impuestos financieros'],
      otros:       ['Varios']
    };

    // ---------- Categorias personalizadas (por negocio) ----------
    function leerCatCustom() {
      var obj = KF.leer('cat-gastos', {});
      return (obj && typeof obj === 'object') ? obj : {};
    }
    function guardarCatCustom(obj) {
      KF.escribir('cat-gastos', obj);
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
      return TIPOS[1]; // admin por defecto
    }
    function nombreTipo(id) {
      return tipoPorId(id).nombre;
    }

    // Inferir tipo a partir de la categoria (para registros viejos)
    function inferirTipo(categoria) {
      if (!categoria) return 'admin';
      var tipos = Object.keys(CATS_BASE);
      for (var i = 0; i < tipos.length; i++) {
        if (CATS_BASE[tipos[i]].indexOf(categoria) !== -1) return tipos[i];
      }
      var custom = leerCatCustom();
      for (var t in custom) {
        if ((custom[t] || []).indexOf(categoria) !== -1) return t;
      }
      return 'admin';
    }
    function normalizar(g) {
      if (!g.tipo) g.tipo = inferirTipo(g.categoria);
      return g;
    }

    // ---------- Lectura / escritura ----------
    function leerGastos() {
      var lista = KF.leer(MODULO, []);
      lista.forEach(normalizar);
      return lista;
    }
    function guardarGastos(l) { KF.escribir(MODULO, l); }

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
      var todos = leerGastos();
      var lista = todos.filter(function (g) { return dentro(g.fecha); });

      var total = 0;
      var porTipo = {};
      TIPOS.forEach(function (t) { porTipo[t.id] = 0; });
      lista.forEach(function (g) {
        var m = KF.num(g.monto);
        total += m;
        var t = g.tipo || 'admin';
        porTipo[t] = (porTipo[t] || 0) + m;
      });

      // Desglose por categoria (con tipo)
      var porCat = {};
      lista.forEach(function (g) {
        var m = KF.num(g.monto);
        var cat = g.categoria || 'Otros';
        var t = g.tipo || 'admin';
        var key = t + '|' + cat;
        if (!porCat[key]) porCat[key] = { tipo: t, categoria: cat, monto: 0 };
        porCat[key].monto += m;
      });
      var topCats = Object.keys(porCat).map(function (k) { return porCat[k]; })
        .sort(function (a, b) { return b.monto - a.monto; });

      var html = '';
      html += '<div class="kf-titulo-modulo">🧮 Gastos</div>';
      html += '<div class="kf-subtitulo">Gastos de ventas, administración y financieros</div>';

      html += '<select id="kf-g-filtro" class="kf-buscador" style="padding-left:12px;background-image:none;margin-bottom:12px;">';
      html += '<option value="hoy"'    + (filtroFecha==='hoy'   ?' selected':'') + '>Hoy</option>';
      html += '<option value="semana"' + (filtroFecha==='semana'?' selected':'') + '>Últimos 7 días</option>';
      html += '<option value="mes"'    + (filtroFecha==='mes'   ?' selected':'') + '>Este mes</option>';
      html += '<option value="todo"'   + (filtroFecha==='todo'  ?' selected':'') + '>Todo</option>';
      html += '</select>';

      html += '<div class="kf-grid-resumen">';
      html += '<div class="kf-mini-card negativo"><div class="lbl">Total gastos</div><div class="val">' + KF.dinero(total) + '</div></div>';
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
        html += '<b style="color:var(--azul-medio);">' + KF.dinero(monto) + '</b>';
        html += '</div>';
        html += '<div style="height:6px;background:var(--gris-borde);border-radius:4px;overflow:hidden;margin-top:3px;">';
        html += '<div style="height:100%;background:var(--azul-claro);width:' + pct.toFixed(1) + '%;"></div>';
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
          html += '<b style="color:var(--azul-medio);">' + KF.dinero(c.monto) + '</b>';
          html += '</div>';
          html += '<div style="height:6px;background:var(--gris-borde);border-radius:4px;overflow:hidden;margin-top:3px;">';
          html += '<div style="height:100%;background:var(--azul-claro);width:' + pct.toFixed(1) + '%;"></div>';
          html += '</div></div>';
        });
        html += '</div>';
      }

      html += '<button class="kf-btn kf-btn-dorado kf-btn-bloque" id="kf-g-add" type="button" style="margin-bottom:12px;">+ Registrar gasto</button>';
      html += '<div id="kf-g-lista"></div>';

      cont.innerHTML = html;

      document.getElementById('kf-g-add').addEventListener('click', function () { abrirFormulario(); });
      document.getElementById('kf-g-filtro').addEventListener('change', function (e) {
        filtroFecha = e.target.value; pintar();
      });

      pintarLista(lista);
    }

    function pintarLista(lista) {
      var cont = document.getElementById('kf-g-lista');
      if (!cont) return;

      if (!lista.length) {
        cont.innerHTML = '<div class="kf-vacio"><span class="kf-vacio-icono">🧮</span>No hay gastos en este período.</div>';
        return;
      }

      lista = lista.slice().sort(function (a, b) {
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      });

      var html = '';
      lista.forEach(function (g) {
        var t = tipoPorId(g.tipo || 'admin');
        html += '<div class="kf-item" style="border-left-color:var(--rojo);">';
        html += '<div class="kf-item-cab">';
        html += '<div class="kf-item-nombre">' + KF.esc(g.concepto || '(sin concepto)') + '</div>';
        html += '<div style="font-weight:800;color:var(--rojo);white-space:nowrap;">- ' + KF.dinero(g.monto) + '</div>';
        html += '</div>';
        html += '<div style="margin-bottom:6px;"><span class="kf-badge kf-badge-dorado" style="font-size:10px;">' + KF.esc(t.nombre) + '</span></div>';
        html += '<div class="kf-item-datos">';
        html += '<div>Categoría: <b>' + KF.esc(g.categoria || 'Otros') + '</b></div>';
        html += '<div>Fecha: <b>' + formatearFecha(g.fecha) + '</b></div>';
        if (g.notas) html += '<div style="grid-column:1/-1;">Notas: <b>' + KF.esc(g.notas) + '</b></div>';
        html += '</div>';
        html += '<div class="kf-item-acciones">';
        html += '<button class="kf-btn kf-btn-gris kf-btn-chico" data-accion="editar" data-id="' + g.id + '">Editar</button>';
        html += '<button class="kf-btn kf-btn-rojo kf-btn-chico" data-accion="eliminar" data-id="' + g.id + '">Eliminar</button>';
        html += '</div></div>';
      });
      cont.innerHTML = html;

      var btns = cont.querySelectorAll('button[data-accion]');
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', function (e) {
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
      var g = id ? leerGastos().find(function (x) { return x.id === id; }) : null;
      var datos = g || { concepto: '', monto: '', tipo: 'admin', categoria: 'Alquiler', notas: '' };
      if (!datos.tipo) datos.tipo = 'admin';

      var opsTipo = TIPOS.map(function (t) {
        return '<option value="' + t.id + '"' + (datos.tipo === t.id ? ' selected' : '') + '>' + KF.esc(t.nombre) + '</option>';
      }).join('');

      var contenido = '';
      contenido += '<div class="kf-campo"><label>Concepto</label><input type="text" id="g-concepto" value="' + KF.esc(datos.concepto) + '" placeholder="Ej: Pago de luz"></div>';
      contenido += '<div class="kf-campo"><label>Monto</label><input type="number" step="0.01" inputmode="decimal" id="g-monto" value="' + KF.esc(datos.monto) + '" placeholder="0.00"></div>';
      contenido += '<div class="kf-campo"><label>Tipo de gasto</label><select id="g-tipo">' + opsTipo + '</select></div>';
      contenido += '<div class="kf-campo"><label>Categoría</label><select id="g-categoria"></select></div>';
      contenido += '<div class="kf-campo" id="g-cat-otra-wrap" style="display:none;"><label>Nombre de la categoría</label><input type="text" id="g-cat-otra" placeholder="Ej: Publicidad Instagram"></div>';
      contenido += '<div class="kf-campo"><label>Notas (opcional)</label><input type="text" id="g-notas" value="' + KF.esc(datos.notas || '') + '"></div>';

      KF.abrirModal({
        titulo: g ? 'Editar gasto' : 'Nuevo gasto',
        contenido: contenido,
        textoGuardar: g ? 'Guardar cambios' : 'Registrar gasto',
        alGuardar: function () {
          if (KF.diaCerrado(KF.hoy())) {
            KF.aviso('El día ya está cerrado. No se pueden registrar gastos.', 'error');
            return;
          }
          var concepto = document.getElementById('g-concepto').value.trim();
          var monto = KF.num(document.getElementById('g-monto').value);
          var tipo = document.getElementById('g-tipo').value;
          var categoriaSel = document.getElementById('g-categoria').value;
          var catOtra = document.getElementById('g-cat-otra') ? document.getElementById('g-cat-otra').value.trim() : '';
          var notas = document.getElementById('g-notas').value.trim();

          if (!concepto) { KF.aviso('Escribe un concepto', 'error'); return; }
          if (monto <= 0) { KF.aviso('Monto inválido', 'error'); return; }

          var categoria = categoriaSel;
          if (categoriaSel === '__otra__') {
            if (!catOtra) { KF.aviso('Escribe el nombre de la categoría', 'error'); return; }
            categoria = catOtra;
            agregarCatCustom(tipo, catOtra);
          }
          if (!categoria) { KF.aviso('Elige una categoría', 'error'); return; }

          var lista = leerGastos();
          if (g) {
            var ef = KF.leer('efectivo', []).filter(function (m) {
              return !(m.referencia === 'gastos' && m.refId === g.id);
            });
            KF.escribir('efectivo', ef);

            var i = lista.findIndex(function (x) { return x.id === g.id; });
            lista[i] = {
              id: g.id, fecha: g.fecha, concepto: concepto, monto: monto,
              tipo: tipo, categoria: categoria, notas: notas, actualizado: KF.ahora()
            };
          } else {
            lista.push({
              id: KF.id(), fecha: KF.ahora(), concepto: concepto, monto: monto,
              tipo: tipo, categoria: categoria, notas: notas, creado: KF.ahora()
            });
          }
          guardarGastos(lista);

          var guardado = lista[lista.length - 1];
          if (g) guardado = lista.find(function (x) { return x.id === g.id; });

          var ef2 = KF.leer('efectivo', []);
          ef2.push({
            id: KF.id(), fecha: KF.ahora(), tipo: 'egreso', monto: monto,
            concepto: 'Gasto: ' + concepto + ' (' + categoria + ')',
            referencia: 'gastos', refId: guardado.id
          });
          KF.escribir('efectivo', ef2);

          KF.cerrarModal();
          KF.aviso(g ? 'Gasto actualizado' : 'Gasto registrado', 'ok');
          pintar();
        }
      });

      // Poblar categorias segun el tipo
      var selTipo = document.getElementById('g-tipo');
      var selCat = document.getElementById('g-categoria');
      var wrapOtra = document.getElementById('g-cat-otra-wrap');
      var inpOtra = document.getElementById('g-cat-otra');

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
        var el = document.getElementById('g-concepto');
        if (el && !g) el.focus();
      }, 100);
    }

    function eliminar(id) {
      var g = leerGastos().find(function (x) { return x.id === id; });
      if (!g) return;
      KF.confirmar('¿Eliminar "' + g.concepto + '"? También se quitará de Efectivo.', function () {
        var lista = leerGastos().filter(function (x) { return x.id !== id; });
        guardarGastos(lista);
        var ef = KF.leer('efectivo', []).filter(function (m) {
          return !(m.referencia === 'gastos' && m.refId === id);
        });
        KF.escribir('efectivo', ef);
        KF.aviso('Gasto eliminado', 'ok');
        pintar();
      });
    }

    pintar();
  }
});