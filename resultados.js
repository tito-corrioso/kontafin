/* =====================================================
   Modulo: Estado de Resultados
   Solo lectura. Calcula:
     Ventas netas (ingresos por venta)
   - Costo de ventas (costo historico de lo vendido)
   = Utilidad bruta
   + Otros ingresos
   - Gastos operativos
   = Utilidad neta
   Con filtro por periodo.
   ===================================================== */

KF.registrarModulo({
  id: 'resultados',
  nombre: 'Estado de Resultados',
  icono: '📊',
  orden: 11,
  render: function (cont) {

    var periodo = 'mes'; // hoy | semana | mes | todo

    function rango() {
      var hoy = new Date(); hoy.setHours(0,0,0,0);
      var d = new Date(hoy);
      if (periodo === 'hoy')    d = hoy;
      if (periodo === 'semana') d.setDate(hoy.getDate() - 6);
      if (periodo === 'mes')    d.setDate(1);
      if (periodo === 'todo')   d = new Date(0);
      return d.getTime();
    }
    function dentro(iso) { return new Date(iso).getTime() >= rango(); }

    function calcular() {
      var ventas   = KF.leer('ventas',   []).filter(function (x) { return dentro(x.fecha); });
      var gastos   = KF.leer('gastos',   []).filter(function (x) { return dentro(x.fecha); });
      var ingresos = KF.leer('ingresos', []).filter(function (x) { return dentro(x.fecha); });

      var ventasNetas = 0, costoVentas = 0;
      ventas.forEach(function (v) {
        ventasNetas += KF.num(v.total);
        costoVentas += KF.num(v.costoTotal);
      });

      var utilidadBruta = ventasNetas - costoVentas;

      var otrosIngresos = 0;
      ingresos.forEach(function (i) { otrosIngresos += KF.num(i.monto); });

      var gastosOperativos = 0;
      gastos.forEach(function (g) { gastosOperativos += KF.num(g.monto); });

      var utilidadNeta = utilidadBruta + otrosIngresos - gastosOperativos;

      return {
        ventasNetas: ventasNetas,
        costoVentas: costoVentas,
        utilidadBruta: utilidadBruta,
        otrosIngresos: otrosIngresos,
        gastosOperativos: gastosOperativos,
        utilidadNeta: utilidadNeta,
        margenBruto: ventasNetas > 0 ? (utilidadBruta / ventasNetas * 100) : 0,
        margenNeto:  ventasNetas > 0 ? (utilidadNeta / ventasNetas * 100) : 0
      };
    }

    function pintar() {
      var r = calcular();

      var html = '';
      html += '<div class="kf-titulo-modulo">📊 Estado de Resultados</div>';
      html += '<div class="kf-subtitulo">Resumen de ingresos y gastos del período</div>';

      html += '<select id="kf-r-periodo" class="kf-buscador" style="padding-left:12px;background-image:none;margin-bottom:12px;">';
      html += '<option value="hoy"'    + (periodo==='hoy'   ?' selected':'') + '>Hoy</option>';
      html += '<option value="semana"' + (periodo==='semana'?' selected':'') + '>Últimos 7 días</option>';
      html += '<option value="mes"'    + (periodo==='mes'   ?' selected':'') + '>Este mes</option>';
      html += '<option value="todo"'   + (periodo==='todo'  ?' selected':'') + '>Todo</option>';
      html += '</select>';

      html += '<div class="kf-card">';
      html += fila('Ventas netas', r.ventasNetas, 'var(--azul-medio)', false);
      html += fila('- Costo de ventas', r.costoVentas, 'var(--rojo)', false);
      html += filaBold('= Utilidad bruta', r.utilidadBruta, r.utilidadBruta >= 0 ? 'var(--verde)' : 'var(--rojo)');
      html += fila('+ Otros ingresos', r.otrosIngresos, 'var(--verde)', false);
      html += fila('- Gastos operativos', r.gastosOperativos, 'var(--rojo)', false);
      html += filaBold('= Utilidad neta', r.utilidadNeta, r.utilidadNeta >= 0 ? 'var(--verde)' : 'var(--rojo)');
      html += '</div>';

      // Margenes
      html += '<div class="kf-grid-resumen">';
      html += '<div class="kf-mini-card ' + (r.margenBruto >= 20 ? 'positivo' : 'acento') + '"><div class="lbl">Margen bruto</div><div class="val">' + r.margenBruto.toFixed(1) + '%</div></div>';
      html += '<div class="kf-mini-card ' + (r.margenNeto >= 10 ? 'positivo' : 'acento') + '"><div class="lbl">Margen neto</div><div class="val">' + r.margenNeto.toFixed(1) + '%</div></div>';
      html += '</div>';

      // Nota interpretativa
      html += '<div class="kf-card" style="background:var(--azul-suave);border:1px solid var(--azul-claro);">';
      html += '<div style="font-size:13px;color:var(--azul-medio);">' + interpretar(r) + '</div>';
      html += '</div>';

      cont.innerHTML = html;

      document.getElementById('kf-r-periodo').addEventListener('change', function (e) {
        periodo = e.target.value; pintar();
      });
    }

    function fila(etiqueta, valor, color, negrita) {
      var html = '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--gris-borde);font-size:14px;">';
      html += '<span>' + etiqueta + '</span>';
      html += '<b style="color:' + color + ';">' + KF.dinero(valor) + '</b>';
      html += '</div>';
      return html;
    }
    function filaBold(etiqueta, valor, color) {
      var html = '<div style="display:flex;justify-content:space-between;padding:10px 0;font-size:15px;font-weight:800;color:' + color + ';">';
      html += '<span>' + etiqueta + '</span>';
      html += '<span>' + KF.dinero(valor) + '</span>';
      html += '</div>';
      return html;
    }

    function interpretar(r) {
      if (r.ventasNetas === 0) return 'Aún no hay ventas registradas en este período.';
      if (r.utilidadNeta < 0) return '⚠️ Estás perdiendo dinero en este período. Revisa tus gastos y precios de venta.';
      if (r.margenNeto < 10)  return '⚠️ Tu margen neto es bajo (' + r.margenNeto.toFixed(1) + '%). Considera subir precios o reducir gastos.';
      if (r.margenNeto < 25)  return '✅ Margen neto aceptable (' + r.margenNeto.toFixed(1) + '%). Puedes trabajar en reducir gastos para mejorarlo.';
      return '🌟 ¡Excelente! Margen neto de ' + r.margenNeto.toFixed(1) + '%, muy saludable.';
    }

    pintar();
  }
});