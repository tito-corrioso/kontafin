/* =====================================================
   Modulo: Analisis de Costos
   Solo lectura. Calcula:
   - Costos fijos vs variables (segun categoria de gasto)
   - Punto de equilibrio
   - Top productos mas rentables
   - Recomendaciones
   ===================================================== */

KF.registrarModulo({
  id: 'analisis-costos',
  nombre: 'Análisis de Costos',
  icono: '🔍',
  orden: 13,
  render: function (cont) {

    var periodo = 'mes';

    // Categorias que tratamos como fijas (recurrentes)
    var CATEGORIAS_FIJAS = ['Alquiler', 'Salarios', 'Servicios', 'Impuestos'];

    function rango() {
      var hoy = new Date(); hoy.setHours(0,0,0,0);
      var d = new Date(hoy);
      if (periodo === 'semana') d.setDate(hoy.getDate() - 6);
      if (periodo === 'mes')    d.setDate(1);
      if (periodo === 'todo')   d = new Date(0);
      return d.getTime();
    }
    function dentro(iso) { return new Date(iso).getTime() >= rango(); }

    function calcular() {
      var gastos = KF.leer('gastos', []).filter(function (g) { return dentro(g.fecha); });
      var ventas = KF.leer('ventas', []).filter(function (v) { return dentro(v.fecha); });

      var costoFijo = 0, costoVariable = 0;
      gastos.forEach(function (g) {
        var cat = g.categoria || 'Otros';
        if (CATEGORIAS_FIJAS.indexOf(cat) !== -1) costoFijo += KF.num(g.monto);
        else costoVariable += KF.num(g.monto);
      });

      // Margen de contribucion: porcentaje de ganancia promedio sobre ventas
      var totalVentas = 0, totalGanancia = 0;
      ventas.forEach(function (v) {
        totalVentas += KF.num(v.total);
        totalGanancia += KF.num(v.ganancia);
      });
      var margenContrib = totalVentas > 0 ? (totalGanancia / totalVentas) : 0;

      // Punto de equilibrio = costo fijo / margen de contribucion
      var puntoEquilibrio = margenContrib > 0 ? (costoFijo / margenContrib) : null;

      // Top productos mas rentables
      var porProducto = {};
      ventas.forEach(function (v) {
        var n = v.productoNombre || '(sin nombre)';
        if (!porProducto[n]) porProducto[n] = { nombre: n, ganancia: 0, cantidad: 0, total: 0 };
        porProducto[n].ganancia += KF.num(v.ganancia);
        porProducto[n].cantidad += KF.num(v.cantidad);
        porProducto[n].total    += KF.num(v.total);
      });
      var top = Object.keys(porProducto).map(function (k) { return porProducto[k]; })
        .sort(function (a, b) { return b.ganancia - a.ganancia; });

      return {
        costoFijo: costoFijo,
        costoVariable: costoVariable,
        totalVentas: totalVentas,
        totalGanancia: totalGanancia,
        margenContrib: margenContrib * 100,
        puntoEquilibrio: puntoEquilibrio,
        top: top
      };
    }

    function pintar() {
      var r = calcular();

      var html = '';
      html += '<div class="kf-titulo-modulo">🔍 Análisis de Costos</div>';
      html += '<div class="kf-subtitulo">Cuánto necesitas vender para no perder</div>';

      html += '<select id="kf-ac-periodo" class="kf-buscador" style="padding-left:12px;background-image:none;margin-bottom:12px;">';
      html += '<option value="semana"' + (periodo==='semana'?' selected':'') + '>Últimos 7 días</option>';
      html += '<option value="mes"'    + (periodo==='mes'   ?' selected':'') + '>Este mes</option>';
      html += '<option value="todo"'   + (periodo==='todo'  ?' selected':'') + '>Todo</option>';
      html += '</select>';

      // Resumen
      html += '<div class="kf-grid-resumen">';
      html += '<div class="kf-mini-card negativo"><div class="lbl">Costos fijos</div><div class="val">' + KF.dinero(r.costoFijo) + '</div></div>';
      html += '<div class="kf-mini-card acento"><div class="lbl">Costos variables</div><div class="val">' + KF.dinero(r.costoVariable) + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Margen contrib.</div><div class="val">' + r.margenContrib.toFixed(1) + '%</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Ventas</div><div class="val">' + KF.dinero(r.totalVentas) + '</div></div>';
      html += '</div>';

      // Punto de equilibrio
      html += '<div class="kf-card" style="text-align:center;">';
      html += '<div class="lbl" style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#7b8a9a;">Punto de equilibrio</div>';
      if (r.puntoEquilibrio === null) {
        html += '<div style="font-size:16px;color:#7b8a9a;margin-top:6px;">Sin datos suficientes para calcularlo.</div>';
      } else {
        html += '<div style="font-size:24px;font-weight:800;color:var(--dorado);margin-top:6px;">' + KF.dinero(r.puntoEquilibrio) + '</div>';
        html += '<div style="font-size:12px;color:#7b8a9a;margin-top:4px;">Necesitas vender al menos esto para cubrir tus costos fijos.</div>';
      }
      html += '</div>';

      // Top productos
      if (r.top.length) {
        html += '<div class="kf-card-titulo" style="margin:8px 2px 8px 2px;">Top 5 productos más rentables</div>';
        html += '<div class="kf-card">';
        r.top.slice(0, 5).forEach(function (p, i) {
          html += '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--gris-borde);font-size:14px;">';
          html += '<span>#' + (i + 1) + ' ' + KF.esc(p.nombre) + '</span>';
          html += '<b style="color:var(--verde);">' + KF.dinero(p.ganancia) + '</b>';
          html += '</div>';
        });
        html += '</div>';
      }

      // Recomendaciones
      html += '<div class="kf-card" style="background:var(--azul-suave);border:1px solid var(--azul-claro);">';
      html += '<div class="kf-card-titulo" style="color:var(--azul-medio);">Recomendaciones</div>';
      html += recomendaciones(r);
      html += '</div>';

      cont.innerHTML = html;

      document.getElementById('kf-ac-periodo').addEventListener('change', function (e) {
        periodo = e.target.value; pintar();
      });
    }

    function recomendaciones(r) {
      var out = [];
      if (r.totalVentas === 0) {
        return '<div style="font-size:13px;">Registra ventas y gastos para ver recomendaciones personalizadas.</div>';
      }
      if (r.puntoEquilibrio !== null) {
        if (r.totalVentas < r.puntoEquilibrio) {
          out.push('⚠️ Estás por debajo del punto de equilibrio. Te faltan ' + KF.dinero(r.puntoEquilibrio - r.totalVentas) + ' en ventas para cubrir gastos.');
        } else {
          out.push('✅ Superaste el punto de equilibrio por ' + KF.dinero(r.totalVentas - r.puntoEquilibrio) + '.');
        }
      }
      if (r.costoFijo > 0 && r.costoVariable > r.costoFijo * 3) {
        out.push('💡 Tus costos variables son muy altos respecto a los fijos. Revisa precios de compra o reduce intermediarios.');
      }
      if (r.margenContrib > 0 && r.margenContrib < 20) {
        out.push('💡 Tu margen de contribución es bajo (' + r.margenContrib.toFixed(1) + '%). Considera subir precios o buscar proveedores más económicos.');
      }
      if (r.top.length > 0 && r.top[0].ganancia > 0) {
        var totalTop = r.top.slice(0,3).reduce(function (s, x) { return s + x.ganancia; }, 0);
        var pct = r.totalGanancia > 0 ? (totalTop / r.totalGanancia * 100) : 0;
        if (pct > 60) {
          out.push('⚠️ El ' + pct.toFixed(0) + '% de tus ganancias vienen de solo 3 productos. Diversifica para reducir riesgo.');
        }
      }
      if (!out.length) out.push('👍 No detectamos problemas graves. Sigue monitoreando tus números.');
      return '<ul style="padding-left:18px;font-size:13px;color:#46566a;line-height:1.7;">' +
             out.map(function (x) { return '<li>' + x + '</li>'; }).join('') +
             '</ul>';
    }

    pintar();
  }
});