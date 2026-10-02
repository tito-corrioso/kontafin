/* =====================================================
   Modulo: Efectivo (Caja)
   - Saldo actual del negocio
   - Todos los movimientos (ingresos / egresos)
   - Recibe movimientos automaticos de otros modulos
   - Permite ajuste manual (entrada/salida sin contrapartida)
   ===================================================== */

KF.registrarModulo({
  id: 'efectivo',
  nombre: 'Efectivo',
  icono: '💵',
  orden: 4,
  render: function (cont) {

    var MODULO = 'efectivo';
    var filtroFecha = 'hoy';

    function leerMovs() { return KF.leer(MODULO, []); }
    function guardarMovs(l) { KF.escribir(MODULO, l); }

    function rangoSegunFiltro() {
      var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      var d = new Date(hoy);
      if (filtroFecha === 'semana') d.setDate(hoy.getDate() - 6);
      if (filtroFecha === 'mes')    d.setDate(1);
      if (filtroFecha === 'todo')   d = new Date(0);
      return d.getTime();
    }
    function dentro(iso) { return new Date(iso).getTime() >= rangoSegunFiltro(); }

    // ---------- Interfaz ----------
    function pintar() {
      var todos = leerMovs();

      // Saldo total acumulado (siempre con todos los movimientos)
      var saldoTotal = 0;
      todos.forEach(function (m) {
        saldoTotal += (m.tipo === 'ingreso' ? 1 : -1) * KF.num(m.monto);
      });

      // Movimientos del periodo filtrado
      var movs = todos.filter(function (m) { return dentro(m.fecha); });
      var ingresosP = 0, egresosP = 0;
      movs.forEach(function (m) {
        if (m.tipo === 'ingreso') ingresosP += KF.num(m.monto);
        else egresosP += KF.num(m.monto);
      });

      var html = '';
      html += '<div class="kf-titulo-modulo">💵 Efectivo</div>';
      html += '<div class="kf-subtitulo">Control de caja del negocio</div>';

      // Tarjeta de saldo grande
      html += '<div class="kf-card" style="text-align:center;">';
      html += '<div class="lbl" style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#7b8a9a;">Saldo actual en caja</div>';
      html += '<div style="font-size:30px;font-weight:800;color:' + (saldoTotal >= 0 ? 'var(--verde)' : 'var(--rojo)') + ';margin-top:6px;">' + KF.dinero(saldoTotal) + '</div>';
      html += '</div>';

      // Filtros
      html += '<select id="kf-ef-filtro" class="kf-buscador" style="padding-left:12px;background-image:none;margin-bottom:12px;">';
      html += '<option value="hoy"' + (filtroFecha === 'hoy' ? ' selected' : '') + '>Hoy</option>';
      html += '<option value="semana"' + (filtroFecha === 'semana' ? ' selected' : '') + '>Últimos 7 días</option>';
      html += '<option value="mes"' + (filtroFecha === 'mes' ? ' selected' : '') + '>Este mes</option>';
      html += '<option value="todo"' + (filtroFecha === 'todo' ? ' selected' : '') + '>Todo</option>';
      html += '</select>';

      // Resumen periodo
      html += '<div class="kf-grid-resumen">';
      html += '<div class="kf-mini-card positivo"><div class="lbl">Ingresos</div><div class="val">' + KF.dinero(ingresosP) + '</div></div>';
      html += '<div class="kf-mini-card negativo"><div class="lbl">Egresos</div><div class="val">' + KF.dinero(egresosP) + '</div></div>';
      html += '<div class="kf-mini-card acento"><div class="lbl">Neto del período</div><div class="val">' + KF.dinero(ingresosP - egresosP) + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Movimientos</div><div class="val">' + movs.length + '</div></div>';
      html += '</div>';

      // Botones
      html += '<div class="kf-fila" style="margin-bottom:12px;">';
      html += '<button class="kf-btn kf-btn-verde" id="kf-ef-ing" type="button">+ Entrada manual</button>';
      html += '<button class="kf-btn kf-btn-rojo" id="kf-ef-egr" type="button">- Salida manual</button>';
      html += '</div>';

      html += '<div id="kf-ef-lista"></div>';

      cont.innerHTML = html;

      document.getElementById('kf-ef-filtro').addEventListener('change', function (e) {
        filtroFecha = e.target.value; pintar();
      });
      document.getElementById('kf-ef-ing').addEventListener('click', function () { abrirAjuste('ingreso'); });
      document.getElementById('kf-ef-egr').addEventListener('click', function () { abrirAjuste('egreso'); });

      pintarLista(movs);
    }

    function pintarLista(movs) {
      var cont = document.getElementById('kf-ef-lista');
      if (!cont) return;

      if (!movs.length) {
        cont.innerHTML = '<div class="kf-vacio"><span class="kf-vacio-icono">💵</span>No hay movimientos en este período.</div>';
        return;
      }

      movs = movs.slice().sort(function (a, b) {
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      });

      var html = '';
      movs.forEach(function (m) {
        var esIng = m.tipo === 'ingreso';
        var color = esIng ? 'var(--verde)' : 'var(--rojo)';
        var signo = esIng ? '+' : '-';
        html += '<div class="kf-item" style="border-left-color:' + color + ';">';
        html += '<div class="kf-item-cab">';
        html += '<div class="kf-item-nombre">' + KF.esc(m.concepto || '(sin concepto)') + '</div>';
        html += '<div style="font-weight:800;color:' + color + ';white-space:nowrap;">' + signo + ' ' + KF.dinero(m.monto) + '</div>';
        html += '</div>';
        html += '<div class="kf-item-datos">';
        html += '<div style="grid-column:1/-1;color:#7b8a9a;font-size:12px;">' + formatearFecha(m.fecha) + (m.referencia ? ' · ' + KF.esc(m.referencia) : '') + '</div>';
        html += '</div>';
        // Solo los ajustes manuales se pueden eliminar aqui.
        // Los movimientos generados por otros modulos se anulan desde su modulo origen.
        if (!m.referencia || m.referencia === 'manual') {
          html += '<div class="kf-item-acciones">';
          html += '<button class="kf-btn kf-btn-rojo kf-btn-chico" data-accion="eliminar" data-id="' + m.id + '">Eliminar</button>';
          html += '</div>';
        }
        html += '</div>';
      });
      cont.innerHTML = html;

      var botones = cont.querySelectorAll('button[data-accion="eliminar"]');
      for (var i = 0; i < botones.length; i++) {
        botones[i].addEventListener('click', function (e) {
          eliminarMov(e.currentTarget.getAttribute('data-id'));
        });
      }
    }

    function formatearFecha(iso) {
      var d = new Date(iso);
      return String(d.getDate()).padStart(2, '0') + '/' +
             String(d.getMonth() + 1).padStart(2, '0') + ' ' +
             String(d.getHours()).padStart(2, '0') + ':' +
             String(d.getMinutes()).padStart(2, '0');
    }

    // ---------- Ajuste manual ----------
    function abrirAjuste(tipo) {
      var esIng = tipo === 'ingreso';
      var contenido = '';
      contenido += '<div class="kf-campo"><label>Monto</label><input type="number" step="0.01" inputmode="decimal" id="e-monto" value="0.00"></div>';
      contenido += '<div class="kf-campo"><label>Concepto</label><input type="text" id="e-concepto" placeholder="Ej: ' + (esIng ? 'Aporte del dueño' : 'Pago de luz') + '"></div>';

      KF.abrirModal({
        titulo: esIng ? 'Entrada manual' : 'Salida manual',
        contenido: contenido,
        textoGuardar: 'Guardar',
        alGuardar: function () {
          var monto = KF.num(document.getElementById('e-monto').value);
          var concepto = document.getElementById('e-concepto').value.trim();
          if (monto <= 0) { KF.aviso('Monto inválido', 'error'); return; }
          if (!concepto)  { KF.aviso('Escribe un concepto', 'error'); return; }

          var movs = leerMovs();
          movs.push({
            id: KF.id(),
            fecha: KF.ahora(),
            tipo: tipo,
            monto: monto,
            concepto: concepto,
            referencia: 'manual',
            refId: null
          });
          guardarMovs(movs);
          KF.cerrarModal();
          KF.aviso('Movimiento guardado', 'ok');
          pintar();
        }
      });

      setTimeout(function () {
        var el = document.getElementById('e-monto');
        if (el) el.focus();
      }, 100);
    }

    // ---------- Eliminar movimiento manual ----------
    function eliminarMov(id) {
      KF.confirmar('¿Eliminar este movimiento?', function () {
        var movs = leerMovs().filter(function (m) { return m.id !== id; });
        guardarMovs(movs);
        KF.aviso('Movimiento eliminado', 'ok');
        pintar();
      });
    }

    pintar();
  }
});