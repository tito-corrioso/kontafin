/* =====================================================
   Modulo: Reportes - Version 2
   Novedades:
   - Filtro por fechas personalizadas (Desde / Hasta)
   - Boton Excel .xlsx (usa SheetJS) con 3 hojas
   - Funcion reutilizable KF.calcularReporte(desde, hasta)
     que tambien usaran los Cierres
   - PDF real con jsPDF (si esta disponible)
   - CSV con BOM UTF-8 (Excel sin problemas de acentos)
   - Imagen canvas para compartir
   ===================================================== */

/* =====================================================
   FUNCION REUTILIZABLE DE CALCULO DE REPORTE
   Recibe dos timestamps (ms) y devuelve el resumen completo
   del periodo. La usaran Reportes, Cierres y lo que venga.
   ===================================================== */
KF.calcularReporte = function (desdeMs, hastaMs) {

  function dentro(iso) {
    var t = new Date(iso).getTime();
    return t >= desdeMs && t <= hastaMs;
  }

  // --- Lecturas filtradas por fecha ---
  var ventas   = KF.leer('ventas',   []).filter(function (x) { return dentro(x.fecha); });
  var compras  = KF.leer('compras',  []).filter(function (x) { return dentro(x.fecha); });
  var gastos   = KF.leer('gastos',   []).filter(function (x) { return dentro(x.fecha); });
  var ingresos = KF.leer('ingresos', []).filter(function (x) { return dentro(x.fecha); });
  var capital  = KF.leer('capital',  []).filter(function (x) { return dentro(x.fecha); });
  var cxc      = KF.leer('cuentas-cobrar', []).filter(function (x) { return dentro(x.fecha); });
  var cxp      = KF.leer('cuentas-pagar',  []).filter(function (x) { return dentro(x.fecha); });

  // --- Agregados de ventas ---
  var totalVentas = 0, costoVentas = 0, gananciaVentas = 0;
  var porProducto = {};
  ventas.forEach(function (v) {
    totalVentas   += KF.num(v.total);
    costoVentas   += KF.num(v.costoTotal);
    gananciaVentas += KF.num(v.ganancia);
    var n = v.productoNombre || '(sin nombre)';
    if (!porProducto[n]) porProducto[n] = { nombre: n, cantidad: 0, total: 0, ganancia: 0 };
    porProducto[n].cantidad += KF.num(v.cantidad);
    porProducto[n].total    += KF.num(v.total);
    porProducto[n].ganancia += KF.num(v.ganancia);
  });
  var top = Object.keys(porProducto).map(function (k) { return porProducto[k]; })
    .sort(function (a, b) { return b.ganancia - a.ganancia; });

  // --- Otros movimientos ---
  var totalCompras = 0;
  compras.forEach(function (c) { totalCompras += KF.num(c.total); });

  var totalGastos = 0;
  gastos.forEach(function (g) { totalGastos += KF.num(g.monto); });

  var totalIngresos = 0;
  ingresos.forEach(function (i) { totalIngresos += KF.num(i.monto); });

  // --- Capital ---
  var totalAportes = 0, totalRetiros = 0;
  capital.forEach(function (m) {
    if (m.tipo === 'aporte') totalAportes += KF.num(m.monto);
    else                     totalRetiros += KF.num(m.monto);
  });

  // --- CxC / CxP nuevas del periodo ---
  var totalCxCNuevas = 0;
  cxc.forEach(function (c) { totalCxCNuevas += KF.num(c.monto); });
  var totalCxPNuevas = 0;
  cxp.forEach(function (c) { totalCxPNuevas += KF.num(c.monto); });

  // --- Resultado del periodo ---
  var utilidad = gananciaVentas + totalIngresos - totalGastos;

  // --- Saldo de caja al cierre del periodo ---
  var saldoCaja = 0;
  KF.leer('efectivo', []).forEach(function (m) {
    if (new Date(m.fecha).getTime() <= hastaMs) {
      saldoCaja += (m.tipo === 'ingreso' ? 1 : -1) * KF.num(m.monto);
    }
  });

  return {
    desdeMs: desdeMs,
    hastaMs: hastaMs,
    desde: new Date(desdeMs),
    hasta: new Date(hastaMs),
    negocio: KF.negocioActivo ? KF.negocioActivo.nombre : 'Negocio',
    moneda: (KF.negocioActivo && KF.negocioActivo.moneda) || 'CUP',

    totalVentas: totalVentas,
    costoVentas: costoVentas,
    gananciaVentas: gananciaVentas,
    totalCompras: totalCompras,
    totalGastos: totalGastos,
    totalIngresos: totalIngresos,
    utilidad: utilidad,

    nVentas: ventas.length,
    nCompras: compras.length,
    nGastos: gastos.length,
    nIngresos: ingresos.length,
    nCapital: capital.length,

    totalAportes: totalAportes,
    totalRetiros: totalRetiros,

    totalCxCNuevas: totalCxCNuevas,
    totalCxPNuevas: totalCxPNuevas,
    nCxC: cxc.length,
    nCxP: cxp.length,

    saldoCaja: saldoCaja,

    top: top,
    ventasDetalle: ventas,
    comprasDetalle: compras,
    gastosDetalle: gastos,
    ingresosDetalle: ingresos
  };
};

/* =====================================================
   MODULO REPORTES
   ===================================================== */
KF.registrarModulo({
  id: 'reportes',
  nombre: 'Reportes',
  icono: '📄',
  orden: 15,
  render: function (cont) {

    var modo = 'hoy';            // hoy | semana | mes | personalizado
    var desdeStr = '';           // YYYY-MM-DD
    var hastaStr = '';           // YYYY-MM-DD

    // ---------- Utilidades de fecha ----------
    function fechaInputA_ms(str, finDia) {
      if (!str) return null;
      var p = str.split('-');
      if (p.length !== 3) return null;
      var d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
      if (finDia) d.setHours(23, 59, 59, 999);
      else        d.setHours(0, 0, 0, 0);
      return d.getTime();
    }

    function hoyInputStr() {
      var d = new Date();
      var m = String(d.getMonth() + 1).padStart(2, '0');
      var dd = String(d.getDate()).padStart(2, '0');
      return d.getFullYear() + '-' + m + '-' + dd;
    }

    function fechaLarga(d) {
      var meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
      return d.getDate() + ' ' + meses[d.getMonth()] + ' ' + d.getFullYear();
    }

    // ---------- Rango segun modo ----------
    function calcularRango() {
      var ahora = Date.now();
      var hoy = new Date(); hoy.setHours(0, 0, 0, 0);

      if (modo === 'hoy') {
        return { desde: hoy.getTime(), hasta: ahora };
      }
      if (modo === 'semana') {
        var d = new Date(hoy); d.setDate(hoy.getDate() - 6);
        return { desde: d.getTime(), hasta: ahora };
      }
      if (modo === 'mes') {
        var d2 = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        return { desde: d2.getTime(), hasta: ahora };
      }
      // personalizado
      var ds = fechaInputA_ms(desdeStr, false) || hoy.getTime();
      var hs = fechaInputA_ms(hastaStr, true)  || ahora;
      if (ds > hs) { var tmp = ds; ds = hs; hs = tmp; }
      return { desde: ds, hasta: hs };
    }

    function etiquetaPeriodo() {
      if (modo === 'hoy')    return 'Diario';
      if (modo === 'semana') return 'Semanal';
      if (modo === 'mes')    return 'Mensual';
      return 'Personalizado';
    }

    // ---------- Interfaz ----------
    function pintar() {
      var r = calcularRango();
      var rep = KF.calcularReporte(r.desde, r.hasta);
      rep.periodo = etiquetaPeriodo();

      var html = '';
      html += '<div class="kf-titulo-modulo">📄 Reportes</div>';
      html += '<div class="kf-subtitulo">Genera informes de tu negocio</div>';

      // --- Selector de modo ---
      html += '<div class="kf-fila" style="margin-bottom:10px;">';
      html += '<button class="kf-btn ' + (modo==='hoy'?'kf-btn-primario':'kf-btn-gris') + '" data-modo="hoy">Diario</button>';
      html += '<button class="kf-btn ' + (modo==='semana'?'kf-btn-primario':'kf-btn-gris') + '" data-modo="semana">Semanal</button>';
      html += '<button class="kf-btn ' + (modo==='mes'?'kf-btn-primario':'kf-btn-gris') + '" data-modo="mes">Mensual</button>';
      html += '</div>';

      html += '<button class="kf-btn ' + (modo==='personalizado'?'kf-btn-dorado':'kf-btn-gris') + ' kf-btn-bloque" data-modo="personalizado" style="margin-bottom:10px;">📅 Rango personalizado</button>';

      // --- Inputs de fechas (solo si modo personalizado) ---
      if (modo === 'personalizado') {
        if (!desdeStr) desdeStr = hoyInputStr();
        if (!hastaStr) hastaStr = hoyInputStr();
        html += '<div class="kf-card">';
        html += '<div class="kf-fila">';
        html += '<div class="kf-campo"><label>Desde</label><input type="date" id="kf-rp-desde" value="' + desdeStr + '"></div>';
        html += '<div class="kf-campo"><label>Hasta</label><input type="date" id="kf-rp-hasta" value="' + hastaStr + '"></div>';
        html += '</div></div>';
      }

      // --- Vista previa del informe ---
      html += '<div class="kf-card">';
      html += '<div class="kf-card-titulo">' + rep.periodo + '</div>';
      html += '<div style="font-size:12px;color:#7b8a9a;margin-bottom:8px;">' + fechaLarga(rep.desde) + ' → ' + fechaLarga(rep.hasta) + '</div>';
      html += linea('Ventas', rep.totalVentas, 'var(--azul-medio)');
      html += linea('Costo de ventas', rep.costoVentas, 'var(--rojo)');
      html += linea('Ganancia bruta', rep.gananciaVentas, rep.gananciaVentas >= 0 ? 'var(--verde)' : 'var(--rojo)');
      html += linea('Otros ingresos', rep.totalIngresos, 'var(--verde)');
      html += linea('Gastos', rep.totalGastos, 'var(--rojo)');
      html += lineaFuerte('Utilidad neta', rep.utilidad, rep.utilidad >= 0 ? 'var(--verde)' : 'var(--rojo)');
      html += '</div>';

      // --- Contadores ---
      html += '<div class="kf-grid-resumen">';
      html += '<div class="kf-mini-card"><div class="lbl">Ventas</div><div class="val">' + rep.nVentas + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Compras</div><div class="val">' + rep.nCompras + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Gastos</div><div class="val">' + rep.nGastos + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Ingresos</div><div class="val">' + rep.nIngresos + '</div></div>';
      html += '</div>';

      // --- Top productos ---
      if (rep.top.length) {
        html += '<div class="kf-card">';
        html += '<div class="kf-card-titulo">Top 5 productos rentables</div>';
        rep.top.slice(0, 5).forEach(function (p, i) {
          html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gris-borde);font-size:14px;">';
          html += '<span>#' + (i+1) + ' ' + KF.esc(p.nombre) + ' <small style="color:#7b8a9a;">x' + p.cantidad + '</small></span>';
          html += '<b style="color:var(--verde);">' + KF.dinero(p.ganancia) + '</b>';
          html += '</div>';
        });
        html += '</div>';
      }

      // --- Botones de exportar ---
      html += '<div class="kf-card-titulo" style="margin:8px 2px 8px 2px;">Exportar</div>';
      html += '<div class="kf-fila" style="margin-bottom:10px;">';
      html += '<button class="kf-btn kf-btn-primario" id="kf-rp-pdf" type="button">🖨️ PDF</button>';
      html += '<button class="kf-btn kf-btn-verde" id="kf-rp-xlsx" type="button">📊 Excel</button>';
      html += '</div>';
      html += '<button class="kf-btn kf-btn-primario kf-btn-bloque" id="kf-rp-csv" type="button" style="margin-bottom:10px;">📋 CSV</button>';
      html += '<button class="kf-btn kf-btn-dorado kf-btn-bloque" id="kf-rp-img" type="button">🖼️ Generar imagen para compartir</button>';

      cont.innerHTML = html;

      // --- Enlazar modos ---
      var btnsM = cont.querySelectorAll('button[data-modo]');
      for (var i = 0; i < btnsM.length; i++) {
        btnsM[i].addEventListener('click', function (e) {
          modo = e.currentTarget.getAttribute('data-modo');
          pintar();
        });
      }

      // --- Enlazar inputs de fecha ---
      var inpD = document.getElementById('kf-rp-desde');
      var inpH = document.getElementById('kf-rp-hasta');
      if (inpD) inpD.addEventListener('change', function (e) { desdeStr = e.target.value; pintar(); });
      if (inpH) inpH.addEventListener('change', function (e) { hastaStr = e.target.value; pintar(); });

      // --- Enlazar exportaciones ---
      document.getElementById('kf-rp-pdf').addEventListener('click', function () { exportarPDF(rep); });
      document.getElementById('kf-rp-xlsx').addEventListener('click', function () { exportarExcel(rep); });
      document.getElementById('kf-rp-csv').addEventListener('click', function () { exportarCSV(rep); });
      document.getElementById('kf-rp-img').addEventListener('click', function () { generarImagen(rep); });
    }

    // ---------- Bloques HTML auxiliares ----------
    function linea(etiqueta, valor, color) {
      return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gris-borde);font-size:14px;">' +
             '<span>' + etiqueta + '</span><b style="color:' + color + ';">' + KF.dinero(valor) + '</b></div>';
    }
    function lineaFuerte(etiqueta, valor, color) {
      return '<div style="display:flex;justify-content:space-between;padding:10px 0;font-size:15px;font-weight:800;color:' + color + ';">' +
             '<span>' + etiqueta + '</span><span>' + KF.dinero(valor) + '</span></div>';
    }

    // =====================================================
    // EXPORTAR PDF
    // =====================================================
    function exportarPDF(r) {
      // Si jsPDF esta disponible, generar PDF real
      if (window.jspdf && window.jspdf.jsPDF) {
        try {
          var doc = new window.jspdf.jsPDF();
          var y = 20;

          // Cabecera
          doc.setFontSize(18); doc.setTextColor(22, 50, 79);
          doc.text('KontaFin - Reporte ' + r.periodo, 14, y); y += 8;
          doc.setFontSize(11); doc.setTextColor(100);
          doc.text(r.negocio + ' · ' + fechaLarga(r.desde) + ' a ' + fechaLarga(r.hasta), 14, y); y += 12;

          // Tabla de resumen
          doc.setTextColor(0); doc.setFontSize(12);
          var filas = [
            ['Ventas', KF.dinero(r.totalVentas)],
            ['Costo de ventas', KF.dinero(r.costoVentas)],
            ['Ganancia bruta', KF.dinero(r.gananciaVentas)],
            ['Otros ingresos', KF.dinero(r.totalIngresos)],
            ['Gastos', KF.dinero(r.totalGastos)],
            ['Utilidad neta', KF.dinero(r.utilidad)]
          ];
          filas.forEach(function (f) {
            doc.text(f[0], 14, y);
            doc.text(f[1], 196, y, { align: 'right' });
            y += 7;
          });
          y += 6;

          // Operaciones
          doc.setFontSize(13); doc.setTextColor(22, 50, 79);
          doc.text('Operaciones', 14, y); y += 7;
          doc.setFontSize(11); doc.setTextColor(0);
          var operaciones = [
            ['Ventas registradas', r.nVentas],
            ['Compras registradas', r.nCompras],
            ['Gastos registrados', r.nGastos],
            ['Ingresos registrados', r.nIngresos]
          ];
          operaciones.forEach(function (f) {
            doc.text(f[0], 14, y);
            doc.text(String(f[1]), 196, y, { align: 'right' });
            y += 6;
          });
          y += 6;

          // Top productos
          if (r.top.length) {
            doc.setFontSize(13); doc.setTextColor(22, 50, 79);
            doc.text('Top 5 productos', 14, y); y += 7;
            doc.setFontSize(11); doc.setTextColor(0);
            r.top.slice(0, 5).forEach(function (p, i) {
              doc.text((i+1) + '. ' + p.nombre + '  x' + p.cantidad, 14, y);
              doc.text(KF.dinero(p.ganancia), 196, y, { align: 'right' });
              y += 6;
            });
          }

          var nombre = 'KontaFin-' + r.periodo.toLowerCase().replace(/ /g,'-') + '-' + KF.hoy() + '.pdf';
          doc.save(nombre);
          KF.aviso('PDF generado', 'ok');
          return;
        } catch (e) {
          // Si falla, se cae al metodo de impresion
        }
      }

      // Metodo sin libreria: dialogo de impresion del sistema
      var html = generarHTMLInforme(r);
      imprimir(html);
      KF.aviso('Elige "Guardar como PDF" en el diálogo', 'info');
    }

    function imprimir(html) {
      var iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      var doc = iframe.contentWindow.document;
      doc.open();
      doc.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reporte KontaFin</title>' +
        '<style>' + estilosImpresion() + '</style></head><body>' + html + '</body></html>');
      doc.close();

      setTimeout(function () {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (e) {
          KF.aviso('No se pudo imprimir. Copia los datos manualmente.', 'error');
        }
        setTimeout(function () {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 1500);
      }, 400);
    }

    function estilosImpresion() {
      return 'body{font-family:Arial,sans-serif;color:#222;padding:20px;}' +
        'h1{color:#16324f;font-size:22px;border-bottom:3px solid #f2a900;padding-bottom:8px;margin-bottom:4px;}' +
        '.sub{color:#777;font-size:12px;margin-bottom:16px;}' +
        'table{width:100%;border-collapse:collapse;margin-top:12px;}' +
        'th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #ddd;font-size:13px;}' +
        'th{background:#e8f0f8;color:#16324f;}' +
        '.num{text-align:right;}' +
        '.fuerte{font-weight:bold;border-top:2px solid #16324f;}' +
        '.verde{color:#2e7d32;}.rojo{color:#c62828;}' +
        '.pie{margin-top:24px;font-size:11px;color:#888;text-align:center;border-top:1px solid #eee;padding-top:10px;}';
    }

    function generarHTMLInforme(r) {
      var h = '';
      h += '<h1>Reporte ' + r.periodo + '</h1>';
      h += '<div class="sub">' + KF.esc(r.negocio) + ' · ' + fechaLarga(r.desde) + ' a ' + fechaLarga(r.hasta) + '</div>';

      h += '<h2>Resumen</h2><table>';
      h += '<tr><td>Ventas</td><td class="num">' + KF.dinero(r.totalVentas) + '</td></tr>';
      h += '<tr><td>Costo de ventas</td><td class="num rojo">' + KF.dinero(r.costoVentas) + '</td></tr>';
      h += '<tr class="fuerte"><td>Ganancia bruta</td><td class="num ' + (r.gananciaVentas>=0?'verde':'rojo') + '">' + KF.dinero(r.gananciaVentas) + '</td></tr>';
      h += '<tr><td>Otros ingresos</td><td class="num verde">' + KF.dinero(r.totalIngresos) + '</td></tr>';
      h += '<tr><td>Gastos</td><td class="num rojo">' + KF.dinero(r.totalGastos) + '</td></tr>';
      h += '<tr class="fuerte"><td>Utilidad neta</td><td class="num ' + (r.utilidad>=0?'verde':'rojo') + '">' + KF.dinero(r.utilidad) + '</td></tr>';
      h += '</table>';

      h += '<h2>Operaciones</h2><table>';
      h += '<tr><th>Concepto</th><th class="num">Cantidad</th></tr>';
      h += '<tr><td>Ventas</td><td class="num">' + r.nVentas + '</td></tr>';
      h += '<tr><td>Compras</td><td class="num">' + r.nCompras + '</td></tr>';
      h += '<tr><td>Gastos</td><td class="num">' + r.nGastos + '</td></tr>';
      h += '<tr><td>Ingresos</td><td class="num">' + r.nIngresos + '</td></tr>';
      h += '</table>';

      if (r.top.length) {
        h += '<h2>Top productos por ganancia</h2><table>';
        h += '<tr><th>#</th><th>Producto</th><th class="num">Cant.</th><th class="num">Ganancia</th></tr>';
        r.top.slice(0, 10).forEach(function (p, i) {
          h += '<tr><td>' + (i+1) + '</td><td>' + KF.esc(p.nombre) + '</td>' +
               '<td class="num">' + p.cantidad + '</td>' +
               '<td class="num verde">' + KF.dinero(p.ganancia) + '</td></tr>';
        });
        h += '</table>';
      }

      h += '<div class="pie">Generado por KontaFin · OSTICOR · ' + new Date().toLocaleString() + '</div>';
      return h;
    }

    // =====================================================
    // EXPORTAR EXCEL .xlsx  (usa SheetJS)
    // =====================================================
    function exportarExcel(r) {
      if (!window.XLSX) {
        KF.aviso('La librería Excel no está cargada. Añade xlsx.full.min.js', 'error');
        return;
      }
      try {
        var wb = window.XLSX.utils.book_new();

        // --- Hoja 1: Resumen ---
        var resumen = [
          ['KontaFin - Reporte ' + r.periodo],
          ['Negocio', r.negocio],
          ['Desde', fechaLarga(r.desde)],
          ['Hasta', fechaLarga(r.hasta)],
          [],
          ['Concepto', 'Monto'],
          ['Ventas', r.totalVentas],
          ['Costo de ventas', r.costoVentas],
          ['Ganancia bruta', r.gananciaVentas],
          ['Otros ingresos', r.totalIngresos],
          ['Gastos', r.totalGastos],
          ['Utilidad neta', r.utilidad],
          [],
          ['Operaciones', 'Cantidad'],
          ['Ventas registradas', r.nVentas],
          ['Compras registradas', r.nCompras],
          ['Gastos registrados', r.nGastos],
          ['Ingresos registrados', r.nIngresos]
        ];
        var ws1 = window.XLSX.utils.aoa_to_sheet(resumen);
        ws1['!cols'] = [{ wch: 30 }, { wch: 18 }];
        window.XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');

        // --- Hoja 2: Ventas detalle ---
        var ventas = [['Fecha', 'Producto', 'Cantidad', 'Precio Unit.', 'Total', 'Costo', 'Ganancia', 'Forma de Pago', 'Cliente']];
        r.ventasDetalle.forEach(function (v) {
          ventas.push([
            v.fecha || '',
            v.productoNombre || '',
            KF.num(v.cantidad),
            KF.num(v.precioUnitario),
            KF.num(v.total),
            KF.num(v.costoTotal),
            KF.num(v.ganancia),
            v.formaPago || '',
            v.cliente || ''
          ]);
        });
        var ws2 = window.XLSX.utils.aoa_to_sheet(ventas);
        window.XLSX.utils.book_append_sheet(wb, ws2, 'Ventas');

        // --- Hoja 3: Compras detalle ---
        if (r.comprasDetalle.length) {
          var compras = [['Fecha', 'Producto', 'Cantidad', 'Costo Unit.', 'Total', 'Forma de Pago', 'Proveedor']];
          r.comprasDetalle.forEach(function (c) {
            compras.push([
              c.fecha || '',
              c.productoNombre || '',
              KF.num(c.cantidad),
              KF.num(c.costoUnitario),
              KF.num(c.total),
              c.formaPago || '',
              c.proveedor || ''
            ]);
          });
          var ws3 = window.XLSX.utils.aoa_to_sheet(compras);
          window.XLSX.utils.book_append_sheet(wb, ws3, 'Compras');
        }

        // --- Hoja 4: Gastos e Ingresos ---
        var gi = [['Tipo', 'Fecha', 'Concepto', 'Categoría', 'Monto']];
        r.gastosDetalle.forEach(function (g) {
          gi.push(['Gasto', g.fecha || '', g.concepto || '', g.categoria || '', KF.num(g.monto)]);
        });
        r.ingresosDetalle.forEach(function (i) {
          gi.push(['Ingreso', i.fecha || '', i.concepto || '', i.categoria || '', KF.num(i.monto)]);
        });
        if (gi.length > 1) {
          var ws4 = window.XLSX.utils.aoa_to_sheet(gi);
          window.XLSX.utils.book_append_sheet(wb, ws4, 'Gastos e Ingresos');
        }

        // --- Hoja 5: Top productos ---
        if (r.top.length) {
          var top = [['#', 'Producto', 'Cantidad', 'Total vendido', 'Ganancia']];
          r.top.forEach(function (p, i) {
            top.push([i+1, p.nombre, p.cantidad, p.total, p.ganancia]);
          });
          var ws5 = window.XLSX.utils.aoa_to_sheet(top);
          window.XLSX.utils.book_append_sheet(wb, ws5, 'Top Productos');
        }

        var nombre = 'KontaFin-' + r.periodo.toLowerCase().replace(/ /g,'-') + '-' + KF.hoy() + '.xlsx';
        window.XLSX.writeFile(wb, nombre);
        KF.aviso('Excel generado', 'ok');
      } catch (e) {
        KF.aviso('Error al generar Excel: ' + e.message, 'error');
      }
    }

    // =====================================================
    // EXPORTAR CSV
    // =====================================================
    function exportarCSV(r) {
      var filas = [['Tipo','Fecha','Concepto','Producto','Cantidad','PrecioUnit','Total','Ganancia','FormaPago','Cliente/Prov']];

      r.ventasDetalle.forEach(function (v) {
        filas.push(['Venta', v.fecha, v.notas||'', v.productoNombre||'', v.cantidad||0,
                    v.precioUnitario||0, v.total||0, v.ganancia||0,
                    v.formaPago||'', v.cliente||'']);
      });
      r.comprasDetalle.forEach(function (c) {
        filas.push(['Compra', c.fecha, c.notas||'', c.productoNombre||'', c.cantidad||0,
                    c.costoUnitario||0, c.total||0, '', c.formaPago||'', c.proveedor||'']);
      });
      r.gastosDetalle.forEach(function (g) {
        filas.push(['Gasto', g.fecha, g.concepto||'', '', '', '', g.monto||0, '', g.categoria||'', '']);
      });
      r.ingresosDetalle.forEach(function (i) {
        filas.push(['Ingreso', i.fecha, i.concepto||'', '', '', '', i.monto||0, '', i.categoria||'', '']);
      });

      var csv = filas.map(function (fila) {
        return fila.map(function (campo) {
          var s = String(campo == null ? '' : campo);
          if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1) {
            s = '"' + s.replace(/"/g, '""') + '"';
          }
          return s;
        }).join(',');
      }).join('\n');

      var nombre = 'KontaFin-' + r.periodo.toLowerCase().replace(/ /g,'-') + '-' + KF.hoy() + '.csv';
      if (descargarBlob(nombre, '\ufeff' + csv, 'text/csv;charset=utf-8;')) {
        KF.aviso('CSV generado', 'ok');
      } else {
        KF.aviso('No se pudo descargar', 'error');
      }
    }

    // =====================================================
    // IMAGEN CANVAS PARA COMPARTIR
    // =====================================================
    function generarImagen(r) {
      var W = 720, H = 1000;
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      var g = cv.getContext('2d');

      g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);

      // Cabecera
      g.fillStyle = '#16324f'; g.fillRect(0, 0, W, 130);
      g.fillStyle = '#f2a900'; g.fillRect(0, 130, W, 6);

      g.fillStyle = '#f2a900'; g.fillRect(30, 30, 60, 60);
      g.fillStyle = '#16324f'; g.font = 'bold 40px Arial'; g.textAlign = 'center';
      g.fillText('K', 60, 73);

      g.fillStyle = '#ffffff'; g.textAlign = 'left';
      g.font = 'bold 26px Arial'; g.fillText('KontaFin', 105, 60);
      g.font = '14px Arial'; g.fillStyle = '#a8c0d8';
      g.fillText('Reporte ' + r.periodo, 105, 85);
      g.fillText(r.negocio, 105, 105);

      g.fillStyle = '#46566a'; g.font = '13px Arial';
      g.fillText(fechaLarga(r.desde) + '  →  ' + fechaLarga(r.hasta), 30, 170);

      var y = 200;
      function filaRep(etiqueta, valor, color) {
        g.fillStyle = '#46566a'; g.font = '14px Arial'; g.textAlign = 'left';
        g.fillText(etiqueta, 30, y);
        g.fillStyle = color; g.font = 'bold 14px Arial'; g.textAlign = 'right';
        g.fillText(KF.dinero(valor), W - 30, y);
        g.textAlign = 'left';
        g.strokeStyle = '#e0e5ec';
        g.beginPath(); g.moveTo(30, y + 8); g.lineTo(W - 30, y + 8); g.stroke();
        y += 34;
      }

      filaRep('Ventas', r.totalVentas, '#16324f');
      filaRep('Costo de ventas', r.costoVentas, '#c62828');
      filaRep('Ganancia bruta', r.gananciaVentas, r.gananciaVentas >= 0 ? '#2e7d32' : '#c62828');
      filaRep('Otros ingresos', r.totalIngresos, '#2e7d32');
      filaRep('Gastos', r.totalGastos, '#c62828');

      y += 8;
      g.fillStyle = '#f2a900'; g.fillRect(30, y, W - 60, 3);
      y += 30;

      g.fillStyle = '#0d1f33'; g.font = 'bold 22px Arial'; g.textAlign = 'left';
      g.fillText('Utilidad neta', 30, y);
      g.fillStyle = r.utilidad >= 0 ? '#2e7d32' : '#c62828';
      g.textAlign = 'right';
      g.fillText(KF.dinero(r.utilidad), W - 30, y);
      g.textAlign = 'left';
      y += 40;

      g.fillStyle = '#16324f'; g.font = 'bold 16px Arial';
      g.fillText('Operaciones', 30, y); y += 22;
      g.font = '13px Arial'; g.fillStyle = '#46566a';
      g.fillText('Ventas: ' + r.nVentas + '   ·   Compras: ' + r.nCompras +
                 '   ·   Gastos: ' + r.nGastos + '   ·   Ingresos: ' + r.nIngresos, 30, y);
      y += 34;

      if (r.top.length) {
        g.fillStyle = '#16324f'; g.font = 'bold 16px Arial';
        g.fillText('Top 5 productos rentables', 30, y); y += 24;
        r.top.slice(0, 5).forEach(function (p, i) {
          g.fillStyle = '#46566a'; g.font = '13px Arial'; g.textAlign = 'left';
          g.fillText('#' + (i+1) + ' ' + p.nombre + '  x' + p.cantidad, 30, y);
          g.fillStyle = '#2e7d32'; g.font = 'bold 13px Arial'; g.textAlign = 'right';
          g.fillText(KF.dinero(p.ganancia), W - 30, y);
          g.textAlign = 'left';
          y += 22;
        });
      }

      g.fillStyle = '#9aa7b4'; g.font = '11px Arial'; g.textAlign = 'center';
      g.fillText('Generado por KontaFin · OSTICOR · ' + new Date().toLocaleString(), W / 2, H - 30);

      cv.toBlob(function (blob) {
        if (!blob) { KF.aviso('No se pudo generar la imagen', 'error'); return; }
        var archivo = new File([blob], 'KontaFin-' + r.periodo.toLowerCase().replace(/ /g,'-') + '.png', { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
          navigator.share({
            files: [archivo],
            title: 'Reporte KontaFin',
            text: 'Reporte ' + r.periodo + ' de ' + r.negocio
          }).then(function () {
            KF.aviso('Compartido', 'ok');
          }).catch(function () {
            descargarImagen(blob);
          });
        } else {
          descargarImagen(blob);
        }
      }, 'image/png');
    }

    function descargarImagen(blob) {
      try {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'KontaFin-reporte.png';
        document.body.appendChild(a); a.click();
        setTimeout(function () {
          if (a.parentNode) a.parentNode.removeChild(a);
          URL.revokeObjectURL(url);
        }, 800);
        KF.aviso('Imagen descargada', 'ok');
      } catch (e) {
        KF.aviso('No se pudo descargar la imagen', 'error');
      }
    }

    // =====================================================
    // UTILIDAD DESCARGA BLOB
    // =====================================================
    function descargarBlob(nombre, contenido, tipoMime) {
      try {
        var blob = new Blob([contenido], { type: tipoMime });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = nombre;
        document.body.appendChild(a); a.click();
        setTimeout(function () {
          if (a.parentNode) a.parentNode.removeChild(a);
          URL.revokeObjectURL(url);
        }, 800);
        return true;
      } catch (e) { return false; }
    }

    // ---------- Arrancar ----------
    pintar();
  }
});