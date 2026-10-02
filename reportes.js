/* =====================================================
   Modulo: Reportes
   Informes diario / semanal / mensual
   - PDF: usa jsPDF si esta disponible, si no, imprime
     a PDF con el dialogo del sistema (window.print)
   - CSV: descarga como archivo
   - Imagen: canvas con resumen compartible
   ===================================================== */

KF.registrarModulo({
  id: 'reportes',
  nombre: 'Reportes',
  icono: '📄',
  orden: 15,
  render: function (cont) {

    var periodo = 'hoy';

    function rango() {
      var hoy = new Date(); hoy.setHours(0,0,0,0);
      var d = new Date(hoy);
      if (periodo === 'hoy')    d = hoy;
      if (periodo === 'semana') d.setDate(hoy.getDate() - 6);
      if (periodo === 'mes')    d.setDate(1);
      return d.getTime();
    }
    function dentro(iso) { return new Date(iso).getTime() >= rango(); }
    function etiquetaPeriodo() {
      return periodo === 'hoy' ? 'Diario' :
             periodo === 'semana' ? 'Últimos 7 días' : 'Mensual';
    }

    // ---------- Calculo del reporte ----------
    function calcular() {
      var ventas   = KF.leer('ventas',   []).filter(function (x) { return dentro(x.fecha); });
      var compras  = KF.leer('compras',  []).filter(function (x) { return dentro(x.fecha); });
      var gastos   = KF.leer('gastos',   []).filter(function (x) { return dentro(x.fecha); });
      var ingresos = KF.leer('ingresos', []).filter(function (x) { return dentro(x.fecha); });

      var totalVentas = 0, gananciaVentas = 0, costoVentas = 0;
      var porProducto = {};
      ventas.forEach(function (v) {
        totalVentas += KF.num(v.total);
        gananciaVentas += KF.num(v.ganancia);
        costoVentas += KF.num(v.costoTotal);
        var n = v.productoNombre || '(sin nombre)';
        if (!porProducto[n]) porProducto[n] = { nombre: n, cantidad: 0, total: 0, ganancia: 0 };
        porProducto[n].cantidad += KF.num(v.cantidad);
        porProducto[n].total    += KF.num(v.total);
        porProducto[n].ganancia += KF.num(v.ganancia);
      });

      var totalGastos = 0;
      gastos.forEach(function (g) { totalGastos += KF.num(g.monto); });

      var totalIngresos = 0;
      ingresos.forEach(function (i) { totalIngresos += KF.num(i.monto); });

      var totalCompras = 0;
      compras.forEach(function (c) { totalCompras += KF.num(c.total); });

      var utilidad = gananciaVentas + totalIngresos - totalGastos;

      var top = Object.keys(porProducto).map(function (k) { return porProducto[k]; })
        .sort(function (a, b) { return b.ganancia - a.ganancia; });

      return {
        periodo: etiquetaPeriodo(),
        desde: new Date(rango()),
        hasta: new Date(),
        negocio: KF.negocioActivo ? KF.negocioActivo.nombre : 'Negocio',
        moneda: (KF.negocioActivo && KF.negocioActivo.moneda) || 'CUP',
        totalVentas: totalVentas,
        gananciaVentas: gananciaVentas,
        costoVentas: costoVentas,
        totalCompras: totalCompras,
        totalGastos: totalGastos,
        totalIngresos: totalIngresos,
        utilidad: utilidad,
        nVentas: ventas.length,
        nCompras: compras.length,
        nGastos: gastos.length,
        nIngresos: ingresos.length,
        top: top,
        ventasDetalle: ventas
      };
    }

    // ---------- Interfaz ----------
    function pintar() {
      var r = calcular();

      var html = '';
      html += '<div class="kf-titulo-modulo">📄 Reportes</div>';
      html += '<div class="kf-subtitulo">Genera informes de tu negocio</div>';

      // Selector de periodo
      html += '<div class="kf-fila" style="margin-bottom:12px;">';
      html += '<button class="kf-btn ' + (periodo==='hoy'?'kf-btn-primario':'kf-btn-gris') + '" data-periodo="hoy">Diario</button>';
      html += '<button class="kf-btn ' + (periodo==='semana'?'kf-btn-primario':'kf-btn-gris') + '" data-periodo="semana">Semanal</button>';
      html += '<button class="kf-btn ' + (periodo==='mes'?'kf-btn-primario':'kf-btn-gris') + '" data-periodo="mes">Mensual</button>';
      html += '</div>';

      // Vista previa del informe
      html += '<div class="kf-card">';
      html += '<div class="kf-card-titulo">' + r.periodo + '</div>';
      html += '<div style="font-size:12px;color:#7b8a9a;margin-bottom:8px;">' + fechaLarga(r.desde) + ' → ' + fechaLarga(r.hasta) + '</div>';
      html += linea('Ventas', r.totalVentas, 'var(--azul-medio)');
      html += linea('Costo de ventas', r.costoVentas, 'var(--rojo)');
      html += linea('Ganancia bruta', r.gananciaVentas, r.gananciaVentas >= 0 ? 'var(--verde)' : 'var(--rojo)');
      html += linea('Otros ingresos', r.totalIngresos, 'var(--verde)');
      html += linea('Gastos', r.totalGastos, 'var(--rojo)');
      html += lineaFuerte('Utilidad neta', r.utilidad, r.utilidad >= 0 ? 'var(--verde)' : 'var(--rojo)');
      html += '</div>';

      // Contadores
      html += '<div class="kf-grid-resumen">';
      html += '<div class="kf-mini-card"><div class="lbl">Ventas</div><div class="val">' + r.nVentas + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Compras</div><div class="val">' + r.nCompras + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Gastos</div><div class="val">' + r.nGastos + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Ingresos</div><div class="val">' + r.nIngresos + '</div></div>';
      html += '</div>';

      // Top productos
      if (r.top.length) {
        html += '<div class="kf-card">';
        html += '<div class="kf-card-titulo">Top 5 productos rentables</div>';
        r.top.slice(0, 5).forEach(function (p, i) {
          html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gris-borde);font-size:14px;">';
          html += '<span>#' + (i+1) + ' ' + KF.esc(p.nombre) + ' <small style="color:#7b8a9a;">x' + p.cantidad + '</small></span>';
          html += '<b style="color:var(--verde);">' + KF.dinero(p.ganancia) + '</b>';
          html += '</div>';
        });
        html += '</div>';
      }

      // Acciones
      html += '<div class="kf-card-titulo" style="margin:8px 2px 8px 2px;">Exportar</div>';
      html += '<div class="kf-fila" style="margin-bottom:10px;">';
      html += '<button class="kf-btn kf-btn-primario" id="kf-rp-pdf" type="button">🖨️ PDF</button>';
      html += '<button class="kf-btn kf-btn-verde" id="kf-rp-csv" type="button">📊 CSV</button>';
      html += '</div>';
      html += '<button class="kf-btn kf-btn-dorado kf-btn-bloque" id="kf-rp-img" type="button">🖼️ Generar imagen para compartir</button>';

      cont.innerHTML = html;

      // Enlazar botones de periodo
      var btnsP = cont.querySelectorAll('button[data-periodo]');
      for (var i = 0; i < btnsP.length; i++) {
        btnsP[i].addEventListener('click', function (e) {
          periodo = e.currentTarget.getAttribute('data-periodo');
          pintar();
        });
      }

      document.getElementById('kf-rp-pdf').addEventListener('click', function () { exportarPDF(r); });
      document.getElementById('kf-rp-csv').addEventListener('click', function () { exportarCSV(r); });
      document.getElementById('kf-rp-img').addEventListener('click', function () { generarImagen(r); });
    }

    function fechaLarga(d) {
      var meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
      return d.getDate() + ' ' + meses[d.getMonth()] + ' ' + d.getFullYear();
    }
    function linea(etiqueta, valor, color) {
      return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gris-borde);font-size:14px;">' +
             '<span>' + etiqueta + '</span><b style="color:' + color + ';">' + KF.dinero(valor) + '</b></div>';
    }
    function lineaFuerte(etiqueta, valor, color) {
      return '<div style="display:flex;justify-content:space-between;padding:10px 0;font-size:15px;font-weight:800;color:' + color + ';">' +
             '<span>' + etiqueta + '</span><span>' + KF.dinero(valor) + '</span></div>';
    }

    // ---------- PDF (via print o jsPDF si esta) ----------
    function exportarPDF(r) {
      // Si jsPDF esta disponible, generar PDF real
      if (window.jspdf && window.jspdf.jsPDF) {
        try {
          var doc = new window.jspdf.jsPDF();
          var y = 20;
          doc.setFontSize(18); doc.setTextColor(22, 50, 79);
          doc.text('KontaFin - Reporte ' + r.periodo, 14, y); y += 8;
          doc.setFontSize(11); doc.setTextColor(100);
          doc.text(r.negocio + ' · ' + fechaLarga(r.desde) + ' a ' + fechaLarga(r.hasta), 14, y); y += 12;
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
          doc.setFontSize(13); doc.setTextColor(22, 50, 79);
          doc.text('Top 5 productos', 14, y); y += 7;
          doc.setFontSize(11); doc.setTextColor(0);
          r.top.slice(0, 5).forEach(function (p, i) {
            doc.text((i+1) + '. ' + p.nombre, 14, y);
            doc.text(KF.dinero(p.ganancia), 196, y, { align: 'right' });
            y += 6;
          });
          doc.save('KontaFin-' + r.periodo.toLowerCase().replace(/ /g,'-') + '.pdf');
          KF.aviso('PDF generado', 'ok');
          return;
        } catch (e) {
          // si falla, cae al metodo print
        }
      }

      // Metodo sin libreria: abrir dialogo de impresion -> guardar como PDF
      var html = generarHTMLInforme(r);
      imprimir(html);
      KF.aviso('Elige "Guardar como PDF" en el diálogo', 'info');
    }

    // ---------- Impresion (iframe oculto) ----------
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

      h += '<h2>Resumen</h2>';
      h += '<table>';
      h += '<tr><td>Ventas</td><td class="num">' + KF.dinero(r.totalVentas) + '</td></tr>';
      h += '<tr><td>Costo de ventas</td><td class="num rojo">' + KF.dinero(r.costoVentas) + '</td></tr>';
      h += '<tr class="fuerte"><td>Ganancia bruta</td><td class="num ' + (r.gananciaVentas>=0?'verde':'rojo') + '">' + KF.dinero(r.gananciaVentas) + '</td></tr>';
      h += '<tr><td>Otros ingresos</td><td class="num verde">' + KF.dinero(r.totalIngresos) + '</td></tr>';
      h += '<tr><td>Gastos</td><td class="num rojo">' + KF.dinero(r.totalGastos) + '</td></tr>';
      h += '<tr class="fuerte"><td>Utilidad neta</td><td class="num ' + (r.utilidad>=0?'verde':'rojo') + '">' + KF.dinero(r.utilidad) + '</td></tr>';
      h += '</table>';

      h += '<h2>Operaciones</h2>';
      h += '<table>';
      h += '<tr><th>Concepto</th><th class="num">Cantidad</th></tr>';
      h += '<tr><td>Ventas registradas</td><td class="num">' + r.nVentas + '</td></tr>';
      h += '<tr><td>Compras registradas</td><td class="num">' + r.nCompras + '</td></tr>';
      h += '<tr><td>Gastos registrados</td><td class="num">' + r.nGastos + '</td></tr>';
      h += '<tr><td>Ingresos registrados</td><td class="num">' + r.nIngresos + '</td></tr>';
      h += '</table>';

      if (r.top.length) {
        h += '<h2>Top productos por ganancia</h2>';
        h += '<table>';
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

    // ---------- CSV ----------
    function exportarCSV(r) {
      var ventas = KF.leer('ventas', []).filter(function (x) { return dentro(x.fecha); });
      var compras = KF.leer('compras', []).filter(function (x) { return dentro(x.fecha); });
      var gastos = KF.leer('gastos', []).filter(function (x) { return dentro(x.fecha); });
      var ingresos = KF.leer('ingresos', []).filter(function (x) { return dentro(x.fecha); });

      var filas = [['Tipo','Fecha','Concepto','Producto','Cantidad','PrecioUnit','Total','Ganancia','FormaPago','Cliente/Prov']];
      ventas.forEach(function (v) {
        filas.push(['Venta', v.fecha, v.notas||'', v.productoNombre||'', v.cantidad||0,
                    v.precioUnitario||0, v.total||0, v.ganancia||0,
                    v.formaPago||'', v.cliente||'']);
      });
      compras.forEach(function (c) {
        filas.push(['Compra', c.fecha, c.notas||'', c.productoNombre||'', c.cantidad||0,
                    c.costoUnitario||0, c.total||0, '', c.formaPago||'', c.proveedor||'']);
      });
      gastos.forEach(function (g) {
        filas.push(['Gasto', g.fecha, g.concepto||'', '', '', '', g.monto||0, '', g.categoria||'', '']);
      });
      ingresos.forEach(function (i) {
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
      var ok = descargarBlob(nombre, csv, 'text/csv;charset=utf-8;');
      if (ok) KF.aviso('CSV generado. Ábrelo en Excel o Google Sheets.', 'ok');
      else    KF.aviso('No se pudo descargar. Copia manual.', 'error');
    }

    function descargarBlob(nombre, contenido, tipoMime) {
      try {
        var blob = new Blob(['\ufeff' + contenido], { type: tipoMime });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = nombre;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          if (a.parentNode) a.parentNode.removeChild(a);
          URL.revokeObjectURL(url);
        }, 800);
        return true;
      } catch (e) {
        return false;
      }
    }

    // ---------- Imagen canvas ----------
    function generarImagen(r) {
      var W = 720, H = 1000;
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      var g = cv.getContext('2d');

      // Fondo
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, W, H);

      // Cabecera azul
      g.fillStyle = '#16324f';
      g.fillRect(0, 0, W, 130);
      g.fillStyle = '#f2a900';
      g.fillRect(0, 130, W, 6);

      // Logo K
      g.fillStyle = '#f2a900';
      g.fillRect(30, 30, 60, 60);
      g.fillStyle = '#16324f';
      g.font = 'bold 40px Arial';
      g.textAlign = 'center';
      g.fillText('K', 60, 73);

      // Titulo
      g.fillStyle = '#ffffff';
      g.textAlign = 'left';
      g.font = 'bold 26px Arial';
      g.fillText('KontaFin', 105, 60);
      g.font = '14px Arial';
      g.fillStyle = '#a8c0d8';
      g.fillText('Reporte ' + r.periodo, 105, 85);
      g.fillText(r.negocio, 105, 105);

      // Subtitulo fecha
      g.fillStyle = '#46566a';
      g.font = '13px Arial';
      g.fillText(fechaLarga(r.desde) + '  →  ' + fechaLarga(r.hasta), 30, 170);

      var y = 200;
      function filaRep(etiqueta, valor, color) {
        g.fillStyle = '#46566a';
        g.font = '14px Arial';
        g.fillText(etiqueta, 30, y);
        g.fillStyle = color;
        g.font = 'bold 14px Arial';
        g.textAlign = 'right';
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
      g.fillStyle = '#f2a900';
      g.fillRect(30, y, W - 60, 3);
      y += 30;

      g.fillStyle = '#0d1f33';
      g.font = 'bold 22px Arial';
      g.textAlign = 'left';
      g.fillText('Utilidad neta', 30, y);
      g.fillStyle = r.utilidad >= 0 ? '#2e7d32' : '#c62828';
      g.textAlign = 'right';
      g.fillText(KF.dinero(r.utilidad), W - 30, y);
      g.textAlign = 'left';
      y += 40;

      // Operaciones
      y += 10;
      g.fillStyle = '#16324f';
      g.font = 'bold 16px Arial';
      g.fillText('Operaciones', 30, y);
      y += 22;
      g.font = '13px Arial';
      g.fillStyle = '#46566a';
      g.fillText('Ventas: ' + r.nVentas + '   ·   Compras: ' + r.nCompras +
                 '   ·   Gastos: ' + r.nGastos + '   ·   Ingresos: ' + r.nIngresos, 30, y);
      y += 34;

      // Top productos
      if (r.top.length) {
        g.fillStyle = '#16324f';
        g.font = 'bold 16px Arial';
        g.fillText('Top 5 productos rentables', 30, y);
        y += 24;
        g.font = '13px Arial';
        r.top.slice(0, 5).forEach(function (p, i) {
          g.fillStyle = '#46566a';
          g.textAlign = 'left';
          g.fillText('#' + (i+1) + ' ' + p.nombre + '  x' + p.cantidad, 30, y);
          g.fillStyle = '#2e7d32';
          g.textAlign = 'right';
          g.font = 'bold 13px Arial';
          g.fillText(KF.dinero(p.ganancia), W - 30, y);
          g.textAlign = 'left';
          g.font = '13px Arial';
          y += 22;
        });
      }

      // Pie
      g.fillStyle = '#9aa7b4';
      g.font = '11px Arial';
      g.textAlign = 'center';
      g.fillText('Generado por KontaFin · OSTICOR · ' + new Date().toLocaleString(), W / 2, H - 30);

      // Convertir y compartir / descargar
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
        a.href = url;
        a.download = 'KontaFin-reporte.png';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          if (a.parentNode) a.parentNode.removeChild(a);
          URL.revokeObjectURL(url);
        }, 800);
        KF.aviso('Imagen descargada', 'ok');
      } catch (e) {
        KF.aviso('No se pudo descargar la imagen', 'error');
      }
    }

    pintar();
  }
});