/* =====================================================
   Modulo: Inicio (Panel General) - Version completa
   Lee TODOS los modulos y muestra una foto real del negocio:
   - Efectivo actual
   - Utilidad del mes
   - Cuentas por cobrar y por pagar
   - Alertas de stock bajo
   - Accesos rapidos a los 6 modulos mas usados
   - Resumen de inventario y ventas del mes
   - Top 5 productos rentables
   - Resumen rapido del balance
   ===================================================== */

KF.registrarModulo({
  id: 'inicio',
  nombre: 'Inicio',
  icono: '🏠',
  orden: 0,
  render: function (cont) {

    // ---------- Utilidades internas ----------
    function inicioMes() {
      var hoy = new Date();
      return new Date(hoy.getFullYear(), hoy.getMonth(), 1).getTime();
    }

    // ---------- Lecturas de datos ----------
    function efectivoActual() {
      var saldo = 0;
      KF.leer('efectivo', []).forEach(function (m) {
        saldo += (m.tipo === 'ingreso' ? 1 : -1) * KF.num(m.monto);
      });
      return saldo;
    }

    function cxcPendiente() {
      var total = 0;
      KF.leer('cuentas-cobrar', []).forEach(function (c) {
        var pagado = (c.pagos || []).reduce(function (s, p) { return s + KF.num(p.monto); }, 0);
        total += Math.max(0, KF.num(c.monto) - pagado);
      });
      return total;
    }

    function cxpPendiente() {
      var total = 0;
      KF.leer('cuentas-pagar', []).forEach(function (c) {
        var pagado = (c.pagos || []).reduce(function (s, p) { return s + KF.num(p.monto); }, 0);
        total += Math.max(0, KF.num(c.monto) - pagado);
      });
      return total;
    }

    function utilidadMes() {
      var desde = inicioMes();
      var ganancia = 0, gastos = 0, ingresos = 0;
      KF.leer('ventas', []).forEach(function (v) {
        if (new Date(v.fecha).getTime() >= desde) ganancia += KF.num(v.ganancia);
      });
      KF.leer('gastos', []).forEach(function (g) {
        if (new Date(g.fecha).getTime() >= desde) gastos += KF.num(g.monto);
      });
      KF.leer('ingresos', []).forEach(function (i) {
        if (new Date(i.fecha).getTime() >= desde) ingresos += KF.num(i.monto);
      });
      return ganancia + ingresos - gastos;
    }

    function inventarioResumen() {
      var lista = KF.leer('inventario', []);
      var valorCosto = 0, valorVenta = 0, stockBajo = 0;
      lista.forEach(function (p) {
        var st = KF.num(p.stock);
        valorCosto += KF.num(p.costo) * st;
        valorVenta += KF.num(p.precio) * st;
        if (st <= KF.num(p.stockMinimo)) stockBajo++;
      });
      return {
        total: lista.length,
        valorCosto: valorCosto,
        valorVenta: valorVenta,
        gananciaPotencial: valorVenta - valorCosto,
        stockBajo: stockBajo
      };
    }

    function ventasMes() {
      var desde = inicioMes();
      var total = 0, ganancia = 0, count = 0;
      var porProducto = {};
      KF.leer('ventas', []).forEach(function (v) {
        if (new Date(v.fecha).getTime() >= desde) {
          total += KF.num(v.total);
          ganancia += KF.num(v.ganancia);
          count++;
          var n = v.productoNombre || '(sin nombre)';
          if (!porProducto[n]) porProducto[n] = { nombre: n, ganancia: 0, cantidad: 0 };
          porProducto[n].ganancia += KF.num(v.ganancia);
          porProducto[n].cantidad += KF.num(v.cantidad);
        }
      });
      var top = Object.keys(porProducto).map(function (k) { return porProducto[k]; })
        .sort(function (a, b) { return b.ganancia - a.ganancia; });
      return { total: total, ganancia: ganancia, count: count, top: top };
    }

    function balanceRapido() {
      var inventario = inventarioResumen().valorCosto;
      var efectivo = efectivoActual();
      var cxc = cxcPendiente();
      var activo = efectivo + inventario + cxc;
      var pasivo = cxpPendiente();
      return { activo: activo, pasivo: pasivo, patrimonio: activo - pasivo };
    }

    // ---------- Render ----------
    function pintar() {
      var neg = KF.negocioActivo ? KF.negocioActivo.nombre : 'Mi Negocio';
      var ef = efectivoActual();
      var ut = utilidadMes();
      var cxc = cxcPendiente();
      var cxp = cxpPendiente();
      var inv = inventarioResumen();
      var vm = ventasMes();
      var bal = balanceRapido();

      var html = '';
      html += '<div class="kf-titulo-modulo">🏠 Panel General</div>';
      html += '<div class="kf-subtitulo">Resumen de ' + KF.esc(neg) + '</div>';

      // ---- Tarjetas grandes ----
      html += '<div class="kf-grid-resumen">';
      html += '<div class="kf-mini-card ' + (ef >= 0 ? 'positivo' : 'negativo') + '"><div class="lbl">Efectivo</div><div class="val">' + KF.dinero(ef) + '</div></div>';
      html += '<div class="kf-mini-card ' + (ut >= 0 ? 'positivo' : 'negativo') + '"><div class="lbl">Utilidad del mes</div><div class="val">' + KF.dinero(ut) + '</div></div>';
      html += '<div class="kf-mini-card ' + (cxc > 0 ? 'acento' : 'positivo') + '"><div class="lbl">Por cobrar</div><div class="val">' + KF.dinero(cxc) + '</div></div>';
      html += '<div class="kf-mini-card ' + (cxp > 0 ? 'negativo' : 'positivo') + '"><div class="lbl">Por pagar</div><div class="val">' + KF.dinero(cxp) + '</div></div>';
      html += '</div>';

      // ---- Alerta de stock bajo ----
      if (inv.stockBajo > 0) {
        html += '<div class="kf-card" style="background:var(--rojo-claro);border:1px solid var(--rojo);">';
        html += '<div style="font-size:14px;font-weight:700;color:var(--rojo);">⚠️ ' + inv.stockBajo + ' producto' + (inv.stockBajo > 1 ? 's' : '') + ' con stock bajo</div>';
        html += '<div style="font-size:12px;color:#46566a;margin-top:4px;">Revisa el inventario para reponer mercancía.</div>';
        html += '</div>';
      }

      // ---- Accesos rapidos (6 mas usados) ----
      html += '<div class="kf-card-titulo" style="margin:8px 2px 8px 2px;">Accesos rápidos</div>';
      html += '<div class="kf-accesos" id="kf-accesos"></div>';

      // ---- Inventario ----
      html += '<div class="kf-card">';
      html += '<div class="kf-card-titulo">Inventario <span>' + inv.total + ' prod.</span></div>';
      html += fila('Valor a costo', inv.valorCosto, 'var(--azul-medio)');
      html += fila('Valor a venta', inv.valorVenta, 'var(--azul-medio)');
      html += fila('Ganancia potencial', inv.gananciaPotencial, inv.gananciaPotencial >= 0 ? 'var(--verde)' : 'var(--rojo)');
      html += '</div>';

      // ---- Ventas del mes ----
      html += '<div class="kf-card">';
      html += '<div class="kf-card-titulo">Ventas del mes <span>' + vm.count + ' op.</span></div>';
      html += fila('Total vendido', vm.total, 'var(--azul-medio)');
      html += fila('Ganancia bruta', vm.ganancia, vm.ganancia >= 0 ? 'var(--verde)' : 'var(--rojo)');
      html += '</div>';

      // ---- Top 5 productos ----
      if (vm.top.length) {
        html += '<div class="kf-card">';
        html += '<div class="kf-card-titulo">Top 5 productos del mes</div>';
        vm.top.slice(0, 5).forEach(function (p, i) {
          html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gris-borde);font-size:14px;">';
          html += '<span>#' + (i + 1) + ' ' + KF.esc(p.nombre) + ' <small style="color:#7b8a9a;">x' + p.cantidad + '</small></span>';
          html += '<b style="color:var(--verde);">' + KF.dinero(p.ganancia) + '</b>';
          html += '</div>';
        });
        html += '</div>';
      }

      // ---- Balance rapido ----
      html += '<div class="kf-card">';
      html += '<div class="kf-card-titulo">Balance rápido</div>';
      html += fila('Activo', bal.activo, 'var(--azul-medio)');
      html += fila('Pasivo', bal.pasivo, 'var(--rojo)');
      html += fila('Patrimonio', bal.patrimonio, bal.patrimonio >= 0 ? 'var(--verde)' : 'var(--rojo)');
      html += '</div>';

      html += '<div style="text-align:center;color:#9aa7b4;font-size:12px;margin-top:20px;">KontaFin v' + KF.version + ' · OSTICOR</div>';

      cont.innerHTML = html;

      // ---- Accesos rapidos: los 6 mas usados ----
      var ACCESOS_RAPIDOS = ['ventas', 'compras', 'inventario', 'efectivo', 'gastos', 'ingresos'];
      var accesos = document.getElementById('kf-accesos');
      ACCESOS_RAPIDOS.forEach(function (idMod) {
        var m = KF.moduloPorId(idMod);
        if (!m) return;
        var div = document.createElement('div');
        div.className = 'kf-acceso';
        div.innerHTML = '<span class="kf-acceso-icono">' + (m.icono || '•') + '</span>' +
                        '<span class="kf-acceso-nombre">' + KF.esc(m.nombre) + '</span>';
        div.addEventListener('click', function () { KF.irA(m.id); });
        accesos.appendChild(div);
      });
    }

    function fila(etiqueta, valor, color) {
      return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gris-borde);font-size:14px;">' +
             '<span>' + etiqueta + '</span>' +
             '<b style="color:' + color + ';">' + KF.dinero(valor) + '</b></div>';
    }

    pintar();
  }
});