/* =====================================================
   Modulo: Gastos
   Gastos operativos del negocio (luz, agua, alquiler,
   salarios, transporte, etc).
   Cada gasto resta de Efectivo.
   ===================================================== */

KF.registrarModulo({
  id: 'gastos',
  nombre: 'Gastos',
  icono: '🧮',
  orden: 5,
  render: function (cont) {

    var MODULO = 'gastos';
    var filtroFecha = 'mes';
    var CATEGORIAS = ['Alquiler', 'Salarios', 'Servicios', 'Transporte',
                      'Mantenimiento', 'Impuestos', 'Publicidad', 'Otros'];

    function leerGastos() { return KF.leer(MODULO, []); }
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

    function pintar() {
      var todos = leerGastos();
      var lista = todos.filter(function (g) { return dentro(g.fecha); });

      var total = 0;
      var porCategoria = {};
      lista.forEach(function (g) {
        var m = KF.num(g.monto);
        total += m;
        var cat = g.categoria || 'Otros';
        porCategoria[cat] = (porCategoria[cat] || 0) + m;
      });

      // Categorias ordenadas de mayor a menor
      var topCats = Object.keys(porCategoria).map(function (c) {
        return { nombre: c, monto: porCategoria[c] };
      }).sort(function (a, b) { return b.monto - a.monto; });

      var html = '';
      html += '<div class="kf-titulo-modulo">🧮 Gastos</div>';
      html += '<div class="kf-subtitulo">Todos los gastos operativos del negocio</div>';

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

      // Desglose por categoria (si hay)
      if (topCats.length) {
        html += '<div class="kf-card">';
        html += '<div class="kf-card-titulo">Por categoría</div>';
        topCats.forEach(function (c) {
          var pct = total > 0 ? (c.monto / total * 100) : 0;
          html += '<div style="margin-bottom:8px;">';
          html += '<div style="display:flex;justify-content:space-between;font-size:13px;">';
          html += '<span>' + KF.esc(c.nombre) + '</span>';
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
        html += '<div class="kf-item" style="border-left-color:var(--rojo);">';
        html += '<div class="kf-item-cab">';
        html += '<div class="kf-item-nombre">' + KF.esc(g.concepto || '(sin concepto)') + '</div>';
        html += '<div style="font-weight:800;color:var(--rojo);white-space:nowrap;">- ' + KF.dinero(g.monto) + '</div>';
        html += '</div>';
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

    function abrirFormulario(id) {
      var g = id ? leerGastos().find(function (x) { return x.id === id; }) : null;
      var datos = g || { concepto: '', monto: '', categoria: 'Otros', notas: '' };

      var opsCat = CATEGORIAS.map(function (c) {
        return '<option value="' + KF.esc(c) + '"' + (datos.categoria === c ? ' selected' : '') + '>' + KF.esc(c) + '</option>';
      }).join('');

      var contenido = '';
      contenido += '<div class="kf-campo"><label>Concepto</label><input type="text" id="g-concepto" value="' + KF.esc(datos.concepto) + '" placeholder="Ej: Pago de luz"></div>';
      contenido += '<div class="kf-campo"><label>Monto</label><input type="number" step="0.01" inputmode="decimal" id="g-monto" value="' + KF.esc(datos.monto) + '" placeholder="0.00"></div>';
      contenido += '<div class="kf-campo"><label>Categoría</label><select id="g-categoria">' + opsCat + '</select></div>';
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
          var categoria = document.getElementById('g-categoria').value;
          var notas = document.getElementById('g-notas').value.trim();
          if (!concepto) { KF.aviso('Escribe un concepto', 'error'); return; }
          if (monto <= 0) { KF.aviso('Monto inválido', 'error'); return; }

          var lista = leerGastos();
          if (g) {
            // Edicion: revertir el anterior en caja y aplicar el nuevo
            var ef = KF.leer('efectivo', []).filter(function (m) {
              return !(m.referencia === 'gastos' && m.refId === g.id);
            });
            KF.escribir('efectivo', ef);

            var i = lista.findIndex(function (x) { return x.id === g.id; });
            lista[i] = {
              id: g.id, fecha: g.fecha, concepto: concepto, monto: monto,
              categoria: categoria, notas: notas, actualizado: KF.ahora()
            };
          } else {
            lista.push({
              id: KF.id(), fecha: KF.ahora(), concepto: concepto, monto: monto,
              categoria: categoria, notas: notas, creado: KF.ahora()
            });
          }
          guardarGastos(lista);

          var guardado = lista[lista.length - 1];
          if (g) guardado = lista.find(function (x) { return x.id === g.id; });

          // Efecto en caja
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
