/* =====================================================
   Modulo: Balance General
   Solo lectura. Calcula:
     ACTIVO     = Efectivo + Inventario (a costo) + CxC + Cuentas personalizadas activo
     PASIVO     = CxP + Cuentas personalizadas pasivo
     PATRIMONIO = Capital aportado + Utilidades acumuladas
   Muestra si cuadra (Activo = Pasivo + Patrimonio).
   ===================================================== */

KF.registrarModulo({
  id: 'balance',
  nombre: 'Balance General',
  icono: '⚖️',
  orden: 12,
  render: function (cont) {

    function calcular() {
      // --- ACTIVOS ---
      // Efectivo
      var efectivo = 0;
      KF.leer('efectivo', []).forEach(function (m) {
        efectivo += (m.tipo === 'ingreso' ? 1 : -1) * KF.num(m.monto);
      });

      // Inventario a costo
      var inventario = 0;
      KF.leer('inventario', []).forEach(function (p) {
        inventario += KF.num(p.costo) * KF.num(p.stock);
      });

      // CxC (solo saldo pendiente)
      var cxc = 0;
      KF.leer('cuentas-cobrar', []).forEach(function (c) {
        var pagado = (c.pagos || []).reduce(function (s, p) { return s + KF.num(p.monto); }, 0);
        cxc += Math.max(0, KF.num(c.monto) - pagado);
      });

      // Cuentas personalizadas: activos
      var activosExtra = 0;
      KF.leer('cuentas-personalizadas', []).forEach(function (c) {
        if (c.tipo !== 'activo') return;
        (c.subcuentas || []).forEach(function (s) { activosExtra += KF.num(s.valor); });
      });

      var totalActivo = efectivo + inventario + cxc + activosExtra;

      // --- PASIVOS ---
      var cxp = 0;
      KF.leer('cuentas-pagar', []).forEach(function (c) {
        var pagado = (c.pagos || []).reduce(function (s, p) { return s + KF.num(p.monto); }, 0);
        cxp += Math.max(0, KF.num(c.monto) - pagado);
      });

      var pasivosExtra = 0;
      KF.leer('cuentas-personalizadas', []).forEach(function (c) {
        if (c.tipo !== 'pasivo') return;
        (c.subcuentas || []).forEach(function (s) { pasivosExtra += KF.num(s.valor); });
      });

      var totalPasivo = cxp + pasivosExtra;

      // --- PATRIMONIO ---
      var aportes = 0, retiros = 0;
      KF.leer('capital', []).forEach(function (m) {
        if (m.tipo === 'aporte') aportes += KF.num(m.monto);
        else retiros += KF.num(m.monto);
      });
      var capitalAportado = aportes - retiros;

      // Utilidades acumuladas = ganancia ventas + ingresos - gastos
      var utilidades = 0;
      KF.leer('ventas', []).forEach(function (v) { utilidades += KF.num(v.ganancia); });
      KF.leer('ingresos', []).forEach(function (i) { utilidades += KF.num(i.monto); });
      KF.leer('gastos', []).forEach(function (g) { utilidades -= KF.num(g.monto); });

      // Cuentas personalizadas: patrimonio
      var patrimonioExtra = 0;
      KF.leer('cuentas-personalizadas', []).forEach(function (c) {
        if (c.tipo !== 'patrimonio') return;
        (c.subcuentas || []).forEach(function (s) { patrimonioExtra += KF.num(s.valor); });
      });

      var totalPatrimonio = capitalAportado + utilidades + patrimonioExtra;

      return {
        efectivo: efectivo,
        inventario: inventario,
        cxc: cxc,
        activosExtra: activosExtra,
        totalActivo: totalActivo,

        cxp: cxp,
        pasivosExtra: pasivosExtra,
        totalPasivo: totalPasivo,

        capitalAportado: capitalAportado,
        utilidades: utilidades,
        patrimonioExtra: patrimonioExtra,
        totalPatrimonio: totalPatrimonio,

        descuadre: totalActivo - (totalPasivo + totalPatrimonio)
      };
    }

    function pintar() {
      var r = calcular();

      var html = '';
      html += '<div class="kf-titulo-modulo">⚖️ Balance General</div>';
      html += '<div class="kf-subtitulo">Foto de lo que tienes, debes y vales hoy</div>';

      // ---- ACTIVO ----
      html += '<div class="kf-card">';
      html += '<div class="kf-card-titulo" style="color:var(--azul-medio);">ACTIVO <span>' + KF.dinero(r.totalActivo) + '</span></div>';
      html += lineaDetalle('Efectivo en caja', r.efectivo);
      html += lineaDetalle('Inventario (a costo)', r.inventario);
      html += lineaDetalle('Cuentas por cobrar', r.cxc);
      if (r.activosExtra !== 0) html += lineaDetalle('Otras cuentas (activo)', r.activosExtra);
      html += '</div>';

      // ---- PASIVO ----
      html += '<div class="kf-card">';
      html += '<div class="kf-card-titulo" style="color:var(--rojo);">PASIVO <span>' + KF.dinero(r.totalPasivo) + '</span></div>';
      html += lineaDetalle('Cuentas por pagar', r.cxp);
      if (r.pasivosExtra !== 0) html += lineaDetalle('Otras cuentas (pasivo)', r.pasivosExtra);
      html += '</div>';

      // ---- PATRIMONIO ----
      html += '<div class="kf-card">';
      html += '<div class="kf-card-titulo" style="color:var(--verde);">PATRIMONIO <span>' + KF.dinero(r.totalPatrimonio) + '</span></div>';
      html += lineaDetalle('Capital aportado', r.capitalAportado);
      html += lineaDetalle('Utilidades acumuladas', r.utilidades);
      if (r.patrimonioExtra !== 0) html += lineaDetalle('Otras cuentas (patrimonio)', r.patrimonioExtra);
      html += '</div>';

      // ---- ECUACION ----
      var cuadra = Math.abs(r.descuadre) < 0.5;
      html += '<div class="kf-card" style="background:' + (cuadra ? 'var(--verde-claro)' : 'var(--rojo-claro)') + ';border:1px solid ' + (cuadra ? 'var(--verde)' : 'var(--rojo)') + ';">';
      html += '<div style="font-size:13px;font-weight:700;color:' + (cuadra ? 'var(--verde)' : 'var(--rojo)') + ';margin-bottom:6px;">';
      html += cuadra ? '✅ El balance cuadra' : '⚠️ El balance NO cuadra';
      html += '</div>';
      html += '<div style="font-size:12px;color:#46566a;">';
      html += 'Activo = Pasivo + Patrimonio<br>';
      html += KF.dinero(r.totalActivo) + ' = ' + KF.dinero(r.totalPasivo) + ' + ' + KF.dinero(r.totalPatrimonio);
      if (!cuadra) html += '<br><b>Diferencia: ' + KF.dinero(r.descuadre) + '</b>';
      html += '</div></div>';

      cont.innerHTML = html;
    }

    function lineaDetalle(etiqueta, valor) {
      return '<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px;border-bottom:1px solid var(--gris-borde);">' +
             '<span>' + etiqueta + '</span>' +
             '<b style="color:var(--azul-medio);">' + KF.dinero(valor) + '</b>' +
             '</div>';
    }

    pintar();
  }
});