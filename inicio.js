/* =====================================================
   Modulo: Inicio (Panel General)
   Muestra resumen rapido y accesos a los modulos.
   Se registra como modulo con id 'inicio'.
   ===================================================== */

KF.registrarModulo({
  id: 'inicio',
  nombre: 'Inicio',
  icono: '🏠',
  orden: 0,
  render: function (cont) {

    var nombre = KF.negocioActivo ? KF.negocioActivo.nombre : 'Mi Negocio';

    // ---- Leer datos de otros modulos (si existen) ----
    var productos = KF.leer('inventario', []);
    var totalProductos = productos.length;

    var valorCosto = 0;
    var valorVenta = 0;
    var stockBajo = 0;
    productos.forEach(function (p) {
      var c = KF.num(p.costo);
      var pr = KF.num(p.precio);
      var st = KF.num(p.stock);
      valorCosto += c * st;
      valorVenta += pr * st;
      if (st <= KF.num(p.stockMinimo)) stockBajo++;
    });

    var gananciaPotencial = valorVenta - valorCosto;

    // ---- HTML del panel ----
    var html = '';
    html += '<div class="kf-titulo-modulo">🏠 Panel General</div>';
    html += '<div class="kf-subtitulo">Resumen de ' + KF.esc(nombre) + '</div>';

    // Resumen
    html += '<div class="kf-grid-resumen">';
    html += '<div class="kf-mini-card acento"><div class="lbl">Productos</div><div class="val">' + totalProductos + '</div></div>';
    html += '<div class="kf-mini-card ' + (stockBajo > 0 ? 'negativo' : 'positivo') + '"><div class="lbl">Stock bajo</div><div class="val">' + stockBajo + '</div></div>';
    html += '<div class="kf-mini-card"><div class="lbl">Valor a costo</div><div class="val">' + KF.dinero(valorCosto) + '</div></div>';
    html += '<div class="kf-mini-card"><div class="lbl">Valor a venta</div><div class="val">' + KF.dinero(valorVenta) + '</div></div>';
    html += '</div>';

    // Ganancia potencial
    html += '<div class="kf-card">';
    html += '<div class="kf-card-titulo">Ganancia potencial en inventario</div>';
    html += '<div style="font-size:22px;font-weight:800;color:' + (gananciaPotencial >= 0 ? 'var(--verde)' : 'var(--rojo)') + ';">' + KF.dinero(gananciaPotencial) + '</div>';
    html += '<div style="font-size:12px;color:#7b8a9a;margin-top:4px;">Si vendes todo el stock actual al precio marcado.</div>';
    html += '</div>';

    // Accesos rapidos
    html += '<div class="kf-card-titulo" style="margin:8px 2px 8px 2px;">Accesos rápidos</div>';
    html += '<div class="kf-accesos" id="kf-accesos"></div>';

    // Nota final
    html += '<div style="text-align:center;color:#9aa7b4;font-size:12px;margin-top:20px;">KontaFin v' + KF.version + ' · OSTICOR</div>';

    cont.innerHTML = html;

    // Rellenar accesos con los modulos registrados (menos inicio)
    var accesos = document.getElementById('kf-accesos');
    var modulos = KF.modulos.filter(function (m) { return m.id !== 'inicio'; })
                            .sort(function (a, b) { return (a.orden || 99) - (b.orden || 99); });
    modulos.forEach(function (m) {
      var div = document.createElement('div');
      div.className = 'kf-acceso';
      div.innerHTML = '<span class="kf-acceso-icono">' + (m.icono || '•') + '</span>' +
                      '<span class="kf-acceso-nombre">' + KF.esc(m.nombre) + '</span>';
      div.addEventListener('click', function () { KF.irA(m.id); });
      accesos.appendChild(div);
    });

    // Si no hay mas modulos, mostrar mensaje
    if (!modulos.length) {
      accesos.innerHTML = '<div class="kf-vacio" style="grid-column:1/-1;">Aún no hay módulos disponibles.</div>';
    }
  }
});