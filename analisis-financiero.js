/* =====================================================
   Modulo: Analisis Financiero - Version 2 (con historial)
   - Razones financieras del mes actual
   - Comparacion con el mes anterior
   - Grafico de tendencia (6 / 12 meses)
   - Detalle de saldos
   - Recomendaciones con tendencia
   Usa funciones globales definidas en analisis-costos.js
   ===================================================== */

KF.registrarModulo({
  id: 'analisis-financiero',
  nombre: 'Análisis Financiero',
  icono: '📈',
  orden: 14,
  render: function (cont) {

    var nMeses = 6;

    // ---------- Saldos actuales ----------
    function saldoEfectivo() {
      var s = 0;
      KF.leer('efectivo', []).forEach(function (m) {
        s += (m.tipo === 'ingreso' ? 1 : -1) * KF.num(m.monto);
      });
      return s;
    }
    function saldoInventario() {
      var s = 0;
      KF.leer('inventario', []).forEach(function (p) {
        s += KF.num(p.costo) * KF.num(p.stock);
      });
      return s;
    }
    function saldoCxC() {
      var s = 0;
      KF.leer('cuentas-cobrar', []).forEach(function (c) {
        var pagado = (c.pagos || []).reduce(function (t, p) { return t + KF.num(p.monto); }, 0);
        s += Math.max(0, KF.num(c.monto) - pagado);
      });
      return s;
    }
    function saldoCxP() {
      var s = 0;
      KF.leer('cuentas-pagar', []).forEach(function (c) {
        var pagado = (c.pagos || []).reduce(function (t, p) { return t + KF.num(p.monto); }, 0);
        s += Math.max(0, KF.num(c.monto) - pagado);
      });
      return s;
    }

    // ---------- Razones para un resumen de mes ----------
    function razonesDe(resumen) {
      // Para meses pasados, activo/pasivo corriente se aproxima:
      //   efectivo (saldo al cierre de ese mes)
      //   inventario (no historico: uso el actual, pero aviso)
      //   cxc nuevas del mes (aprox)
      // La idea es mostrar tendencia, no valores exactos.
      var efectivoMes = KF.num(resumen.saldoCaja);
      var cxcNuevas = KF.num(resumen.totalCxCNuevas);
      var cxpNuevas = KF.num(resumen.totalCxPNuevas);

      var activoCorriente = efectivoMes + cxcNuevas;
      var pasivoCorriente = cxpNuevas;

      var liquidezInmediata = pasivoCorriente > 0 ? (efectivoMes / pasivoCorriente) : null;
      var razonCorriente    = pasivoCorriente > 0 ? (activoCorriente / pasivoCorriente) : null;
      var endeudamiento     = activoCorriente > 0 ? (pasivoCorriente / activoCorriente) * 100 : 0;

      var margenBruto = resumen.totalVentas > 0
        ? (resumen.gananciaVentas / resumen.totalVentas) * 100 : 0;
      var margenNeto = resumen.totalVentas > 0
        ? (resumen.utilidad / resumen.totalVentas) * 100 : 0;

      // Rotacion aprox = costo de ventas / (inventario al costo)
      var invActual = saldoInventario();
      var rotacion = invActual > 0 ? (KF.num(resumen.costoVentas) / invActual) : null;

      return {
        efectivo: efectivoMes,
        cxcNuevas: cxcNuevas,
        cxpNuevas: cxpNuevas,
        activoCorriente: activoCorriente,
        pasivoCorriente: pasivoCorriente,
        liquidezInmediata: liquidezInmediata,
        razonCorriente: razonCorriente,
        endeudamiento: endeudamiento,
        margenBruto: margenBruto,
        margenNeto: margenNeto,
        rotacion: rotacion,
        totalVentas: KF.num(resumen.totalVentas),
        utilidad: KF.num(resumen.utilidad)
      };
    }

    // ---------- Delta ----------
    function delta(actual, anterior) {
      if (anterior === 0) {
        return actual === 0 ? { abs: 0, pct: 0, signo: '=' } :
               { abs: actual, pct: 999, signo: actual > 0 ? '+' : '-' };
      }
      var abs = actual - anterior;
      var pct = (abs / Math.abs(anterior)) * 100;
      var signo = abs > 0 ? '+' : (abs < 0 ? '-' : '=');
      return { abs: abs, pct: pct, signo: signo };
    }

    // ---------- Color segun razon ----------
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
    function colorMargen(pct) {
      if (pct >= 25) return 'positivo';
      if (pct >= 10) return 'acento';
      return 'negativo';
    }

    function pintar() {
      var serie = KF.calcularSerieMensual(nMeses);
      var ultimo = serie[serie.length - 1];
      var anterior = serie.length > 1 ? serie[serie.length - 2] : null;

      var r = razonesDe(ultimo.resumen);
      var rAnt = anterior ? razonesDe(anterior.resumen) : null;

      // Saldos actuales (no de mes cerrado)
      var ef = saldoEfectivo();
      var inv = saldoInventario();
      var cxc = saldoCxC();
      var cxp = saldoCxP();

      var html = '';
      html += '<div class="kf-titulo-modulo">📈 Análisis Financiero</div>';
      html += '<div class="kf-subtitulo">Salud financiera y tendencia de tu negocio</div>';

      // ---- Toggle 6 / 12 ----
      html += '<div class="kf-fila" style="margin-bottom:12px;">';
      html += '<button class="kf-btn ' + (nMeses === 6 ? 'kf-btn-primario' : 'kf-btn-gris') + '" data-n="6">Últimos 6 meses</button>';
      html += '<button class="kf-btn ' + (nMeses === 12 ? 'kf-btn-primario' : 'kf-btn-gris') + '" data-n="12">Últimos 12 meses</button>';
      html += '</div>';

      // ---- Razones del mes ----
      html += '<div class="kf-card-titulo" style="margin:4px 2px 8px 2px;">' + ultimo.etiqueta + ' (mes actual)</div>';
      html += '<div class="kf-grid-resumen">';
      html += '<div class="kf-mini-card ' + colorLiquidez(r.razonCorriente) + '"><div class="lbl">Razón corriente</div><div class="val">' + fmt(r.razonCorriente) + '</div></div>';
      html += '<div class="kf-mini-card ' + colorLiquidez(r.liquidezInmediata) + '"><div class="lbl">Liquidez inmediata</div><div class="val">' + fmt(r.liquidezInmediata) + '</div></div>';
      html += '<div class="kf-mini-card ' + colorEndeud(r.endeudamiento) + '"><div class="lbl">Endeudamiento</div><div class="val">' + r.endeudamiento.toFixed(1) + '%</div></div>';
      html += '<div class="kf-mini-card ' + colorMargen(r.margenNeto) + '"><div class="lbl">Margen neto mes</div><div class="val">' + r.margenNeto.toFixed(1) + '%</div></div>';
      html += '</div>';

      // ---- Comparacion con mes anterior ----
      if (rAnt) {
        html += '<div class="kf-card">';
        html += '<div class="kf-card-titulo">' + ultimo.etiqueta + ' vs ' + anterior.etiqueta + '</div>';
        html += filaComparacion('Ventas', r.totalVentas, rAnt.totalVentas, 'mayor-mejor');
        html += filaComparacion('Utilidad', r.utilidad, rAnt.utilidad, 'mayor-mejor');
        html += filaComparacion('Margen bruto %', r.margenBruto, rAnt.margenBruto, 'mayor-mejor', true);
        html += filaComparacion('Margen neto %', r.margenNeto, rAnt.margenNeto, 'mayor-mejor', true);
        html += filaComparacion('Endeudamiento %', r.endeudamiento, rAnt.endeudamiento, 'menor-mejor', true);
        html += '</div>';
      }

      // ---- Grafico tendencia ----
      html += '<div class="kf-card">';
      html += '<div class="kf-card-titulo">Tendencia (' + nMeses + ' meses)</div>';
      html += '<canvas id="kf-af-canvas" style="width:100%;height:220px;display:block;"></canvas>';
      html += '</div>';

      // ---- Tabla resumen por mes ----
      html += '<div class="kf-card">';
      html += '<div class="kf-card-titulo">Detalle mensual</div>';
      html += '<div style="overflow-x:auto;">';
      html += '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
      html += '<thead><tr style="background:var(--azul-suave);color:var(--azul-medio);">';
      html += '<th style="text-align:left;padding:6px 4px;">Mes</th>';
      html += '<th style="text-align:right;padding:6px 4px;">Ventas</th>';
      html += '<th style="text-align:right;padding:6px 4px;">Utilidad</th>';
      html += '<th style="text-align:right;padding:6px 4px;">Margen</th>';
      html += '</tr></thead><tbody>';
      serie.forEach(function (m) {
        var util = KF.num(m.resumen.utilidad);
        var vent = KF.num(m.resumen.totalVentas);
        var mg = vent > 0 ? (util / vent * 100) : 0;
        var color = util >= 0 ? 'var(--verde)' : 'var(--rojo)';
        html += '<tr style="border-bottom:1px solid var(--gris-borde);">';
        html += '<td style="padding:6px 4px;">' + m.etiqueta + '</td>';
        html += '<td style="text-align:right;padding:6px 4px;">' + KF.dinero(vent) + '</td>';
        html += '<td style="text-align:right;padding:6px 4px;color:' + color + ';font-weight:700;">' + KF.dinero(util) + '</td>';
        html += '<td style="text-align:right;padding:6px 4px;">' + mg.toFixed(1) + '%</td>';
        html += '</tr>';
      });
      html += '</tbody></table>';
      html += '</div>';
      html += '</div>';

      // ---- Saldos actuales ----
      html += '<div class="kf-card">';
      html += '<div class="kf-card-titulo">Saldos actuales</div>';
      html += linea('Efectivo', ef, ef >= 0 ? 'var(--verde)' : 'var(--rojo)');
      html += linea('Inventario (a costo)', inv, 'var(--azul-medio)');
      html += linea('Cuentas por cobrar', cxc, 'var(--azul-medio)');
      html += linea('Cuentas por pagar', cxp, cxp > 0 ? 'var(--rojo)' : 'var(--verde)');
      html += lineaFuerte('Activo corriente', ef + inv + cxc, 'var(--azul-medio)');
      html += lineaFuerte('Pasivo corriente', cxp, 'var(--rojo)');
      html += '</div>';

      // ---- Recomendaciones ----
      html += '<div class="kf-card" style="background:var(--azul-suave);border:1px solid var(--azul-claro);">';
      html += '<div class="kf-card-titulo" style="color:var(--azul-medio);">Diagnóstico</div>';
      html += recomendaciones(serie, r, rAnt);
      html += '</div>';

      cont.innerHTML = html;

      // ---- Toggle ----
      var btns = cont.querySelectorAll('button[data-n]');
      for (var k = 0; k < btns.length; k++) {
        btns[k].addEventListener('click', function (e) {
          nMeses = parseInt(e.currentTarget.getAttribute('data-n'), 10);
          pintar();
        });
      }

      // ---- Grafico ----
      setTimeout(function () {
        var cv = document.getElementById('kf-af-canvas');
        if (!cv) return;
        var ancho = cv.clientWidth || 340;
        cv.width = ancho;
        cv.height = 220;

        var etiquetas = serie.map(function (m) { return m.etiqueta; });
        var valoresVentas = serie.map(function (m) { return KF.num(m.resumen.totalVentas); });
        var valoresUtilidad = serie.map(function (m) { return KF.num(m.resumen.utilidad); });

        KF.dibujarGraficoBarras(cv, {
          etiquetas: etiquetas,
          series: [
            { nombre: 'Ventas',   color: '#2a5280', valores: valoresVentas },
            { nombre: 'Utilidad', color: '#2e7d32', valores: valoresUtilidad }
          ]
        });
      }, 60);
    }

    // ---------- Utilidades ----------
    function fmt(n) { return n === null ? '—' : n.toFixed(2); }

    function linea(etiqueta, valor, color) {
      return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gris-borde);font-size:14px;">' +
             '<span>' + etiqueta + '</span><b style="color:' + color + ';">' + KF.dinero(valor) + '</b></div>';
    }
    function lineaFuerte(etiqueta, valor, color) {
      return '<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:14px;font-weight:800;color:' + color + ';">' +
             '<span>' + etiqueta + '</span><span>' + KF.dinero(valor) + '</span></div>';
    }

    function filaComparacion(etiqueta, actual, anterior, modo, esPct) {
      var d = delta(actual, anterior);
      var bien = (modo === 'mayor-mejor') ? (d.abs > 0) : (d.abs < 0);
      var malo = (modo === 'mayor-mejor') ? (d.abs < 0) : (d.abs > 0);
      var colorDelta = d.abs === 0 ? 'var(--gris)' :
                       (bien ? 'var(--verde)' : (malo ? 'var(--rojo)' : 'var(--gris)'));

      var txtActual = esPct ? actual.toFixed(1) + '%' : KF.dinero(actual);
      var pctTxt = d.pct === 999 ? '—' : Math.abs(d.pct).toFixed(1) + '%';

      return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gris-borde);font-size:13px;">' +
             '<span>' + etiqueta + '</span>' +
             '<span><b>' + txtActual + '</b> <small style="color:' + colorDelta + ';">' + d.signo + ' ' + pctTxt + '</small></span>' +
             '</div>';
    }

    function recomendaciones(serie, r, rAnt) {
      var out = [];

      if (r.totalVentas === 0 && r.utilidad === 0) {
        return '<div style="font-size:13px;">Registra ventas y gastos para ver tu diagnóstico.</div>';
      }

      // Liquidez
      if (r.razonCorriente !== null) {
        if (r.razonCorriente < 1) {
          out.push('⚠️ Razón corriente menor a 1: tus deudas de corto plazo superan tus activos líquidos. Prioriza cobrar y vender stock.');
        } else if (r.razonCorriente >= 1.5) {
          out.push('✅ Buena razón corriente (' + r.razonCorriente.toFixed(2) + '): puedes cubrir tus deudas de corto plazo.');
        }
      }

      if (r.liquidezInmediata !== null && r.liquidezInmediata < 0.5) {
        out.push('💡 Poco efectivo disponible (' + r.liquidezInmediata.toFixed(2) + '). Si tienes CxC pendientes, intenta cobrar pronto.');
      }

      if (r.endeudamiento > 60) {
        out.push('⚠️ Endeudamiento alto (' + r.endeudamiento.toFixed(1) + '%). Considera reducir nuevas compras a crédito.');
      }

      if (r.margenNeto < 10) {
        out.push('💡 Margen neto bajo (' + r.margenNeto.toFixed(1) + '%). Revisa precios y gastos.');
      } else if (r.margenNeto >= 25) {
        out.push('🌟 Margen neto muy saludable (' + r.margenNeto.toFixed(1) + '%). Buen trabajo.');
      }

      if (r.rotacion !== null && r.rotacion < 0.5) {
        out.push('💡 Inventario con baja rotación (' + r.rotacion.toFixed(2) + ' veces/mes). Puede haber productos sin salida.');
      }

      // Comparacion con mes anterior
      if (rAnt) {
        var dU = delta(r.utilidad, rAnt.utilidad);
        if (dU.pct > 10) out.push('📈 Tu utilidad creció ' + dU.pct.toFixed(1) + '% respecto al mes anterior.');
        else if (dU.pct < -10) out.push('📉 Tu utilidad bajó ' + Math.abs(dU.pct).toFixed(1) + '% respecto al mes anterior.');
      }

      // Tendencia 3 meses
      if (serie.length >= 3) {
        var ult3 = serie.slice(-3).map(function (m) { return KF.num(m.resumen.utilidad); });
        if (ult3[0] < ult3[1] && ult3[1] < ult3[2]) {
          out.push('📈 Tendencia positiva en los últimos 3 meses.');
        } else if (ult3[0] > ult3[1] && ult3[1] > ult3[2]) {
          out.push('📉 Tendencia negativa en los últimos 3 meses.');
        }
      }

      if (!out.length) out.push('👍 Sin alertas. Sigue registrando tus operaciones para análisis más precisos.');

      return '<ul style="padding-left:18px;font-size:13px;color:#46566a;line-height:1.7;">' +
             out.map(function (x) { return '<li>' + x + '</li>'; }).join('') +
             '</ul>';
    }

    // ---------- Arrancar ----------
    pintar();
  }
});