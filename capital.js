/* =====================================================
   Modulo: Capital
   Aportes y retiros del dueño.
   - Aporte: entrada a Efectivo
   - Retiro: salida de Efectivo
   - Muestra el capital aportado neto + utilidades acumuladas
   ===================================================== */

KF.registrarModulo({
  id: 'capital',
  nombre: 'Capital',
  icono: '🏦',
  orden: 10,
  render: function (cont) {

    var MODULO = 'capital';

    function leerMovs() { return KF.leer(MODULO, []); }
    function guardarMovs(l) { KF.escribir(MODULO, l); }

    // ---------- Calculo de utilidades acumuladas (lee de otros modulos) ----------
    function calcularUtilidadesAcumuladas() {
      var ventas   = KF.leer('ventas', []);
      var gastos   = KF.leer('gastos', []);
      var ingresos = KF.leer('ingresos', []);

      var gananciaVentas = 0;
      ventas.forEach(function (v) { gananciaVentas += KF.num(v.ganancia); });

      var totalGastos = 0;
      gastos.forEach(function (g) { totalGastos += KF.num(g.monto); });

      var totalIngresos = 0;
      ingresos.forEach(function (i) { totalIngresos += KF.num(i.monto); });

      return gananciaVentas + totalIngresos - totalGastos;
    }

    function pintar() {
      var movs = leerMovs();

      var aportes = 0, retiros = 0;
      movs.forEach(function (m) {
        if (m.tipo === 'aporte') aportes += KF.num(m.monto);
        else retiros += KF.num(m.monto);
      });
      var netoAportado = aportes - retiros;
      var utilidades = calcularUtilidadesAcumuladas();
      var capitalTotal = netoAportado + utilidades;

      var html = '';
      html += '<div class="kf-titulo-modulo">🏦 Capital</div>';
      html += '<div class="kf-subtitulo">Dinero aportado por el dueño y resultado acumulado</div>';

      // Tarjeta grande
      html += '<div class="kf-card" style="text-align:center;">';
      html += '<div class="lbl" style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#7b8a9a;">Capital total del negocio</div>';
      html += '<div style="font-size:30px;font-weight:800;color:' + (capitalTotal >= 0 ? 'var(--verde)' : 'var(--rojo)') + ';margin-top:6px;">' + KF.dinero(capitalTotal) + '</div>';
      html += '<div style="font-size:12px;color:#7b8a9a;margin-top:4px;">Aportado neto: ' + KF.dinero(netoAportado) + ' · Utilidades: ' + KF.dinero(utilidades) + '</div>';
      html += '</div>';

      html += '<div class="kf-grid-resumen">';
      html += '<div class="kf-mini-card positivo"><div class="lbl">Aportes</div><div class="val">' + KF.dinero(aportes) + '</div></div>';
      html += '<div class="kf-mini-card negativo"><div class="lbl">Retiros</div><div class="val">' + KF.dinero(retiros) + '</div></div>';
      html += '</div>';

      html += '<div class="kf-fila" style="margin-bottom:12px;">';
      html += '<button class="kf-btn kf-btn-verde" id="kf-cap-ap" type="button">+ Aporte</button>';
      html += '<button class="kf-btn kf-btn-rojo" id="kf-cap-re" type="button">- Retiro</button>';
      html += '</div>';

      html += '<div class="kf-card-titulo" style="margin:4px 2px 8px 2px;">Historial de movimientos</div>';
      html += '<div id="kf-cap-lista"></div>';

      cont.innerHTML = html;

      document.getElementById('kf-cap-ap').addEventListener('click', function () { abrirForm('aporte'); });
      document.getElementById('kf-cap-re').addEventListener('click', function () { abrirForm('retiro'); });

      pintarLista(movs);
    }

    function pintarLista(movs) {
      var cont = document.getElementById('kf-cap-lista');
      if (!cont) return;

      if (!movs.length) {
        cont.innerHTML = '<div class="kf-vacio"><span class="kf-vacio-icono">🏦</span>Aún no hay aportes ni retiros registrados.</div>';
        return;
      }

      movs = movs.slice().sort(function (a, b) {
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      });

      var html = '';
      movs.forEach(function (m) {
        var esAporte = m.tipo === 'aporte';
        var color = esAporte ? 'var(--verde)' : 'var(--rojo)';
        var signo = esAporte ? '+' : '-';
        html += '<div class="kf-item" style="border-left-color:' + color + ';">';
        html += '<div class="kf-item-cab">';
        html += '<div class="kf-item-nombre">' + KF.esc(m.concepto || (esAporte ? 'Aporte' : 'Retiro')) + '</div>';
        html += '<div style="font-weight:800;color:' + color + ';white-space:nowrap;">' + signo + ' ' + KF.dinero(m.monto) + '</div>';
        html += '</div>';
        html += '<div class="kf-item-datos">';
        html += '<div style="grid-column:1/-1;color:#7b8a9a;font-size:12px;">' + formatearFecha(m.fecha) + '</div>';
        html += '</div>';
        html += '<div class="kf-item-acciones">';
        html += '<button class="kf-btn kf-btn-rojo kf-btn-chico" data-accion="eliminar" data-id="' + m.id + '">Eliminar</button>';
        html += '</div></div>';
      });
      cont.innerHTML = html;

      var btns = cont.querySelectorAll('button[data-accion="eliminar"]');
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', function (e) {
          eliminar(e.currentTarget.getAttribute('data-id'));
        });
      }
    }

    function formatearFecha(iso) {
      var d = new Date(iso);
      return String(d.getDate()).padStart(2, '0') + '/' +
             String(d.getMonth() + 1).padStart(2, '0') + '/' +
             d.getFullYear() + ' ' +
             String(d.getHours()).padStart(2, '0') + ':' +
             String(d.getMinutes()).padStart(2, '0');
    }

    function abrirForm(tipo) {
      var esAporte = tipo === 'aporte';
      var contenido = '';
      contenido += '<div class="kf-campo"><label>Monto</label><input type="number" step="0.01" inputmode="decimal" id="cap-monto" value="0.00"></div>';
      contenido += '<div class="kf-campo"><label>Concepto (opcional)</label><input type="text" id="cap-concepto" placeholder="' + (esAporte ? 'Aporte inicial' : 'Retiro personal') + '"></div>';

      KF.abrirModal({
        titulo: esAporte ? 'Registrar aporte' : 'Registrar retiro',
        contenido: contenido,
        textoGuardar: 'Guardar',
                alGuardar: function () {
          if (KF.diaCerrado(KF.hoy())) {
            KF.aviso('El día ya está cerrado. No se pueden registrar movimientos de capital.', 'error');
            return;
          }
          var monto = KF.num(document.getElementById('cap-monto').value);
          var concepto = document.getElementById('cap-concepto').value.trim();
          if (monto <= 0) { KF.aviso('Monto inválido', 'error'); return; }

          var movs = leerMovs();
          movs.push({
            id: KF.id(), fecha: KF.ahora(), tipo: tipo, monto: monto,
            concepto: concepto || (esAporte ? 'Aporte' : 'Retiro')
          });
          guardarMovs(movs);

          // Afectar Efectivo
          var ef = KF.leer('efectivo', []);
          ef.push({
            id: KF.id(), fecha: KF.ahora(),
            tipo: esAporte ? 'ingreso' : 'egreso',
            monto: monto,
            concepto: 'Capital: ' + (concepto || (esAporte ? 'Aporte' : 'Retiro')),
            referencia: 'capital', refId: movs[movs.length - 1].id
          });
          KF.escribir('efectivo', ef);

          KF.cerrarModal();
          KF.aviso(esAporte ? 'Aporte registrado' : 'Retiro registrado', 'ok');
          pintar();
        }
      });

      setTimeout(function () {
        var el = document.getElementById('cap-monto');
        if (el) el.focus();
      }, 100);
    }

    function eliminar(id) {
      var m = leerMovs().find(function (x) { return x.id === id; });
      if (!m) return;
      KF.confirmar('¿Eliminar este movimiento? También se revertirá en Efectivo.', function () {
        var lista = leerMovs().filter(function (x) { return x.id !== id; });
        guardarMovs(lista);
        var ef = KF.leer('efectivo', []).filter(function (x) {
          return !(x.referencia === 'capital' && x.refId === id);
        });
        KF.escribir('efectivo', ef);
        KF.aviso('Movimiento eliminado', 'ok');
        pintar();
      });
    }

    pintar();
  }
});
