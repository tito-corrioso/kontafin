/* =====================================================
   Modulo: Cierres
   - Cierre diario (bloquea movimientos de ese dia)
   - Cierre mensual (solo resumen, no bloquea)
   - Historial de cierres
   - Exportar cierre a PDF / Excel
   Reutiliza KF.calcularReporte() definida en reportes.js
   ===================================================== */

/* =====================================================
   FUNCIONES GLOBALES DE BLOQUEO (usadas por otros modulos)
   ===================================================== */

// Convierte Date / string / undefined a 'YYYY-MM-DD'
KF.fechaISO = function (f) {
  if (!f) {
    var d = new Date();
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  }
  if (typeof f === 'string') return f.substring(0, 10);
  var d2 = new Date(f);
  return d2.getFullYear() + '-' +
         String(d2.getMonth() + 1).padStart(2, '0') + '-' +
         String(d2.getDate()).padStart(2, '0');
};

// Devuelve true si el dia (YYYY-MM-DD o Date) ya tiene cierre diario
KF.diaCerrado = function (fecha) {
  var dia = KF.fechaISO(fecha);
  var cierres = KF.leer('cierres', []);
  return cierres.some(function (c) {
    return c.tipo === 'diario' && c.periodo === dia;
  });
};

// Devuelve true si el mes (Date o 'YYYY-MM') ya tiene cierre mensual
KF.mesCerrado = function (fecha) {
  var d = fecha ? new Date(fecha) : new Date();
  var mes = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  var cierres = KF.leer('cierres', []);
  return cierres.some(function (c) {
    return c.tipo === 'mensual' && c.periodo === mes;
  });
};

/* =====================================================
   MODULO CIERRES
   ===================================================== */
KF.registrarModulo({
  id: 'cierres',
  nombre: 'Cierres',
  icono: '🔒',
  orden: 14.6,
  render: function (cont) {

    var MODULO = 'cierres';
    var vista = 'menu'; // menu | preview-diario | preview-mensual | detalle
    var cierreDetalle = null;

    // ---------- Utilidades ----------
    function leerCierres() { return KF.leer(MODULO, []); }
    function guardarCierres(l) { KF.escribir(MODULO, l); }

    function fechaLarga(d) {
      var meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
      return d.getDate() + ' ' + meses[d.getMonth()] + ' ' + d.getFullYear();
    }
    function fechaHoraLarga(iso) {
      var d = new Date(iso);
      return String(d.getDate()).padStart(2,'0') + '/' +
             String(d.getMonth()+1).padStart(2,'0') + '/' +
             d.getFullYear() + ' ' +
             String(d.getHours()).padStart(2,'0') + ':' +
             String(d.getMinutes()).padStart(2,'0');
    }

    // ---------- Rango del dia / mes actual ----------
    function rangoHoy() {
      var hoy = new Date(); hoy.setHours(0,0,0,0);
      return { desde: hoy.getTime(), hasta: Date.now() };
    }
    function rangoMesActual() {
      var hoy = new Date();
      var primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      return { desde: primero.getTime(), hasta: Date.now() };
    }

    // =====================================================
    // PINTADO PRINCIPAL
    // =====================================================
    function pintar() {
      if (vista === 'preview-diario')   return pintarPreview('diario');
      if (vista === 'preview-mensual')  return pintarPreview('mensual');
      if (vista === 'detalle')          return pintarDetalle();
      pintarMenu();
    }

    // ---------- MENU ----------
    function pintarMenu() {
      var hoy = KF.hoy();
      var yaCerradoHoy = KF.diaCerrado(hoy);
      var yaCerradoMes = KF.mesCerrado(new Date());
      var cierres = leerCierres();

      var html = '';
      html += '<div class="kf-titulo-modulo">🔒 Cierres</div>';
      html += '<div class="kf-subtitulo">Cierra el día y el mes para fijar tus resultados</div>';

      // Estado de hoy
      html += '<div class="kf-card" style="text-align:center;">';
      html += '<div style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#7b8a9a;">Estado del día</div>';
      html += '<div style="font-size:22px;font-weight:800;margin-top:6px;color:' + (yaCerradoHoy ? 'var(--verde)' : 'var(--dorado)') + ';">';
      html += yaCerradoHoy ? '✅ Cerrado' : '🟡 Abierto';
      html += '</div>';
      html += '<div style="font-size:13px;color:#7b8a9a;margin-top:4px;">' + fechaLarga(new Date()) + '</div>';
      html += '</div>';

      // Botones
      html += '<button class="kf-btn kf-btn-primario kf-btn-bloque" id="kf-cie-diario" type="button" style="margin-bottom:10px;"' + (yaCerradoHoy ? ' disabled style="opacity:0.5;margin-bottom:10px;"' : '') + '>🔒 Cerrar jornada de hoy</button>';
      html += '<button class="kf-btn kf-btn-dorado kf-btn-bloque" id="kf-cie-mensual" type="button" style="margin-bottom:16px;"' + (yaCerradoMes ? ' disabled style="opacity:0.5;margin-bottom:16px;"' : '') + '>📅 Cerrar mes actual</button>';

      if (yaCerradoHoy) {
        html += '<div style="font-size:12px;color:#7b8a9a;text-align:center;margin:-8px 0 14px 0;">El día de hoy ya fue cerrado. No puedes registrar más movimientos.</div>';
      }
      if (yaCerradoMes) {
        html += '<div style="font-size:12px;color:#7b8a9a;text-align:center;margin:-8px 0 14px 0;">El mes actual ya tiene un cierre mensual guardado.</div>';
      }

      // Historial
      html += '<div class="kf-card-titulo" style="margin:8px 2px 8px 2px;">Historial de cierres <span>' + cierres.length + '</span></div>';
      html += '<div id="kf-cie-historial"></div>';

      cont.innerHTML = html;

      // Enlazar botones
      var bD = document.getElementById('kf-cie-diario');
      var bM = document.getElementById('kf-cie-mensual');
      if (bD && !yaCerradoHoy) bD.addEventListener('click', function () { vista = 'preview-diario'; pintar(); });
      if (bM && !yaCerradoMes) bM.addEventListener('click', function () { vista = 'preview-mensual'; pintar(); });

      pintarHistorial(cierres);
    }

    function pintarHistorial(cierres) {
      var cont = document.getElementById('kf-cie-historial');
      if (!cont) return;

      if (!cierres.length) {
        cont.innerHTML = '<div class="kf-vacio"><span class="kf-vacio-icono">🔒</span>Aún no has hecho cierres. Empieza con el de hoy.</div>';
        return;
      }

      // Ordenar por fecha de cierre descendente
      var lista = cierres.slice().sort(function (a, b) {
        return new Date(b.fechaCierre).getTime() - new Date(a.fechaCierre).getTime();
      });

      var html = '';
      lista.forEach(function (c) {
        var esDiario = c.tipo === 'diario';
        var color = esDiario ? 'var(--azul-claro)' : 'var(--dorado)';
        var titulo = esDiario ? 'Día ' + c.periodo : 'Mes ' + c.periodo;

        html += '<div class="kf-item" style="border-left-color:' + color + ';">';
        html += '<div class="kf-item-cab">';
        html += '<div class="kf-item-nombre">' + (esDiario ? '🔒' : '📅') + ' ' + KF.esc(titulo) + '</div>';
        html += '<span class="kf-badge ' + (esDiario ? 'kf-badge-verde' : 'kf-badge-dorado') + '">' + (esDiario ? 'Diario' : 'Mensual') + '</span>';
        html += '</div>';
        html += '<div class="kf-item-datos">';
        html += '<div>Ventas: <b>' + KF.dinero(c.resumen.totalVentas) + '</b></div>';
        html += '<div>Utilidad: <b style="color:' + (c.resumen.utilidad >= 0 ? 'var(--verde)' : 'var(--rojo)') + ';">' + KF.dinero(c.resumen.utilidad) + '</b></div>';
        html += '<div style="grid-column:1/-1;color:#7b8a9a;font-size:12px;">Cerrado el ' + fechaHoraLarga(c.fechaCierre) + '</div>';
        html += '</div>';
        html += '<div class="kf-item-acciones">';
        html += '<button class="kf-btn kf-btn-primario kf-btn-chico" data-accion="detalle" data-id="' + c.id + '">Ver detalle</button>';
        html += '<button class="kf-btn kf-btn-gris kf-btn-chico" data-accion="pdf" data-id="' + c.id + '">PDF</button>';
        html += '<button class="kf-btn kf-btn-verde kf-btn-chico" data-accion="xlsx" data-id="' + c.id + '">Excel</button>';
        html += '</div></div>';
      });
      cont.innerHTML = html;

      var btns = cont.querySelectorAll('button[data-accion]');
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', function (e) {
          var acc = e.currentTarget.getAttribute('data-accion');
          var id = e.currentTarget.getAttribute('data-id');
          var c = leerCierres().find(function (x) { return x.id === id; });
          if (!c) return;
          if (acc === 'detalle') { cierreDetalle = c; vista = 'detalle'; pintar(); }
          if (acc === 'pdf')     exportarPDF(c);
          if (acc === 'xlsx')    exportarExcel(c);
        });
      }
    }

    // ---------- PREVIEW (antes de confirmar) ----------
    function pintarPreview(tipo) {
      var esDiario = tipo === 'diario';
      var r = esDiario ? rangoHoy() : rangoMesActual();
      var rep = KF.calcularReporte(r.desde, r.hasta);

      var html = '';
      html += '<div class="kf-titulo-modulo">' + (esDiario ? '🔒 Cierre del día' : '📅 Cierre del mes') + '</div>';
      html += '<div class="kf-subtitulo">' + fechaLarga(rep.desde) + ' → ' + fechaLarga(rep.hasta) + '</div>';

      html += '<div style="background:var(--azul-suave);padding:10px;border-radius:8px;font-size:13px;color:var(--azul-medio);margin-bottom:12px;">';
      html += esDiario
        ? '⚠️ Al confirmar, se bloquearán los movimientos de este día. Esta acción no se puede deshacer.'
        : 'ℹ️ El cierre mensual solo genera un resumen guardado. No bloquea movimientos.';
      html += '</div>';

      // Resumen
      html += '<div class="kf-card">';
      html += '<div class="kf-card-titulo">Resultado</div>';
      html += linea('Ventas', rep.totalVentas, 'var(--azul-medio)');
      html += linea('Costo de ventas', rep.costoVentas, 'var(--rojo)');
      html += linea('Ganancia bruta', rep.gananciaVentas, rep.gananciaVentas >= 0 ? 'var(--verde)' : 'var(--rojo)');
      html += linea('Otros ingresos', rep.totalIngresos, 'var(--verde)');
      html += linea('Gastos', rep.totalGastos, 'var(--rojo)');
      html += lineaFuerte('Utilidad neta', rep.utilidad, rep.utilidad >= 0 ? 'var(--verde)' : 'var(--rojo)');
      html += '</div>';

      // Saldos
      html += '<div class="kf-card">';
      html += '<div class="kf-card-titulo">Saldos</div>';
      html += linea('Saldo de caja al cierre', rep.saldoCaja, rep.saldoCaja >= 0 ? 'var(--verde)' : 'var(--rojo)');
      html += linea('Nuevas cuentas por cobrar', rep.totalCxCNuevas, 'var(--azul-medio)');
      html += linea('Nuevas cuentas por pagar', rep.totalCxPNuevas, 'var(--rojo)');
      html += '</div>';

      // Operaciones
      html += '<div class="kf-grid-resumen">';
      html += '<div class="kf-mini-card"><div class="lbl">Ventas</div><div class="val">' + rep.nVentas + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Compras</div><div class="val">' + rep.nCompras + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Gastos</div><div class="val">' + rep.nGastos + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Ingresos</div><div class="val">' + rep.nIngresos + '</div></div>';
      html += '</div>';

      // Top 3
      if (rep.top.length) {
        html += '<div class="kf-card">';
        html += '<div class="kf-card-titulo">Top 3 productos</div>';
        rep.top.slice(0, 3).forEach(function (p, i) {
          html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gris-borde);font-size:14px;">';
          html += '<span>#' + (i+1) + ' ' + KF.esc(p.nombre) + ' <small style="color:#7b8a9a;">x' + p.cantidad + '</small></span>';
          html += '<b style="color:var(--verde);">' + KF.dinero(p.ganancia) + '</b>';
          html += '</div>';
        });
        html += '</div>';
      }

      // Botones de exportacion (solo desde el preview se puede exportar el resumen actual)
      html += '<div class="kf-card-titulo" style="margin:8px 2px 8px 2px;">Exportar resumen</div>';
      html += '<div class="kf-fila" style="margin-bottom:14px;">';
      html += '<button class="kf-btn kf-btn-primario" id="kf-cie-pdf" type="button">🖨️ PDF</button>';
      html += '<button class="kf-btn kf-btn-verde" id="kf-cie-xlsx" type="button">📊 Excel</button>';
      html += '</div>';

      // Botones de accion final
      html += '<div class="kf-fila" style="margin-top:8px;">';
      html += '<button class="kf-btn kf-btn-gris" id="kf-cie-cancelar" type="button">Cancelar</button>';
      html += '<button class="kf-btn ' + (esDiario ? 'kf-btn-rojo' : 'kf-btn-dorado') + '" id="kf-cie-confirmar" type="button">' + (esDiario ? '🔒 Confirmar y bloquear' : '💾 Guardar cierre del mes') + '</button>';
      html += '</div>';

      cont.innerHTML = html;

      // Enlaces
      document.getElementById('kf-cie-cancelar').addEventListener('click', function () {
        vista = 'menu'; pintar();
      });
      document.getElementById('kf-cie-confirmar').addEventListener('click', function () {
        confirmarCierre(tipo, rep);
      });
      document.getElementById('kf-cie-pdf').addEventListener('click', function () {
        exportarPDFTemporal(tipo, rep);
      });
      document.getElementById('kf-cie-xlsx').addEventListener('click', function () {
        exportarExcelTemporal(tipo, rep);
      });
    }

    // ---------- DETALLE de un cierre guardado ----------
    function pintarDetalle() {
      var c = cierreDetalle;
      if (!c) { vista = 'menu'; pintar(); return; }
      var r = c.resumen;

      var html = '';
      html += '<div class="kf-titulo-modulo">' + (c.tipo === 'diario' ? '🔒' : '📅') + ' Cierre ' + (c.tipo === 'diario' ? 'diario' : 'mensual') + '</div>';
      html += '<div class="kf-subtitulo">Período: ' + KF.esc(c.periodo) + ' · Cerrado el ' + fechaHoraLarga(c.fechaCierre) + '</div>';

      html += '<div class="kf-card">';
      html += '<div class="kf-card-titulo">Resultado</div>';
      html += linea('Ventas', r.totalVentas, 'var(--azul-medio)');
      html += linea('Costo de ventas', r.costoVentas, 'var(--rojo)');
      html += linea('Ganancia bruta', r.gananciaVentas, r.gananciaVentas >= 0 ? 'var(--verde)' : 'var(--rojo)');
      html += linea('Otros ingresos', r.totalIngresos, 'var(--verde)');
      html += linea('Gastos', r.totalGastos, 'var(--rojo)');
      html += lineaFuerte('Utilidad neta', r.utilidad, r.utilidad >= 0 ? 'var(--verde)' : 'var(--rojo)');
      html += '</div>';

      html += '<div class="kf-card">';
      html += '<div class="kf-card-titulo">Saldos</div>';
      html += linea('Saldo de caja al cierre', r.saldoCaja, r.saldoCaja >= 0 ? 'var(--verde)' : 'var(--rojo)');
      html += linea('Nuevas cuentas por cobrar', r.totalCxCNuevas, 'var(--azul-medio)');
      html += linea('Nuevas cuentas por pagar', r.totalCxPNuevas, 'var(--rojo)');
      html += '</div>';

      html += '<div class="kf-grid-resumen">';
      html += '<div class="kf-mini-card"><div class="lbl">Ventas</div><div class="val">' + r.nVentas + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Compras</div><div class="val">' + r.nCompras + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Gastos</div><div class="val">' + r.nGastos + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Ingresos</div><div class="val">' + r.nIngresos + '</div></div>';
      html += '</div>';

      html += '<div class="kf-fila" style="margin-top:8px;">';
      html += '<button class="kf-btn kf-btn-primario" id="kf-cie-det-pdf" type="button">🖨️ PDF</button>';
      html += '<button class="kf-btn kf-btn-verde" id="kf-cie-det-xlsx" type="button">📊 Excel</button>';
      html += '</div>';

      html += '<button class="kf-btn kf-btn-gris kf-btn-bloque" id="kf-cie-det-volver" type="button" style="margin-top:14px;">← Volver al historial</button>';

      cont.innerHTML = html;

      document.getElementById('kf-cie-det-pdf').addEventListener('click', function () { exportarPDF(c); });
      document.getElementById('kf-cie-det-xlsx').addEventListener('click', function () { exportarExcel(c); });
      document.getElementById('kf-cie-det-volver').addEventListener('click', function () {
        cierreDetalle = null; vista = 'menu'; pintar();
      });
    }

    function linea(etiqueta, valor, color) {
      return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gris-borde);font-size:14px;">' +
             '<span>' + etiqueta + '</span><b style="color:' + color + ';">' + KF.dinero(valor) + '</b></div>';
    }
    function lineaFuerte(etiqueta, valor, color) {
      return '<div style="display:flex;justify-content:space-between;padding:10px 0;font-size:15px;font-weight:800;color:' + color + ';">' +
             '<span>' + etiqueta + '</span><span>' + KF.dinero(valor) + '</span></div>';
    }

    // =====================================================
    // CONFIRMAR Y GUARDAR EL CIERRE
    // =====================================================
    function confirmarCierre(tipo, rep) {
      var esDiario = tipo === 'diario';
      var periodo = esDiario ? KF.hoy() : (new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'));

      var msg = esDiario
        ? '¿Cerrar el día ' + periodo + '? Después de confirmar NO podrás registrar ventas, compras, gastos, ingresos ni ajustes de este día.'
        : '¿Guardar el cierre del mes ' + periodo + '? Podrás seguir registrando movimientos (el cierre mensual no bloquea).';

      KF.confirmar(msg, function () {
        // Construir el resumen compacto (sin detalles largos)
        var resumen = {
          totalVentas: rep.totalVentas,
          costoVentas: rep.costoVentas,
          gananciaVentas: rep.gananciaVentas,
          totalCompras: rep.totalCompras,
          totalGastos: rep.totalGastos,
          totalIngresos: rep.totalIngresos,
          utilidad: rep.utilidad,
          nVentas: rep.nVentas,
          nCompras: rep.nCompras,
          nGastos: rep.nGastos,
          nIngresos: rep.nIngresos,
          totalCxCNuevas: rep.totalCxCNuevas,
          totalCxPNuevas: rep.totalCxPNuevas,
          nCxC: rep.nCxC,
          nCxP: rep.nCxP,
          saldoCaja: rep.saldoCaja,
          top3: (rep.top || []).slice(0, 3)
        };

        var cierre = {
          id: KF.id(),
          tipo: tipo,
          periodo: periodo,
          fechaCierre: KF.ahora(),
          resumen: resumen
        };

        var lista = leerCierres();
        lista.push(cierre);
        guardarCierres(lista);

        KF.aviso(esDiario ? 'Día cerrado correctamente' : 'Cierre mensual guardado', 'ok');
        vista = 'menu';
        pintar();
      });
    }

    // =====================================================
    // EXPORTAR PDF / EXCEL
    // =====================================================

    // PDF de un cierre ya guardado
    function exportarPDF(c) {
      var r = c.resumen;
      var titulo = (c.tipo === 'diario' ? 'Cierre diario ' : 'Cierre mensual ') + c.periodo;
      generarPDF(titulo, r, c.fechaCierre);
    }

    // PDF del preview (aun sin guardar)
    function exportarPDFTemporal(tipo, rep) {
      var periodo = tipo === 'diario' ? KF.hoy() : (new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'));
      var titulo = (tipo === 'diario' ? 'Cierre diario ' : 'Cierre mensual ') + periodo;
      generarPDF(titulo, rep, KF.ahora());
    }

    function generarPDF(titulo, r, fechaCierre) {
      if (window.jspdf && window.jspdf.jsPDF) {
        try {
          var doc = new window.jspdf.jsPDF();
          var W = 210;
          var y = 20;

          doc.setFontSize(18); doc.setTextColor(22, 50, 79);
          doc.text('KontaFin - ' + titulo, 14, y); y += 8;

          doc.setFontSize(11); doc.setTextColor(100);
          var neg = KF.negocioActivo ? KF.negocioActivo.nombre : 'Negocio';
          doc.text(neg + ' · Generado el ' + fechaHoraLarga(fechaCierre), 14, y); y += 12;

          doc.setDrawColor(242, 169, 0); doc.setLineWidth(1);
          doc.line(14, y - 6, 196, y - 6);
          y += 6;

          // Resultado
          doc.setFontSize(13); doc.setTextColor(22, 50, 79);
          doc.text('Resultado', 14, y); y += 8;
          doc.setFontSize(11); doc.setTextColor(0);
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
          y += 4;

          // Saldos
          doc.setFontSize(13); doc.setTextColor(22, 50, 79);
          doc.text('Saldos', 14, y); y += 8;
          doc.setFontSize(11); doc.setTextColor(0);
          var saldos = [
            ['Saldo de caja al cierre', KF.dinero(r.saldoCaja)],
            ['Nuevas cuentas por cobrar', KF.dinero(r.totalCxCNuevas)],
            ['Nuevas cuentas por pagar', KF.dinero(r.totalCxPNuevas)]
          ];
          saldos.forEach(function (f) {
            doc.text(f[0], 14, y);
            doc.text(f[1], 196, y, { align: 'right' });
            y += 7;
          });
          y += 4;

          // Operaciones
          doc.setFontSize(13); doc.setTextColor(22, 50, 79);
          doc.text('Operaciones', 14, y); y += 8;
          doc.setFontSize(11); doc.setTextColor(0);
          var ops = [
            ['Ventas registradas', r.nVentas],
            ['Compras registradas', r.nCompras],
            ['Gastos registrados', r.nGastos],
            ['Ingresos registrados', r.nIngresos]
          ];
          ops.forEach(function (f) {
            doc.text(f[0], 14, y);
            doc.text(String(f[1]), 196, y, { align: 'right' });
            y += 7;
          });
          y += 4;

          // Top 3
          if (r.top3 && r.top3.length) {
            doc.setFontSize(13); doc.setTextColor(22, 50, 79);
            doc.text('Top 3 productos', 14, y); y += 8;
            doc.setFontSize(11); doc.setTextColor(0);
            r.top3.forEach(function (p, i) {
              var nom = p.nombre || '';
              if (nom.length > 40) nom = nom.substring(0, 38) + '..';
              doc.text((i+1) + '. ' + nom + '  x' + p.cantidad, 14, y);
              doc.text(KF.dinero(p.ganancia), 196, y, { align: 'right' });
              y += 7;
            });
          }

          doc.setFontSize(9); doc.setTextColor(150);
          doc.text('Generado por KontaFin · OSTICOR', 105, 290, { align: 'center' });

          doc.save('KontaFin-' + titulo.toLowerCase().replace(/ /g,'-') + '.pdf');
          KF.aviso('PDF generado', 'ok');
          return;
        } catch (e) { /* cae al fallback */ }
      }

      // Fallback: dialogo de impresion
      var html = generarHTMLCierre(titulo, r, fechaCierre);
      imprimir(html);
      KF.aviso('Elige "Guardar como PDF" en el diálogo', 'info');
    }

    function generarHTMLCierre(titulo, r, fechaCierre) {
      var neg = KF.negocioActivo ? KF.negocioActivo.nombre : 'Negocio';
      var h = '';
      h += '<h1>KontaFin - ' + titulo + '</h1>';
      h += '<div style="color:#777;font-size:12px;margin-bottom:16px;">' + KF.esc(neg) + ' · Generado el ' + fechaHoraLarga(fechaCierre) + '</div>';

      h += '<h2>Resultado</h2><table>';
      h += '<tr><td>Ventas</td><td class="num">' + KF.dinero(r.totalVentas) + '</td></tr>';
      h += '<tr><td>Costo de ventas</td><td class="num">' + KF.dinero(r.costoVentas) + '</td></tr>';
      h += '<tr><td>Ganancia bruta</td><td class="num">' + KF.dinero(r.gananciaVentas) + '</td></tr>';
      h += '<tr><td>Otros ingresos</td><td class="num">' + KF.dinero(r.totalIngresos) + '</td></tr>';
      h += '<tr><td>Gastos</td><td class="num">' + KF.dinero(r.totalGastos) + '</td></tr>';
      h += '<tr class="fuerte"><td>Utilidad neta</td><td class="num">' + KF.dinero(r.utilidad) + '</td></tr>';
      h += '</table>';

      h += '<h2>Saldos</h2><table>';
      h += '<tr><td>Saldo de caja al cierre</td><td class="num">' + KF.dinero(r.saldoCaja) + '</td></tr>';
      h += '<tr><td>Nuevas cuentas por cobrar</td><td class="num">' + KF.dinero(r.totalCxCNuevas) + '</td></tr>';
      h += '<tr><td>Nuevas cuentas por pagar</td><td class="num">' + KF.dinero(r.totalCxPNuevas) + '</td></tr>';
      h += '</table>';

      h += '<h2>Operaciones</h2><table>';
      h += '<tr><td>Ventas</td><td class="num">' + r.nVentas + '</td></tr>';
      h += '<tr><td>Compras</td><td class="num">' + r.nCompras + '</td></tr>';
      h += '<tr><td>Gastos</td><td class="num">' + r.nGastos + '</td></tr>';
      h += '<tr><td>Ingresos</td><td class="num">' + r.nIngresos + '</td></tr>';
      h += '</table>';

      if (r.top3 && r.top3.length) {
        h += '<h2>Top 3 productos</h2><table>';
        r.top3.forEach(function (p, i) {
          h += '<tr><td>' + (i+1) + '. ' + KF.esc(p.nombre) + '</td><td class="num">' + KF.dinero(p.ganancia) + '</td></tr>';
        });
        h += '</table>';
      }

      return h;
    }

    function imprimir(html) {
      var iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
      document.body.appendChild(iframe);
      var doc = iframe.contentWindow.document;
      doc.open();
      doc.write('<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
        'body{font-family:Arial;padding:20px;color:#222;}h1{color:#16324f;border-bottom:3px solid #f2a900;padding-bottom:6px;}h2{color:#16324f;font-size:16px;margin-top:20px;}' +
        'table{width:100%;border-collapse:collapse;margin-top:10px;}td{padding:6px 8px;border-bottom:1px solid #ddd;font-size:13px;}.num{text-align:right;}.fuerte{font-weight:bold;border-top:2px solid #16324f;}' +
        '</style></head><body>' + html + '</body></html>');
      doc.close();
      setTimeout(function () {
        try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) {}
        setTimeout(function () { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); }, 1500);
      }, 400);
    }

    // --- Excel ---
    function exportarExcel(c) {
      var r = c.resumen;
      var titulo = (c.tipo === 'diario' ? 'Cierre diario ' : 'Cierre mensual ') + c.periodo;
      generarExcel(titulo, r, c.fechaCierre);
    }
    function exportarExcelTemporal(tipo, rep) {
      var periodo = tipo === 'diario' ? KF.hoy() : (new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'));
      var titulo = (tipo === 'diario' ? 'Cierre diario ' : 'Cierre mensual ') + periodo;
      generarExcel(titulo, rep, KF.ahora());
    }
    function generarExcel(titulo, r, fechaCierre) {
      if (!window.XLSX) {
        KF.aviso('Librería Excel no disponible', 'error');
        return;
      }
      try {
        var wb = window.XLSX.utils.book_new();

        var filas = [
          ['KontaFin - ' + titulo],
          ['Negocio', KF.negocioActivo ? KF.negocioActivo.nombre : ''],
          ['Generado el', fechaHoraLarga(fechaCierre)],
          [],
          ['RESULTADO', ''],
          ['Ventas', r.totalVentas],
          ['Costo de ventas', r.costoVentas],
          ['Ganancia bruta', r.gananciaVentas],
          ['Otros ingresos', r.totalIngresos],
          ['Gastos', r.totalGastos],
          ['Utilidad neta', r.utilidad],
          [],
          ['SALDOS', ''],
          ['Saldo de caja al cierre', r.saldoCaja],
          ['Nuevas cuentas por cobrar', r.totalCxCNuevas],
          ['Nuevas cuentas por pagar', r.totalCxPNuevas],
          [],
          ['OPERACIONES', ''],
          ['Ventas registradas', r.nVentas],
          ['Compras registradas', r.nCompras],
          ['Gastos registrados', r.nGastos],
          ['Ingresos registrados', r.nIngresos]
        ];
        if (r.top3 && r.top3.length) {
          filas.push([]);
          filas.push(['TOP 3 PRODUCTOS', 'Ganancia']);
          r.top3.forEach(function (p) {
            filas.push([p.nombre, p.ganancia]);
          });
        }
        var ws = window.XLSX.utils.aoa_to_sheet(filas);
        ws['!cols'] = [{ wch: 32 }, { wch: 18 }];
        window.XLSX.utils.book_append_sheet(wb, ws, 'Cierre');

        window.XLSX.writeFile(wb, 'KontaFin-' + titulo.toLowerCase().replace(/ /g,'-') + '.xlsx');
        KF.aviso('Excel generado', 'ok');
      } catch (e) {
        KF.aviso('Error Excel: ' + e.message, 'error');
      }
    }

    // ---------- Arrancar ----------
    pintar();
  }
});