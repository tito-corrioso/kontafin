/* =====================================================
   Modulo: Analisis Financiero
   Solo lectura. Razones basicas:
   - Liquidez:  Efectivo / CxP,  (Efectivo+CxC) / CxP
   - Endeudamiento: Pasivo / Activo
   - Rentabilidad: margen bruto y neto
   - Rotacion de inventario
   + Recomendaciones automaticas.
   ===================================================== */

KF.registrarModulo({
  id: 'analisis-financiero',
  nombre: 'Análisis Financiero',
  icono: '📈',
  orden: 14,
  render: function (cont) {

    function calcular() {
      // --- Saldos base ---
      var efectivo = 0;
      KF.leer('efectivo', []).forEach(function (m) {
        efectivo += (m.tipo === 'ingreso' ? 1 : -1) * KF.num(m.monto);
      });

      var inventario = 0;
      KF.leer('inventario', []).forEach(function (p) {
        inventario += KF.num(p.costo) * KF.num(p.stock);
      });

      var cxc = 0;
      KF.leer('cuentas-cobrar', []).forEach(function (c) {
        var pagado = (c.pagos || []).reduce(function (s, p) { return s + KF.num(p.monto); }, 0);
        cxc += Math.max(0, KF.num(c.monto) - pagado);
      });

      var cxp = 0;
      KF.leer('cuentas-pagar', []).forEach(function (c) {
        var pagado = (c.pagos || []).reduce(function (s, p) { return s + KF.num(p.monto); }, 0);
        cxp += Math.max(0, KF.num(c.monto) - pagado);
      });

      var activoCorriente = efectivo + inventario + cxc;
      var pasivoCorriente = cxp;

      // --- Ventas y ganancia del mes ---
      var hoy = new Date(); hoy.setHours(0,0,0,0);
      var desdeMes = new Date(hoy); desdeMes.setDate(1);

      var ventasMes = 0, gananciaMes = 0, costoMes = 0;
      KF.leer('ventas', []).forEach(function (v) {
        if (new Date(v.fecha).getTime() >= desdeMes.getTime()) {
          ventasMes += KF.num(v.total);
          gananciaMes += KF.num(v.ganancia);
          costoMes += KF.num(v.costoTotal);
        }
      });

      var gastosMes = 0;
      KF.leer('gastos', []).forEach(function (g) {
        if (new Date(g.fecha).getTime() >= desdeMes.getTime()) gastosMes += KF.num(g.monto);
      });

      var ingresosMes = 0;
      KF.leer('ingresos', []).forEach(function (i) {
        if (new Date(i.fecha).getTime() >= desdeMes.getTime()) ingresosMes += KF.num(i.monto);
      });

      var utilidadNetaMes = gananciaMes + ingresosMes - gastosMes;

      // --- Razones ---
      var liquidezInmediata = pasivoCorriente > 0 ? (efectivo / pasivoCorriente) : null;
      var razonCorriente    = pasivoCorriente > 0 ? (activoCorriente / pasivoCorriente) : null;
      var endeudamiento     = activoCorriente > 0 ? (pasivoCorriente / activoCorriente) : 0;
      var margenBruto       = ventasMes > 0 ? (gananciaMes / ventasMes * 100) : 0;
      var margenNetoMes     = ventasMes > 0 ? (utilidadNetaMes / ventasMes * 100) : 0;

      // Rotacion = costo de ventas del mes / inventario promedio (aprox)
      var rotacion = inventario > 0 ? (costoMes / inventario) : null;

      return {
        efectivo: efectivo,
        inventario: inventario,
        cxc: cxc,
        cxp: cxp,
        activoCorriente: activoCorriente,
        pasivoCorriente: pasivoCorriente,
        ventasMes: ventasMes,
        gananciaMes: gananciaMes,
        gastosMes: gastosMes,
        utilidadNetaMes: utilidadNetaMes,
        liquidezInmediata: liquidezInmediata,
        razonCorriente: razonCorriente,
        endeudamiento: endeudamiento * 100,
        margenBruto: margenBruto,
        margenNetoMes: margenNetoMes,
        rotacion: rotacion
      };
    }

    function pintar() {
      var r = calcular();

      var html = '';
      html += '<div class="kf-titulo-modulo">📈 Análisis Financiero</div>';
      html += '<div class="kf-subtitulo">Cómo está la salud financiera de tu negocio</div>';

      // Indicadores resumen
      html += '<div class="kf-grid-resumen">';
      html += '<div class="kf-mini-card ' + colorLiquidez(r.razonCorriente) + '"><div class="lbl">Razón corriente</div><div class="val">' + fmt(r.razonCorriente) + '</div></div>';
      html += '<div class="kf-mini-card ' + colorLiquidez(r.liquidezInmediata) + '"><div class="lbl">Liquidez inmediata</div><div class="val">' + fmt(r.liquidezInmediata) + '</div></div>';
      html += '<div class="kf-mini-card ' + colorEndeud(r.endeudamiento) + '"><div class="lbl">Endeudamiento</div><div class="val">' + r.endeudamiento.toFixed(1) + '%</div></div>';
      html += '<div class="kf-mini-card ' + (r.margenNetoMes >= 10 ? 'positivo' : 'acento') + '"><div class="lbl">Margen neto mes</div><div class="val">' + r.margenNetoMes.toFixed(1) + '%</div></div>';
      html += '</div>';

      // Detalle
      html += '<div class="kf-card">';
      html += '<div class="kf-card-titulo">Detalle</div>';
      html += detalle('Efectivo', r.efectivo);
      html += detalle('Inventario (costo)', r.inventario);
      html += detalle('Cuentas por cobrar', r.cxc);
      html += detalle('Cuentas por pagar', r.cxp);
      html += detalle('Activo corriente', r.activoCorriente);
      html += detalle('Pasivo corriente', r.pasivoCorriente);
      html += detalle('Ventas del mes', r.ventasMes);
      html += detalle('Ganancia bruta del mes', r.gananciaMes);
      html += detalle('Gastos del mes', r.gastosMes);
      html += detalle('Utilidad neta del mes', r.utilidadNetaMes);
      if (r.rotacion !== null) html += detalle('Rotación inventario', r.rotacion.toFixed(2) + ' veces/mes');
      html += '</div>';

      // Recomendaciones
      html += '<div class="kf-card" style="background:var(--azul-suave);border:1px solid var(--azul-claro);">';
      html += '<div class="kf-card-titulo" style="color:var(--azul-medio);">Diagnóstico y recomendaciones</div>';
      html += recomendaciones(r);
      html += '</div>';

      cont.innerHTML = html;
    }

    function fmt(n) { return n === null ? '—' : n.toFixed(2); }

    function colorLiquidez(n) {
      if (n === null) return '';
      if (n >= 1.5) return 'positivo';
      if (n >= 1)   return 'acento';
      return 'negativo';
    }
    function colorEndeud(pct) {
      if (pct <= 30) return 'positivo';
      if (pct <= 60) return 'acento';
      return 'negativo';
    }
    function detalle(etiqueta, valor) {
      var texto = (typeof valor === 'number') ? KF.dinero(valor) : valor;
      return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gris-borde);font-size:14px;">' +
             '<span>' + etiqueta + '</span><b style="color:var(--azul-medio);">' + texto + '</b></div>';
    }

    function recomendaciones(r) {
      var out = [];
      if (r.razonCorriente !== null) {
        if (r.razonCorriente < 1) out.push('⚠️ Razón corriente menor a 1: tus deudas de corto plazo superan tus activos líquidos. Prioriza cobrar y vender stock.');
        else if (r.razonCorriente >= 1.5) out.push('✅ Buena razón corriente (' + r.razonCorriente.toFixed(2) + '): puedes cubrir tus deudas de corto plazo.');
      }
      if (r.liquidezInmediata !== null && r.liquidezInmediata < 0.5) {
        out.push('💡 Poco efectivo disponible (' + r.liquidezInmediata.toFixed(2) + '). Si tienes CxC pendientes, intenta cobrar pronto.');
      }
      if (r.endeudamiento > 60) {
        out.push('⚠️ Endeudamiento alto (' + r.endeudamiento.toFixed(1) + '%). Considera reducir nuevas compras a crédito.');
      }
      if (r.margenNetoMes < 10 && r.ventasMes > 0) {
        out.push('💡 Margen neto del mes bajo (' + r.margenNetoMes.toFixed(1) + '%). Revisa precios y gastos.');
      }
      if (r.margenNetoMes >= 25) {
        out.push('🌟 Margen neto muy saludable (' + r.margenNetoMes.toFixed(1) + '%). Buen trabajo.');
      }
      if (r.rotacion !== null && r.rotacion < 0.5) {
        out.push('💡 Tu inventario rota poco (' + r.rotacion.toFixed(2) + ' veces/mes). Puede haber productos con baja salida.');
      }
      if (!out.length) out.push('👍 Sin alertas. Sigue registrando tus operaciones para análisis más precisos.');
      return '<ul style="padding-left:18px;font-size:13px;color:#46566a;line-height:1.7;">' +
             out.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>';
    }

    pintar();
  }
});