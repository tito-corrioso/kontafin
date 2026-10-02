/* =====================================================
   Modulo: Cuentas por Pagar
   - Lee las compras a credito del modulo Compras
   - Permite crear cuentas manuales
   - Permite abonar (pagos parciales o totales)
   - Cada abono resta de Efectivo
   ===================================================== */

KF.registrarModulo({
  id: 'cuentas-pagar',
  nombre: 'Cuentas por Pagar',
  icono: '📤',
  orden: 8,
  render: function (cont) {

    var MODULO = 'cuentas-pagar';
    var filtroEstado = 'pendientes';

    function leerCxP() { return KF.leer(MODULO, []); }
    function guardarCxP(l) { KF.escribir(MODULO, l); }

    function saldoDe(c) {
      var total = KF.num(c.monto);
      var pagado = (c.pagos || []).reduce(function (s, p) { return s + KF.num(p.monto); }, 0);
      return total - pagado;
    }
    function estadoReal(c) {
      var s = saldoDe(c);
      if (s <= 0.001) return 'pagado';
      if ((c.pagos || []).length > 0) return 'parcial';
      return 'pendiente';
    }

    function pintar() {
      var todas = leerCxP();

      var totalPendiente = 0, totalPagado = 0;
      todas.forEach(function (c) {
        totalPendiente += Math.max(0, saldoDe(c));
        totalPagado += (c.pagos || []).reduce(function (s, p) { return s + KF.num(p.monto); }, 0);
      });

      var visibles = todas.filter(function (c) {
        if (filtroEstado === 'pendientes') return estadoReal(c) !== 'pagado';
        return true;
      });

      var html = '';
      html += '<div class="kf-titulo-modulo">📤 Cuentas por Pagar</div>';
      html += '<div class="kf-subtitulo">Dinero que debes a proveedores</div>';

      html += '<div class="kf-grid-resumen">';
      html += '<div class="kf-mini-card ' + (totalPendiente > 0 ? 'negativo' : 'positivo') + '"><div class="lbl">Por pagar</div><div class="val">' + KF.dinero(totalPendiente) + '</div></div>';
      html += '<div class="kf-mini-card positivo"><div class="lbl">Pagado</div><div class="val">' + KF.dinero(totalPagado) + '</div></div>';
      html += '</div>';

      html += '<select id="kf-cxp-filtro" class="kf-buscador" style="padding-left:12px;background-image:none;margin-bottom:12px;">';
      html += '<option value="pendientes"' + (filtroEstado==='pendientes'?' selected':'') + '>Solo pendientes</option>';
      html += '<option value="todas"' + (filtroEstado==='todas'?' selected':'') + '>Todas</option>';
      html += '</select>';

      html += '<button class="kf-btn kf-btn-dorado kf-btn-bloque" id="kf-cxp-add" type="button" style="margin-bottom:12px;">+ Añadir cuenta manual</button>';
      html += '<div id="kf-cxp-lista"></div>';

      cont.innerHTML = html;

      document.getElementById('kf-cxp-add').addEventListener('click', function () { abrirFormulario(); });
      document.getElementById('kf-cxp-filtro').addEventListener('change', function (e) {
        filtroEstado = e.target.value; pintar();
      });

      pintarLista(visibles);
    }

    function pintarLista(lista) {
      var cont = document.getElementById('kf-cxp-lista');
      if (!cont) return;

      if (!lista.length) {
        cont.innerHTML = '<div class="kf-vacio"><span class="kf-vacio-icono">📤</span>No hay cuentas por pagar pendientes.</div>';
        return;
      }

      lista = lista.slice().sort(function (a, b) {
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      });

      var html = '';
      lista.forEach(function (c) {
        var est = estadoReal(c);
        var saldo = Math.max(0, saldoDe(c));
        var badge =
          est === 'pagado'  ? '<span class="kf-badge kf-badge-verde">Pagado</span>' :
          est === 'parcial' ? '<span class="kf-badge kf-badge-dorado">Parcial</span>' :
                              '<span class="kf-badge kf-badge-rojo">Pendiente</span>';

        html += '<div class="kf-item' + (est === 'pendiente' ? ' stock-bajo' : '') + '">';
        html += '<div class="kf-item-cab">';
        html += '<div class="kf-item-nombre">' + KF.esc(c.proveedor || 'Sin nombre') + '</div>';
        html += badge;
        html += '</div>';
        html += '<div class="kf-item-datos">';
        html += '<div>Total: <b>' + KF.dinero(c.monto) + '</b></div>';
        html += '<div>Saldo: <b style="color:' + (saldo > 0 ? 'var(--rojo)' : 'var(--verde)') + ';">' + KF.dinero(saldo) + '</b></div>';
        if (c.telefono) html += '<div style="grid-column:1/-1;">Teléfono: <b>' + KF.esc(c.telefono) + '</b></div>';
        if (c.concepto) html += '<div style="grid-column:1/-1;">Concepto: <b>' + KF.esc(c.concepto) + '</b></div>';
        html += '<div style="grid-column:1/-1;color:#7b8a9a;font-size:12px;">Creada: ' + formatearFecha(c.fecha) + '</div>';
        html += '</div>';

        html += '<div class="kf-item-acciones">';
        if (est !== 'pagado') {
          html += '<button class="kf-btn kf-btn-verde kf-btn-chico" data-accion="abonar" data-id="' + c.id + '">Pagar</button>';
        }
        html += '<button class="kf-btn kf-btn-gris kf-btn-chico" data-accion="historial" data-id="' + c.id + '">Historial</button>';
        html += '<button class="kf-btn kf-btn-rojo kf-btn-chico" data-accion="eliminar" data-id="' + c.id + '">Eliminar</button>';
        html += '</div></div>';
      });
      cont.innerHTML = html;

      var btns = cont.querySelectorAll('button[data-accion]');
      for (var k = 0; k < btns.length; k++) {
        btns[k].addEventListener('click', function (e) {
          var acc = e.currentTarget.getAttribute('data-accion');
          var id = e.currentTarget.getAttribute('data-id');
          if (acc === 'abonar')    abonar(id);
          if (acc === 'historial') verHistorial(id);
          if (acc === 'eliminar')  eliminar(id);
        });
      }
    }

    function formatearFecha(iso) {
      var d = new Date(iso);
      return String(d.getDate()).padStart(2, '0') + '/' +
             String(d.getMonth() + 1).padStart(2, '0') + '/' +
             d.getFullYear();
    }

    function abrirFormulario() {
      var contenido = '';
      contenido += '<div class="kf-campo"><label>Proveedor</label><input type="text" id="cp-prov" placeholder="Nombre"></div>';
      contenido += '<div class="kf-campo"><label>Teléfono (opcional)</label><input type="tel" id="cp-tel"></div>';
      contenido += '<div class="kf-campo"><label>Monto</label><input type="number" step="0.01" inputmode="decimal" id="cp-monto" value="0.00"></div>';
      contenido += '<div class="kf-campo"><label>Concepto</label><input type="text" id="cp-concepto" placeholder="Ej: Deuda pendiente..."></div>';

      KF.abrirModal({
        titulo: 'Nueva cuenta por pagar',
        contenido: contenido,
        textoGuardar: 'Crear',
        alGuardar: function () {
          var prov = document.getElementById('cp-prov').value.trim();
          var tel = document.getElementById('cp-tel').value.trim();
          var monto = KF.num(document.getElementById('cp-monto').value);
          var concepto = document.getElementById('cp-concepto').value.trim();
          if (!prov) { KF.aviso('Escribe el proveedor', 'error'); return; }
          if (monto <= 0) { KF.aviso('Monto inválido', 'error'); return; }

          var lista = leerCxP();
          lista.push({
            id: KF.id(), fecha: KF.ahora(),
            proveedor: prov, telefono: tel, monto: monto,
            concepto: concepto || 'Cuenta manual',
            estado: 'pendiente', refCompra: null, pagos: []
          });
          guardarCxP(lista);
          KF.cerrarModal();
          KF.aviso('Cuenta creada', 'ok');
          pintar();
        }
      });

      setTimeout(function () {
        var el = document.getElementById('cp-prov');
        if (el) el.focus();
      }, 100);
    }

    function abonar(id) {
      var c = leerCxP().find(function (x) { return x.id === id; });
      if (!c) return;
      var saldo = saldoDe(c);

      var contenido = '';
      contenido += '<div style="background:var(--azul-suave);padding:10px;border-radius:8px;margin-bottom:12px;font-size:13px;color:var(--azul-medio);">';
      contenido += 'Proveedor: <b>' + KF.esc(c.proveedor) + '</b><br>';
      contenido += 'Saldo pendiente: <b>' + KF.dinero(saldo) + '</b>';
      contenido += '</div>';
      contenido += '<div class="kf-campo"><label>Monto del pago</label><input type="number" step="0.01" inputmode="decimal" id="cpb-monto" value="' + saldo.toFixed(2) + '"></div>';
      contenido += '<div class="kf-campo"><label>Notas (opcional)</label><input type="text" id="cpb-notas"></div>';

      KF.abrirModal({
        titulo: 'Registrar pago',
        contenido: contenido,
        textoGuardar: 'Registrar pago',
        alGuardar: function () {
          var monto = KF.num(document.getElementById('cpb-monto').value);
          var notas = document.getElementById('cpb-notas').value.trim();
          if (monto <= 0) { KF.aviso('Monto inválido', 'error'); return; }
          if (monto > saldo + 0.001) { KF.aviso('El pago supera el saldo', 'error'); return; }

          var lista = leerCxP();
          var idx = lista.findIndex(function (x) { return x.id === id; });
          if (!lista[idx].pagos) lista[idx].pagos = [];
          lista[idx].pagos.push({ fecha: KF.ahora(), monto: monto, notas: notas });
          lista[idx].estado = estadoReal(lista[idx]);
          guardarCxP(lista);

          var ef = KF.leer('efectivo', []);
          ef.push({
            id: KF.id(), fecha: KF.ahora(), tipo: 'egreso', monto: monto,
            concepto: 'Pago CxP: ' + c.proveedor,
            referencia: 'cuentas-pagar', refId: c.id
          });
          KF.escribir('efectivo', ef);

          KF.cerrarModal();
          KF.aviso('Pago registrado', 'ok');
          pintar();
        }
      });

      setTimeout(function () {
        var el = document.getElementById('cpb-monto');
        if (el) el.focus();
      }, 100);
    }

    function verHistorial(id) {
      var c = leerCxP().find(function (x) { return x.id === id; });
      if (!c) return;
      var pagos = c.pagos || [];

      var html = '';
      html += '<div style="font-size:13px;color:var(--azul-medio);margin-bottom:10px;">Total: <b>' + KF.dinero(c.monto) + '</b> · Saldo: <b>' + KF.dinero(saldoDe(c)) + '</b></div>';
      if (!pagos.length) {
        html += '<div class="kf-vacio">Sin pagos aún.</div>';
      } else {
        pagos.forEach(function (p) {
          html += '<div class="kf-item" style="border-left-color:var(--rojo);padding:8px 10px;">';
          html += '<div style="display:flex;justify-content:space-between;font-size:14px;">';
          html += '<span>' + formatearFecha(p.fecha) + '</span>';
          html += '<b style="color:var(--rojo);">- ' + KF.dinero(p.monto) + '</b>';
          html += '</div>';
          if (p.notas) html += '<div style="font-size:12px;color:#7b8a9a;">' + KF.esc(p.notas) + '</div>';
          html += '</div>';
        });
      }

      KF.abrirModal({
        titulo: 'Historial de pagos',
        contenido: html,
        alGuardar: null
      });
    }

    function eliminar(id) {
      var c = leerCxP().find(function (x) { return x.id === id; });
      if (!c) return;
      KF.confirmar('¿Eliminar la cuenta de "' + c.proveedor + '"? Se eliminarán también los pagos registrados.', function () {
        var lista = leerCxP().filter(function (x) { return x.id !== id; });
        guardarCxP(lista);
        var ef = KF.leer('efectivo', []).filter(function (m) {
          return !(m.referencia === 'cuentas-pagar' && m.refId === id);
        });
        KF.escribir('efectivo', ef);
        KF.aviso('Cuenta eliminada', 'ok');
        pintar();
      });
    }

    pintar();
  }
});