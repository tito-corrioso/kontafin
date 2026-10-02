/* =====================================================
   Modulo: Ventas
   - Registra una venta (un producto por operacion)
   - Descuenta stock del inventario
   - Guarda el costo historico del momento (para ganancia real)
   - Si es efectivo: ingresa a caja
   - Si es fiado: crea cuenta por cobrar pendiente
   ===================================================== */

KF.registrarModulo({
  id: 'ventas',
  nombre: 'Ventas',
  icono: '🛒',
  orden: 1,
  render: function (cont) {

    var MODULO = 'ventas';
    var filtroFecha = 'hoy'; // hoy | semana | mes | todo

    // ---------- Lectura / escritura ----------
    function leerVentas() { return KF.leer(MODULO, []); }
    function guardarVentas(l) { KF.escribir(MODULO, l); }

    // ---------- Utilidades de fecha ----------
    function rangoSegunFiltro() {
      var hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      var desde = new Date(hoy);
      if (filtroFecha === 'semana') desde.setDate(hoy.getDate() - 6);
      if (filtroFecha === 'mes')    desde.setDate(1);
      if (filtroFecha === 'todo')   desde = new Date(0);
      return desde.getTime();
    }

    function dentroDelFiltro(fechaISO) {
      var t = new Date(fechaISO).getTime();
      return t >= rangoSegunFiltro();
    }

    // ---------- Pintar interfaz ----------
    function pintar() {
      var ventas = leerVentas().filter(function (v) { return dentroDelFiltro(v.fecha); });

      var totalVentas = 0, totalGanancia = 0, totalFiado = 0;
      ventas.forEach(function (v) {
        totalVentas += KF.num(v.total);
        totalGanancia += KF.num(v.ganancia);
        if (v.formaPago === 'fiado') totalFiado += KF.num(v.total);
      });

      var html = '';
      html += '<div class="kf-titulo-modulo">🛒 Ventas</div>';
      html += '<div class="kf-subtitulo">Registra cada venta y controla tu ganancia real</div>';

      // Filtros
      html += '<div class="kf-fila" style="margin-bottom:12px;">';
      html += '<select id="kf-ventas-filtro" class="kf-buscador" style="padding-left:12px;background-image:none;">';
      html += '<option value="hoy"' + (filtroFecha === 'hoy' ? ' selected' : '') + '>Hoy</option>';
      html += '<option value="semana"' + (filtroFecha === 'semana' ? ' selected' : '') + '>Últimos 7 días</option>';
      html += '<option value="mes"' + (filtroFecha === 'mes' ? ' selected' : '') + '>Este mes</option>';
      html += '<option value="todo"' + (filtroFecha === 'todo' ? ' selected' : '') + '>Todo</option>';
      html += '</select>';
      html += '</div>';

      // Resumen
      html += '<div class="kf-grid-resumen">';
      html += '<div class="kf-mini-card acento"><div class="lbl">Ventas</div><div class="val">' + KF.dinero(totalVentas) + '</div></div>';
      html += '<div class="kf-mini-card ' + (totalGanancia >= 0 ? 'positivo' : 'negativo') + '"><div class="lbl">Ganancia</div><div class="val">' + KF.dinero(totalGanancia) + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Operaciones</div><div class="val">' + ventas.length + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Fiado</div><div class="val">' + KF.dinero(totalFiado) + '</div></div>';
      html += '</div>';

      // Boton nueva venta
      html += '<button class="kf-btn kf-btn-dorado kf-btn-bloque" id="kf-ventas-add" type="button" style="margin-bottom:12px;">+ Registrar venta</button>';

      // Lista
      html += '<div id="kf-ventas-lista"></div>';

      cont.innerHTML = html;

      // Enlazar eventos
      document.getElementById('kf-ventas-add').addEventListener('click', function () { abrirFormulario(); });
      document.getElementById('kf-ventas-filtro').addEventListener('change', function (e) {
        filtroFecha = e.target.value;
        pintar();
      });

      pintarLista(ventas);
    }

    // ---------- Lista de ventas ----------
    function pintarLista(ventas) {
      var cont = document.getElementById('kf-ventas-lista');
      if (!cont) return;

      if (!ventas.length) {
        cont.innerHTML = '<div class="kf-vacio"><span class="kf-vacio-icono">🛒</span>No hay ventas en este período.</div>';
        return;
      }

      // Ordenar de mas reciente a mas antigua
      ventas = ventas.slice().sort(function (a, b) {
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      });

      var html = '';
      ventas.forEach(function (v) {
        var esFiado = v.formaPago === 'fiado';
        html += '<div class="kf-item' + (esFiado ? ' stock-bajo' : '') + '">';
        html += '<div class="kf-item-cab">';
        html += '<div class="kf-item-nombre">' + KF.esc(v.productoNombre) + '</div>';
        html += esFiado
          ? '<span class="kf-badge kf-badge-rojo">Fiado</span>'
          : '<span class="kf-badge kf-badge-verde">Efectivo</span>';
        html += '</div>';

        html += '<div class="kf-item-datos">';
        html += '<div>Cantidad: <b>' + KF.num(v.cantidad) + ' ' + KF.esc(v.unidad || 'u') + '</b></div>';
        html += '<div>Precio: <b>' + KF.dinero(v.precioUnitario) + '</b></div>';
        html += '<div>Total: <b>' + KF.dinero(v.total) + '</b></div>';
        html += '<div>Ganancia: <b style="color:var(--verde);">' + KF.dinero(v.ganancia) + '</b></div>';
        if (v.cliente) html += '<div style="grid-column:1/-1;">Cliente: <b>' + KF.esc(v.cliente) + '</b></div>';
        html += '<div style="grid-column:1/-1;color:#7b8a9a;font-size:12px;">' + formatearFecha(v.fecha) + '</div>';
        html += '</div>';

        html += '<div class="kf-item-acciones">';
        html += '<button class="kf-btn kf-btn-rojo kf-btn-chico" data-accion="eliminar" data-id="' + v.id + '">Anular</button>';
        html += '</div>';
        html += '</div>';
      });
      cont.innerHTML = html;

      var botones = cont.querySelectorAll('button[data-accion="eliminar"]');
      for (var i = 0; i < botones.length; i++) {
        botones[i].addEventListener('click', function (e) {
          anularVenta(e.currentTarget.getAttribute('data-id'));
        });
      }
    }

    function formatearFecha(iso) {
      var d = new Date(iso);
      var dd = String(d.getDate()).padStart(2, '0');
      var mm = String(d.getMonth() + 1).padStart(2, '0');
      var hh = String(d.getHours()).padStart(2, '0');
      var mi = String(d.getMinutes()).padStart(2, '0');
      return dd + '/' + mm + ' ' + hh + ':' + mi;
    }

    // ---------- Formulario de venta ----------
    function abrirFormulario() {
      var productos = KF.leer('inventario', []);
      if (!productos.length) {
        KF.aviso('Primero añade productos en Inventario', 'error');
        return;
      }

      var opciones = '<option value="">-- Selecciona un producto --</option>';
      productos.slice().sort(function (a, b) {
        return (a.nombre || '').localeCompare(b.nombre || '');
      }).forEach(function (p) {
        opciones += '<option value="' + p.id + '">' + KF.esc(p.nombre) + ' (stock: ' + KF.num(p.stock) + ')</option>';
      });

      var contenido = '';
      contenido += '<div class="kf-campo"><label>Producto</label><select id="v-producto">' + opciones + '</select></div>';
      contenido += '<div class="kf-campo"><label>Cantidad</label><input type="number" step="0.01" inputmode="decimal" id="v-cantidad" value="1"></div>';
      contenido += '<div class="kf-campo"><label>Precio de venta unitario</label><input type="number" step="0.01" inputmode="decimal" id="v-precio" value="0.00"></div>';
      contenido += '<div class="kf-campo"><label>Forma de pago</label>';
      contenido += '<select id="v-forma"><option value="efectivo">Efectivo</option><option value="fiado">Fiado (cuenta por cobrar)</option></select></div>';
      contenido += '<div class="kf-campo" id="v-cliente-wrap" style="display:none;"><label>Cliente</label><input type="text" id="v-cliente" placeholder="Nombre del cliente"></div>';
      contenido += '<div class="kf-campo" id="v-tel-wrap" style="display:none;"><label>Teléfono (opcional)</label><input type="tel" id="v-telefono" placeholder="Teléfono"></div>';
      contenido += '<div class="kf-campo"><label>Notas (opcional)</label><input type="text" id="v-notas" placeholder="Detalles"></div>';
      contenido += '<div id="v-info" style="background:var(--azul-suave);padding:10px;border-radius:8px;font-size:13px;color:var(--azul-medio);"></div>';

      KF.abrirModal({
        titulo: 'Registrar venta',
        contenido: contenido,
        textoGuardar: 'Registrar',
        alGuardar: guardarVenta
      });

      // Enlazar cambios
      var selProducto = document.getElementById('v-producto');
      var inpCantidad = document.getElementById('v-cantidad');
      var inpPrecio = document.getElementById('v-precio');
      var selForma = document.getElementById('v-forma');

      function actualizarInfo() {
        var p = productos.find(function (x) { return x.id === selProducto.value; });
        if (!p) { document.getElementById('v-info').textContent = 'Selecciona un producto.'; return; }
        var cant = KF.num(inpCantidad.value);
        var prec = KF.num(inpPrecio.value);
        var costoT = KF.num(p.costo) * cant;
        var totalT = prec * cant;
        var ganancia = totalT - costoT;
        document.getElementById('v-info').innerHTML =
          'Costo total: <b>' + KF.dinero(costoT) + '</b><br>' +
          'Total a cobrar: <b>' + KF.dinero(totalT) + '</b><br>' +
          'Ganancia estimada: <b style="color:' + (ganancia >= 0 ? 'var(--verde)' : 'var(--rojo)') + ';">' + KF.dinero(ganancia) + '</b>';
      }

      selProducto.addEventListener('change', function () {
        var p = productos.find(function (x) { return x.id === selProducto.value; });
        if (p) inpPrecio.value = KF.num(p.precio);
        actualizarInfo();
      });

      inpCantidad.addEventListener('input', actualizarInfo);
      inpPrecio.addEventListener('input', actualizarInfo);

      selForma.addEventListener('change', function () {
        var esFiado = selForma.value === 'fiado';
        document.getElementById('v-cliente-wrap').style.display = esFiado ? 'block' : 'none';
        document.getElementById('v-tel-wrap').style.display = esFiado ? 'block' : 'none';
      });

      // Auto-completar precio si hay un solo producto
      setTimeout(function () { actualizarInfo(); }, 50);
    }

    // ---------- Guardar venta ----------
        function guardarVenta() {
      if (KF.diaCerrado(KF.hoy())) {
        KF.aviso('El día ya está cerrado. No se pueden registrar ventas.', 'error');
        return;
      }
      var idProd = document.getElementById('v-producto').value;
      if (!idProd) { KF.aviso('Selecciona un producto', 'error'); return; }

      var productos = KF.leer('inventario', []);
      var idx = productos.findIndex(function (x) { return x.id === idProd; });
      if (idx < 0) { KF.aviso('Producto no encontrado', 'error'); return; }
      var p = productos[idx];

      var cantidad = KF.num(document.getElementById('v-cantidad').value);
      var precio = KF.num(document.getElementById('v-precio').value);
      var forma = document.getElementById('v-forma').value;
      var cliente = document.getElementById('v-cliente').value.trim();
      var telefono = document.getElementById('v-telefono') ? document.getElementById('v-telefono').value.trim() : '';
      var notas = document.getElementById('v-notas').value.trim();

      if (cantidad <= 0) { KF.aviso('Cantidad inválida', 'error'); return; }
      if (precio < 0)    { KF.aviso('Precio inválido', 'error'); return; }
      if (KF.num(p.stock) < cantidad) { KF.aviso('Stock insuficiente. Disponible: ' + KF.num(p.stock), 'error'); return; }
      if (forma === 'fiado' && !cliente) { KF.aviso('Escribe el nombre del cliente', 'error'); return; }

      // Costo historico del momento
      var costoUnitario = KF.num(p.costo);
      var total = precio * cantidad;
      var costoTotal = costoUnitario * cantidad;
      var ganancia = total - costoTotal;

      // 1) Crear la venta
      var venta = {
        id: KF.id(),
        fecha: KF.ahora(),
        productoId: p.id,
        productoNombre: p.nombre,
        unidad: p.unidad || 'u',
        cantidad: cantidad,
        precioUnitario: precio,
        costoUnitarioHistorico: costoUnitario,
        total: total,
        costoTotal: costoTotal,
        ganancia: ganancia,
        formaPago: forma,
        cliente: cliente,
        telefono: telefono,
        notas: notas
      };
      var ventas = leerVentas();
      ventas.push(venta);
      guardarVentas(ventas);

      // 2) Descontar stock
      productos[idx].stock = KF.num(p.stock) - cantidad;
      productos[idx].actualizado = KF.ahora();
      KF.escribir('inventario', productos);

      // 3) Efecto en caja o cuenta por cobrar
      if (forma === 'efectivo') {
        var efectivo = KF.leer('efectivo', []);
        efectivo.push({
          id: KF.id(),
          fecha: KF.ahora(),
          tipo: 'ingreso',
          monto: total,
          concepto: 'Venta: ' + p.nombre + ' x' + cantidad,
          referencia: 'ventas',
          refId: venta.id
        });
        KF.escribir('efectivo', efectivo);
      } else {
        var cxc = KF.leer('cuentas-cobrar', []);
        cxc.push({
          id: KF.id(),
          fecha: KF.ahora(),
          cliente: cliente,
          telefono: telefono,
          monto: total,
          concepto: 'Venta fiada: ' + p.nombre + ' x' + cantidad,
          estado: 'pendiente',
          refVenta: venta.id,
          pagos: []
        });
        KF.escribir('cuentas-cobrar', cxc);
      }

      KF.cerrarModal();
      KF.aviso('Venta registrada', 'ok');
      pintar();
    }

    // ---------- Anular venta ----------
    function anularVenta(id) {
      var ventas = leerVentas();
      var v = ventas.find(function (x) { return x.id === id; });
      if (!v) return;

      KF.confirmar('¿Anular esta venta de "' + v.productoNombre + '"? Se devolverá el stock y se revertirá el efecto en caja o cuenta por cobrar.', function () {
        // Devolver stock
        var productos = KF.leer('inventario', []);
        var idx = productos.findIndex(function (x) { return x.id === v.productoId; });
        if (idx >= 0) {
          productos[idx].stock = KF.num(productos[idx].stock) + KF.num(v.cantidad);
          KF.escribir('inventario', productos);
        }

        // Revertir efectivo
        if (v.formaPago === 'efectivo') {
          var efectivo = KF.leer('efectivo', []).filter(function (m) {
            return !(m.referencia === 'ventas' && m.refId === v.id);
          });
          KF.escribir('efectivo', efectivo);
        }

        // Revertir cuenta por cobrar
        if (v.formaPago === 'fiado') {
          var cxc = KF.leer('cuentas-cobrar', []).filter(function (c) {
            return c.refVenta !== v.id;
          });
          KF.escribir('cuentas-cobrar', cxc);
        }

        // Eliminar venta
        var nuevas = ventas.filter(function (x) { return x.id !== id; });
        guardarVentas(nuevas);

        KF.aviso('Venta anulada', 'ok');
        pintar();
      });
    }

    // ---------- Arrancar ----------
    pintar();
  }
});
