/* =====================================================
   Modulo: Analisis de Costos - Version 2 (con historial)
   - Costos fijos vs variables
   - Punto de equilibrio
   - Comparacion mes actual vs mes anterior
   - Grafico de tendencia (6 / 12 meses)
   - Top 5 productos mas rentables
   - Recomendaciones con tendencia
   Define funciones globales reutilizables:
     KF.calcularSerieMensual(n)
     KF.dibujarGraficoBarras(canvas, config)
     KF.abreviarNumero(n)
   ===================================================== */

/* =====================================================
   FUNCION GLOBAL: Serie mensual (ultimos N meses)
   Devuelve array con: { periodo, etiqueta, resumen }
   ===================================================== */
KF.calcularSerieMensual = function (nMeses) {
  var resultado = [];
  var ahora = new Date();
  var mesesCortos = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  for (var i = nMeses - 1; i >= 0; i--) {
    var d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    var desde = d.getTime();
    var finMes = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    var hasta = Math.min(finMes.getTime(), ahora.getTime());
    var periodo = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');

    var rep = KF.calcularReporte(desde, hasta);

    resultado.push({
      periodo: periodo,
      etiqueta: mesesCortos[d.getMonth()],
      desde: desde,
      hasta: hasta,
      resumen: rep
    });
  }
  return resultado;
};

/* =====================================================
   FUNCION GLOBAL: Abreviar numero para ejes
   ===================================================== */
KF.abreviarNumero = function (n) {
  var abs = Math.abs(n);
  if (abs >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (abs >= 1000)    return (n / 1000).toFixed(1) + 'k';
  return Math.round(n).toString();
};

/* =====================================================
   FUNCION GLOBAL: Dibujar grafico de barras agrupadas
   config = {
     etiquetas: ['Ene','Feb',...],
     series: [{ nombre, color, valores: [...] }]
   }
   ===================================================== */
KF.dibujarGraficoBarras = function (canvas, config) {
  var ctx = canvas.getContext('2d');
  var W = canvas.width;
  var H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  var padding = { top: 24, right: 10, bottom: 30, left: 44 };
  var plotW = W - padding.left - padding.right;
  var plotH = H - padding.top - padding.bottom;

  // Calcular rango
  var maxV = 0, minV = 0;
  config.series.forEach(function (s) {
    s.valores.forEach(function (v) {
      if (v > maxV) maxV = v;
      if (v < minV) minV = v;
    });
  });

  if (maxV === 0 && minV === 0) {
    ctx.fillStyle = '#999';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Sin datos para mostrar', W / 2, H / 2);
    return;
  }

  // Margen superior
  maxV = maxV === 0 ? 1 : maxV * 1.15;
  if (minV < 0) minV = minV * 1.15;
  var rango = maxV - minV;
  if (rango === 0) rango = 1;

  function yDe(v) {
    return padding.top + plotH - ((v - minV) / rango) * plotH;
  }

  // Linea de cero
  var y0 = yDe(0);
  if (y0 >= padding.top && y0 <= padding.top + plotH) {
    ctx.strokeStyle = '#c8c8c8';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(padding.left, y0);
    ctx.lineTo(padding.left + plotW, y0);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Marcas del eje Y
  ctx.fillStyle = '#999';
  ctx.font = '9px Arial';
  ctx.textAlign = 'right';
  var nMarcas = 4;
  for (var i = 0; i <= nMarcas; i++) {
    var v = minV + (rango / nMarcas) * i;
    var y = yDe(v);
    ctx.fillText(KF.abreviarNumero(v), padding.left - 4, y + 3);
    // Linea de guia
    ctx.strokeStyle = '#f0f0f0';
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + plotW, y);
    ctx.stroke();
  }

  // Barras
  var nCat = config.etiquetas.length;
  var nSer = config.series.length;
  var grupoW = plotW / nCat;
  var barraW = Math.max(3, (grupoW * 0.7) / nSer);

  for (var c = 0; c < nCat; c++) {
    var xGrupo = padding.left + c * grupoW + (grupoW - barraW * nSer) / 2;
    for (var s = 0; s < nSer; s++) {
      var val = config.series[s].valores[c] || 0;
      var y = yDe(val);
      var yRef = yDe(0);
      var altura = Math.abs(y - yRef);
      var top = Math.min(y, yRef);
      var x = xGrupo + s * barraW;

      ctx.fillStyle = config.series[s].color;
      ctx.fillRect(x, top, barraW - 1, altura);
    }
  }

  // Etiquetas X
  ctx.fillStyle = '#666';
  ctx.font = '10px Arial';
  ctx.textAlign = 'center';
  for (var c2 = 0; c2 < nCat; c2++) {
    var xc = padding.left + c2 * grupoW + grupoW / 2;
    ctx.fillText(config.etiquetas[c2], xc, H - 10);
  }

  // Leyenda (si hay mas de una serie)
  if (nSer > 1) {
    var lx = padding.left;
    var ly = 12;
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    config.series.forEach(function (s) {
      ctx.fillStyle = s.color;
      ctx.fillRect(lx, ly - 7, 8, 8);
      ctx.fillStyle = '#555';
      ctx.fillText(s.nombre, lx + 12, ly + 1);
      lx += ctx.measureText(s.nombre).width + 26;
    });
  }
};

/* =====================================================
   MODULO ANALISIS DE COSTOS
   ===================================================== */
KF.registrarModulo({
  id: 'analisis-costos',
  nombre: 'Análisis de Costos',
  icono: '🔍',
  orden: 13,
  render: function (cont) {

    var nMeses = 6; // 6 o 12, configurable por el usuario

    var CATEGORIAS_FIJAS = ['Alquiler', 'Salarios', 'Servicios', 'Impuestos'];

    // ---------- Calculo de un mes ----------
    function calcularMes(resumen) {
      // Costos: solo tenemos gastos detallados en el reporte
      var costoFijo = 0, costoVariable = 0;
      (resumen.gastosDetalle || []).forEach(function (g) {
        var cat = g.categoria || 'Otros';
        if (CATEGORIAS_FIJAS.indexOf(cat) !== -1) costoFijo += KF.num(g.monto);
        else costoVariable += KF.num(g.monto);
      });

      var margenContrib = resumen.totalVentas > 0
        ? (resumen.gananciaVentas / resumen.totalVentas)
        : 0;

      var puntoEquilibrio = margenContrib > 0 ? (costoFijo / margenContrib) : null;

      return {
        costoFijo: costoFijo,
        costoVariable: costoVariable,
        totalVentas: resumen.totalVentas,
        ganancia: resumen.gananciaVentas,
        utilidad: resumen.utilidad,
        margenContrib: margenContrib * 100,
        puntoEquilibrio: puntoEquilibrio,
        top: (resumen.top || []).slice(0, 5)
      };
    }

    // ---------- Calcular variacion ----------
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

    function pintar() {
      var serie = KF.calcularSerieMensual(nMeses);
      var actual = calcularMes(serie[serie.length - 1].resumen);
      var anterior = serie.length > 1 ? calcularMes(serie[serie.length - 2].resumen) : null;
      var periodoActual = serie[serie.length - 1];

      var html = '';
      html += '<div class="kf-titulo-modulo">🔍 Análisis de Costos</div>';
      html += '<div class="kf-subtitulo">Tendencia, punto de equilibrio y recomendaciones</div>';

      // ---- Toggle 6 / 12 meses ----
      html += '<div class="kf-fila" style="margin-bottom:12px;">';
      html += '<button class="kf-btn ' + (nMeses === 6 ? 'kf-btn-primario' : 'kf-btn-gris') + '" data-n="6">Últimos 6 meses</button>';
      html += '<button class="kf-btn ' + (nMeses === 12 ? 'kf-btn-primario' : 'kf-btn-gris') + '" data-n="12"' + (serie.length < 12 ? '' : '') + '>Últimos 12 meses</button>';
      html += '</div>';

      // ---- Tarjetas del mes actual ----
      html += '<div class="kf-card-titulo" style="margin:4px 2px 8px 2px;">' + periodoActual.etiqueta + ' (mes actual)</div>';
      html += '<div class="kf-grid-resumen">';
      html += '<div class="kf-mini-card negativo"><div class="lbl">Costos fijos</div><div class="val">' + KF.dinero(actual.costoFijo) + '</div></div>';
      html += '<div class="kf-mini-card acento"><div class="lbl">Costos variables</div><div class="val">' + KF.dinero(actual.costoVariable) + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Margen contrib.</div><div class="val">' + actual.margenContrib.toFixed(1) + '%</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Ventas</div><div class="val">' + KF.dinero(actual.totalVentas) + '</div></div>';
      html += '</div>';

      // ---- Punto de equilibrio ----
      html += '<div class="kf-card" style="text-align:center;">';
      html += '<div style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#7b8a9a;">Punto de equilibrio del mes</div>';
      if (actual.puntoEquilibrio === null) {
        html += '<div style="font-size:14px;color:#7b8a9a;margin-top:6px;">Sin datos suficientes.</div>';
      } else {
        html += '<div style="font-size:24px;font-weight:800;color:var(--dorado);margin-top:6px;">' + KF.dinero(actual.puntoEquilibrio) + '</div>';
        if (actual.totalVentas < actual.puntoEquilibrio) {
          var falta = actual.puntoEquilibrio - actual.totalVentas;
          html += '<div style="font-size:12px;color:var(--rojo);margin-top:4px;">Te faltan <b>' + KF.dinero(falta) + '</b> en ventas para cubrir costos.</div>';
        } else {
          var superavit = actual.totalVentas - actual.puntoEquilibrio;
          html += '<div style="font-size:12px;color:var(--verde);margin-top:4px;">Superaste el punto por <b>' + KF.dinero(superavit) + '</b>.</div>';
        }
      }
      html += '</div>';

      // ---- Comparacion mes actual vs anterior ----
      if (anterior) {
        html += '<div class="kf-card">';
        html += '<div class="kf-card-titulo">' + periodoActual.etiqueta + ' vs mes anterior</div>';
        html += filaComparacion('Ventas', actual.totalVentas, anterior.totalVentas, false);
        html += filaComparacion('Ganancia bruta', actual.ganancia, anterior.ganancia, false);
        html += filaComparacion('Costos fijos', actual.costoFijo, anterior.costoFijo, true);
        html += filaComparacion('Costos variables', actual.costoVariable, anterior.costoVariable, true);
        html += filaComparacion('Utilidad neta', actual.utilidad, anterior.utilidad, false);
        html += '</div>';
      }

      // ---- Grafico de tendencia ----
      html += '<div class="kf-card">';
      html += '<div class="kf-card-titulo">Tendencia (' + nMeses + ' meses)</div>';
      html += '<canvas id="kf-ac-canvas" style="width:100%;height:220px;display:block;"></canvas>';
      html += '</div>';

      // ---- Top 5 productos del mes actual ----
      if (actual.top.length) {
        html += '<div class="kf-card">';
        html += '<div class="kf-card-titulo">Top 5 productos del mes actual</div>';
        actual.top.forEach(function (p, i) {
          html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gris-borde);font-size:14px;">';
          html += '<span>#' + (i + 1) + ' ' + KF.esc(p.nombre) + ' <small style="color:#7b8a9a;">x' + p.cantidad + '</small></span>';
          html += '<b style="color:var(--verde);">' + KF.dinero(p.ganancia) + '</b>';
          html += '</div>';
        });
        html += '</div>';
      }

      // ---- Recomendaciones ----
      html += '<div class="kf-card" style="background:var(--azul-suave);border:1px solid var(--azul-claro);">';
      html += '<div class="kf-card-titulo" style="color:var(--azul-medio);">Recomendaciones</div>';
      html += recomendaciones(serie, actual, anterior);
      html += '</div>';

      cont.innerHTML = html;

      // ---- Enlazar toggle ----
      var btns = cont.querySelectorAll('button[data-n]');
      for (var k = 0; k < btns.length; k++) {
        btns[k].addEventListener('click', function (e) {
          nMeses = parseInt(e.currentTarget.getAttribute('data-n'), 10);
          pintar();
        });
      }

      // ---- Dibujar grafico ----
      setTimeout(function () {
        var cv = document.getElementById('kf-ac-canvas');
        if (!cv) return;
        // Ajustar tamano segun ancho real
        var ancho = cv.clientWidth || 340;
        cv.width = ancho;
        cv.height = 220;

        var etiquetas = serie.map(function (m) { return m.etiqueta; });
        var valoresUtilidad = serie.map(function (m) { return KF.num(m.resumen.utilidad); });
        var valoresVentas = serie.map(function (m) { return KF.num(m.resumen.totalVentas); });

        KF.dibujarGraficoBarras(cv, {
          etiquetas: etiquetas,
          series: [
            { nombre: 'Ventas',   color: '#2a5280', valores: valoresVentas },
            { nombre: 'Utilidad', color: '#2e7d32', valores: valoresUtilidad }
          ]
        });
      }, 60);
    }

    // ---------- Fila de comparacion ----------
    function filaComparacion(etiqueta, actual, anterior, esCosto) {
      var d = delta(actual, anterior);
      var colorActual = esCosto
        ? (actual > anterior ? 'var(--rojo)' : 'var(--verde)')
        : (actual >= 0 ? 'var(--verde)' : 'var(--rojo)');
      var colorDelta = d.signo === '+' ? 'var(--rojo)' : (d.signo === '-' ? 'var(--verde)' : 'var(--gris)');
      // Ojo: para ventas/ganancia un + es bueno. Para costos un + es malo.
      if (!esCosto) {
        colorDelta = d.signo === '+' ? 'var(--verde)' : (d.signo === '-' ? 'var(--rojo)' : 'var(--gris)');
      }
      return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gris-borde);font-size:13px;">' +
             '<span>' + etiqueta + '</span>' +
             '<span><b style="color:' + colorActual + ';">' + KF.dinero(actual) + '</b>' +
             ' <small style="color:' + colorDelta + ';">' + d.signo + ' ' + Math.abs(d.pct).toFixed(1) + '%</small></span>' +
             '</div>';
    }

    // ---------- Recomendaciones ----------
    function recomendaciones(serie, actual, anterior) {
      var out = [];

      if (actual.totalVentas === 0 && actual.utilidad === 0) {
        return '<div style="font-size:13px;">Registra ventas y gastos para ver recomendaciones personalizadas.</div>';
      }

      // Punto de equilibrio
      if (actual.puntoEquilibrio !== null) {
        if (actual.totalVentas < actual.puntoEquilibrio) {
          out.push('⚠️ Estás por debajo del punto de equilibrio. Te faltan ' +
                   KF.dinero(actual.puntoEquilibrio - actual.totalVentas) + ' en ventas para cubrir costos.');
        } else {
          out.push('✅ Superaste el punto de equilibrio por ' +
                   KF.dinero(actual.totalVentas - actual.puntoEquilibrio) + '.');
        }
      }

      // Margen contribucion
      if (actual.margenContrib > 0 && actual.margenContrib < 20) {
        out.push('💡 Margen de contribución bajo (' + actual.margenContrib.toFixed(1) +
                 '%). Considera subir precios o buscar proveedores más económicos.');
      }

      // Proporción costos variables vs fijos
      if (actual.costoFijo > 0 && actual.costoVariable > actual.costoFijo * 3) {
        out.push('💡 Tus costos variables son muy altos respecto a los fijos. Revisa precios de compra.');
      }

      // Tendencia de utilidad
      if (anterior) {
        var dU = delta(actual.utilidad, anterior.utilidad);
        if (dU.pct > 10) {
          out.push('📈 Tu utilidad creció ' + dU.pct.toFixed(1) + '% respecto al mes anterior. ¡Bien!');
        } else if (dU.pct < -10) {
          out.push('📉 Tu utilidad bajó ' + Math.abs(dU.pct).toFixed(1) +
                   '% respecto al mes anterior. Revisa qué cambió.');
        }
      }

      // Tendencia general de 3 meses
      if (serie.length >= 3) {
        var ult = serie.slice(-3).map(function (m) { return KF.num(m.resumen.utilidad); });
        if (ult[0] < ult[1] && ult[1] < ult[2]) {
          out.push('📈 Tendencia positiva en los últimos 3 meses. Sigue así.');
        } else if (ult[0] > ult[1] && ult[1] > ult[2]) {
          out.push('📉 Tendencia negativa en los últimos 3 meses. Considera revisar precios y gastos.');
        }
      }

      // Concentración de ganancias en 3 productos
      if (actual.top.length > 0 && actual.ganancia > 0) {
        var totalTop3 = actual.top.slice(0, 3).reduce(function (s, p) { return s + p.ganancia; }, 0);
        var pctTop3 = (totalTop3 / actual.ganancia) * 100;
        if (pctTop3 > 60) {
          out.push('⚠️ El ' + pctTop3.toFixed(0) +
                   '% de tu ganancia viene de solo 3 productos. Diversifica para reducir riesgo.');
        }
      }

      if (!out.length) out.push('👍 Sin alertas graves. Sigue monitoreando tus números.');

      return '<ul style="padding-left:18px;font-size:13px;color:#46566a;line-height:1.7;">' +
             out.map(function (x) { return '<li>' + x + '</li>'; }).join('') +
             '</ul>';
    }

    // ---------- Arrancar ----------
    pintar();
  }
});