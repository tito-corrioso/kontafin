/* =====================================================
   Modulo: Clientes y Proveedores
   Subcuentas extendidas de Cuentas por Cobrar y Pagar.
   - Agrupa todas las cuentas por cliente (o proveedor)
   - Muestra total pendiente por cliente/proveedor
   - Permite ver el detalle y abonar
   ===================================================== */

KF.registrarModulo({
  id: 'clientes',
  nombre: 'Clientes y Proveedores',
  icono: '👥',
  orden: 9.5,
  render: function (cont) {

    var vista = 'clientes'; // clientes | proveedores

    // ---------- Utilidades ----------
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

    // ---------- Calculo de grupos ----------
    function calcularGrupos() {
      var modulo = vista === 'clientes' ? 'cuentas-cobrar' : 'cuentas-pagar';
      var campo  = vista === 'clientes' ? 'cliente' : 'proveedor';
      var cuentas = KF.leer(modulo, []);

      var grupos = {};
      cuentas.forEach(function (c) {
        var nombre = (c[campo] || 'Sin nombre').trim();
        if (!grupos[nombre]) {
          grupos[nombre] = {
            nombre: nombre,
            telefono: c.telefono || '',
            total: 0,          // monto total facturado
            cobrado: 0,        // total ya cobrado/pagado
            pendiente: 0,      // saldo
            cuentas: []
          };
        }
        var saldo = saldoDe(c);
        var pagado = (c.pagos || []).reduce(function (s, p) { return s + KF.num(p.monto); }, 0);
        grupos[nombre].total += KF.num(c.monto);
        grupos[nombre].cobrado += pagado;
        grupos[nombre].pendiente += Math.max(0, saldo);
        if (!grupos[nombre].telefono && c.telefono) grupos[nombre].telefono = c.telefono;
        grupos[nombre].cuentas.push(c);
      });

      return Object.keys(grupos).map(function (k) { return grupos[k]; })
        .sort(function (a, b) { return b.pendiente - a.pendiente; });
    }

    // ---------- Interfaz ----------
    function pintar() {
      var grupos = calcularGrupos();

      var totalPendiente = 0, totalCobrado = 0, totalFacturado = 0;
      grupos.forEach(function (g) {
        totalPendiente += g.pendiente;
        totalCobrado += g.cobrado;
        totalFacturado += g.total;
      });

      var etiqueta = vista === 'clientes' ? 'clientes' : 'proveedores';
      var tituloAccion = vista === 'clientes' ? 'Por cobrar' : 'Por pagar';
      var colorPend = vista === 'clientes' ? 'var(--rojo)' : 'var(--rojo)';

      var html = '';
      html += '<div class="kf-titulo-modulo">👥 Clientes y Proveedores</div>';
      html += '<div class="kf-subtitulo">Saldos agrupados por persona o empresa</div>';

      // Tabs
      html += '<div class="kf-fila" style="margin-bottom:12px;">';
      html += '<button class="kf-btn ' + (vista==='clientes'?'kf-btn-primario':'kf-btn-gris') + '" data-vista="clientes">Clientes (por cobrar)</button>';
      html += '<button class="kf-btn ' + (vista==='proveedores'?'kf-btn-primario':'kf-btn-gris') + '" data-vista="proveedores">Proveedores (por pagar)</button>';
      html += '</div>';

      // Resumen
      html += '<div class="kf-grid-resumen">';
      html += '<div class="kf-mini-card ' + (totalPendiente > 0 ? 'negativo' : 'positivo') + '"><div class="lbl">' + tituloAccion + '</div><div class="val">' + KF.dinero(totalPendiente) + '</div></div>';
      html += '<div class="kf-mini-card positivo"><div class="lbl">' + (vista==='clientes'?'Cobrado':'Pagado') + '</div><div class="val">' + KF.dinero(totalCobrado) + '</div></div>';
      html += '<div class="kf-mini-card acento"><div class="lbl">Total facturado</div><div class="val">' + KF.dinero(totalFacturado) + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">' + (vista==='clientes'?'Clientes':'Proveedores') + '</div><div class="val">' + grupos.length + '</div></div>';
      html += '</div>';

      html += '<div id="kf-cl-lista"></div>';
      cont.innerHTML = html;

      // Tabs
      var btnsV = cont.querySelectorAll('button[data-vista]');
      for (var i = 0; i < btnsV.length; i++) {
        btnsV[i].addEventListener('click', function (e) {
          vista = e.currentTarget.getAttribute('data-vista');
          pintar();
        });
      }

      pintarLista(grupos, etiqueta, tituloAccion);
    }

    function pintarLista(grupos, etiqueta, tituloAccion) {
      var cont = document.getElementById('kf-cl-lista');
      if (!cont) return;

      if (!grupos.length) {
        cont.innerHTML = '<div class="kf-vacio"><span class="kf-vacio-icono">👥</span>' +
          'Aún no hay ' + etiqueta + ' registrados.</div>';
        return;
      }

      var html = '';
      grupos.forEach(function (g) {
        var pendiente = g.pendiente;
        var estadoClass = pendiente > 0 ? 'stock-bajo' : '';
        var badge = pendiente > 0
          ? '<span class="kf-badge kf-badge-rojo">' + tituloAccion + ' ' + KF.dinero(pendiente) + '</span>'
          : '<span class="kf-badge kf-badge-verde">Al día</span>';

        html += '<div class="kf-item ' + estadoClass + '" data-grupo="' + KF.esc(g.nombre) + '">';
        html += '<div class="kf-item-cab">';
        html += '<div class="kf-item-nombre">' + KF.esc(g.nombre) + '</div>';
        html += badge;
        html += '</div>';
        html += '<div class="kf-item-datos">';
        html += '<div>Total: <b>' + KF.dinero(g.total) + '</b></div>';
        html += '<div>' + (vista==='clientes'?'Cobrado':'Pagado') + ': <b>' + KF.dinero(g.cobrado) + '</b></div>';
        html += '<div style="grid-column:1/-1;">Saldo: <b style="color:' + (pendiente > 0 ? 'var(--rojo)' : 'var(--verde)') + ';">' + KF.dinero(pendiente) + '</b></div>';
        if (g.telefono) html += '<div style="grid-column:1/-1;">Teléfono: <b>' + KF.esc(g.telefono) + '</b></div>';
        html += '<div style="grid-column:1/-1;color:#7b8a9a;font-size:12px;">' + g.cuentas.length + ' cuenta' + (g.cuentas.length !== 1 ? 's' : '') + '</div>';
        html += '</div>';
        html += '<div class="kf-item-acciones">';
        html += '<button class="kf-btn kf-btn-primario kf-btn-chico" data-accion="detalle" data-grupo="' + KF.esc(g.nombre) + '">Ver detalle</button>';
        html += '</div></div>';
      });
      cont.innerHTML = html;

      var btns = cont.querySelectorAll('button[data-accion="detalle"]');
      for (var k = 0; k < btns.length; k++) {
        btns[k].addEventListener('click', function (e) {
          verDetalle(e.currentTarget.getAttribute('data-grupo'));
        });
      }
    }

    // ---------- Detalle de un grupo ----------
    function verDetalle(nombreGrupo) {
      var modulo = vista === 'clientes' ? 'cuentas-cobrar' : 'cuentas-pagar';
      var campo  = vista === 'clientes' ? 'cliente' : 'proveedor';
      var cuentas = KF.leer(modulo, []).filter(function (c) {
        return ((c[campo] || 'Sin nombre').trim() === nombreGrupo);
      });

      if (!cuentas.length) { KF.aviso('Sin cuentas', 'error'); return; }

      // Ordenar por fecha
      cuentas.sort(function (a, b) { return new Date(b.fecha).getTime() - new Date(a.fecha).getTime(); });

      var html = '';
      cuentas.forEach(function (c) {
        var est = estadoReal(c);
        var saldo = Math.max(0, saldoDe(c));
        var badge =
          est === 'pagado'  ? '<span class="kf-badge kf-badge-verde">Pagado</span>' :
          est === 'parcial' ? '<span class="kf-badge kf-badge-dorado">Parcial</span>' :
                              '<span class="kf-badge kf-badge-rojo">Pendiente</span>';

        html += '<div class="kf-item" style="border-left-color:' + (est === 'pendiente' ? 'var(--rojo)' : 'var(--azul-claro)') + ';">';
        html += '<div class="kf-item-cab">';
        html += '<div class="kf-item-nombre">' + KF.esc(c.concepto || 'Cuenta') + '</div>';
        html += badge;
        html += '</div>';
        html += '<div class="kf-item-datos">';
        html += '<div>Total: <b>' + KF.dinero(c.monto) + '</b></div>';
        html += '<div>Saldo: <b>' + KF.dinero(saldo) + '</b></div>';
        html += '<div style="grid-column:1/-1;color:#7b8a9a;font-size:12px;">' + fechaCorta(c.fecha) + '</div>';
        html += '</div>';
        if (est !== 'pagado') {
          html += '<div class="kf-item-acciones">';
          html += '<button class="kf-btn kf-btn-verde kf-btn-chico" data-accion="abonar" data-id="' + c.id + '">' + (vista === 'clientes' ? 'Abonar' : 'Pagar') + '</button>';
          html += '</div>';
        }
        html += '</div>';
      });

      KF.abrirModal({
        titulo: nombreGrupo,
        contenido: html,
        alGuardar: null
      });

      // Enlazar botones abonar/pagar
      var btns = document.querySelectorAll('#kf-modal-cuerpo button[data-accion="abonar"]');
      for (var k = 0; k < btns.length; k++) {
        btns[k].addEventListener('click', function (e) {
          abonarDesdeDetalle(e.currentTarget.getAttribute('data-id'), nombreGrupo);
        });
      }
    }

    function fechaCorta(iso) {
      var d = new Date(iso);
      return String(d.getDate()).padStart(2, '0') + '/' +
             String(d.getMonth() + 1).padStart(2, '0') + '/' +
             d.getFullYear();
    }

    // ---------- Abonar desde el detalle ----------
    function abonarDesdeDetalle(id, nombreGrupo) {
      var modulo = vista === 'clientes' ? 'cuentas-cobrar' : 'cuentas-pagar';
      var c = KF.leer(modulo, []).find(function (x) { return x.id === id; });
      if (!c) return;
      var saldo = saldoDe(c);
      var etiquetaAccion = vista === 'clientes' ? 'abono' : 'pago';

      KF.cerrarModal();

      var contenido = '';
      contenido += '<div style="background:var(--azul-suave);padding:10px;border-radius:8px;margin-bottom:12px;font-size:13px;color:var(--azul-medio);">';
      contenido += 'Cuenta: <b>' + KF.esc(c.concepto || 'Cuenta') + '</b><br>';
      contenido += 'Saldo pendiente: <b>' + KF.dinero(saldo) + '</b>';
      contenido += '</div>';
      contenido += '<div class="kf-campo"><label>Monto del ' + etiquetaAccion + '</label><input type="number" step="0.01" inputmode="decimal" id="ca-monto" value="' + saldo.toFixed(2) + '"></div>';
      contenido += '<div class="kf-campo"><label>Notas (opcional)</label><input type="text" id="ca-notas"></div>';

      KF.abrirModal({
        titulo: 'Registrar ' + etiquetaAccion,
        contenido: contenido,
        textoGuardar: 'Registrar',
        alGuardar: function () {
          var monto = KF.num(document.getElementById('ca-monto').value);
          var notas = document.getElementById('ca-notas').value.trim();
          if (monto <= 0) { KF.aviso('Monto inválido', 'error'); return; }
          if (monto > saldo + 0.001) { KF.aviso('El monto supera el saldo', 'error'); return; }

          var lista = KF.leer(modulo, []);
          var idx = lista.findIndex(function (x) { return x.id === id; });
          if (idx < 0) return;
          if (!lista[idx].pagos) lista[idx].pagos = [];
          lista[idx].pagos.push({ fecha: KF.ahora(), monto: monto, notas: notas });
          lista[idx].estado = estadoReal(lista[idx]);
          KF.escribir(modulo, lista);

          // Efecto en Efectivo
          var ef = KF.leer('efectivo', []);
          ef.push({
            id: KF.id(), fecha: KF.ahora(),
            tipo: vista === 'clientes' ? 'ingreso' : 'egreso',
            monto: monto,
            concepto: (vista === 'clientes' ? 'Abono CxC: ' : 'Pago CxP: ') + nombreGrupo,
            referencia: modulo,
            refId: id
          });
          KF.escribir('efectivo', ef);

          KF.cerrarModal();
          KF.aviso(vista === 'clientes' ? 'Abono registrado' : 'Pago registrado', 'ok');
          pintar();
        }
      });

      setTimeout(function () {
        var el = document.getElementById('ca-monto');
        if (el) el.focus();
      }, 100);
    }

    pintar();
  }
});