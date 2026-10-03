/* =====================================================
   Modulo: Ventas - Version 3 (pedidos multi-producto)
   - Un pedido puede tener N productos
   - Cada linea confirmada se colapsa y muestra resumen
   - El pago es por pedido (efectivo o fiado)
   - Si es fiado: UNA SOLA cuenta por cobrar con el total
   - Se descuenta stock al pulsar Registrar
   - Cada producto se guarda como venta individual,
     pero todas comparten un pedidoId
   - BLOQUEA si el dia ya esta cerrado
   - SINCRONIZACION: Exportar/Importar + fondo dorado
   ===================================================== */

KF.registrarModulo({
  id: 'ventas',
  nombre: 'Ventas',
  icono: '🛒',
  orden: 1,
  render: function (cont) {

    var MODULO = 'ventas';
    var filtroFecha = 'hoy';

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

    // ---------- Pintar interfaz principal ----------
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
      html += '<div class="kf-subtitulo">Registra pedidos con varios productos</div>';

      // Botones de sincronizacion (arriba, a la derecha)
      html += '<div id="kf-sync-botones-ventas" style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:8px;"></div>';

      html += '<div class="kf-fila" style="margin-bottom:12px;">';
      html += '<select id="kf-ventas-filtro" class="kf-buscador" style="padding-left:12px;background-image:none;margin-bottom:0;">';
      html += '<option value="hoy"' + (filtroFecha === 'hoy' ? ' selected' : '') + '>Hoy</option>';
      html += '<option value="semana"' + (filtroFecha === 'semana' ? ' selected' : '') + '>Últimos 7 días</option>';
      html += '<option value="mes"' + (filtroFecha === 'mes' ? ' selected' : '') + '>Este mes</option>';
      html += '<option value="todo"' + (filtroFecha === 'todo' ? ' selected' : '') + '>Todo</option>';
      html += '</select>';
      html += '</div>';

      html += '<div class="kf-grid-resumen">';
      html += '<div class="kf-mini-card acento"><div class="lbl">Ventas</div><div class="val">' + KF.dinero(totalVentas) + '</div></div>';
      html += '<div class="kf-mini-card ' + (totalGanancia >= 0 ? 'positivo' : 'negativo') + '"><div class="lbl">Ganancia</div><div class="val">' + KF.dinero(totalGanancia) + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Operaciones</div><div class="val">' + ventas.length + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Fiado</div><div class="val">' + KF.dinero(totalFiado) + '</div></div>';
      html += '</div>';

      html += '<button class="kf-btn kf-btn-dorado kf-btn-bloque" id="kf-ventas-add" type="button" style="margin-bottom:12px;">+ Registrar pedido</button>';

      html += '<div id="kf-ventas-lista"></div>';

      cont.innerHTML = html;

      KF.syncPintarBotones('kf-sync-botones-ventas', 'ventas');
      document.getElementById('kf-ventas-add').addEventListener('click', function () { abrirFormulario(); });
      document.getElementById('kf-ventas-filtro').addEventListener('change', function (e) {
        filtroFecha = e.target.value;
        pintar();
      });

      pintarLista(ventas);
    }

    // ---------- Lista de ventas ----------
    function pintarLista(ventas) {
      var c = document.getElementById('kf-ventas-lista');
      if (!c) return;

      if (!ventas.length) {
        c.innerHTML = '<div class="kf-vacio"><span class="kf-vacio-icono">🛒</span>No hay ventas en este período.</div>';
        return;
      }

      ventas = ventas.slice().sort(function (a, b) {
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      });

      // Agrupar por pedidoId (los sin pedidoId van solos)
      var grupos = [];
      var porPedido = {};
      ventas.forEach(function (v) {
        var key = v.pedidoId || ('solo_' + v.id);
        if (!porPedido[key]) {
          porPedido[key] = { pedidoId: v.pedidoId || null, items: [], fecha: v.fecha };
          grupos.push(porPedido[key]);
        }
        porPedido[key].items.push(v);
      });

      var html = '';
      grupos.forEach(function (g) {
        if (g.pedidoId && g.items.length > 1) {
          // Pedido con varios productos
          var totalPedido = g.items.reduce(function (s, v) { return s + KF.num(v.total); }, 0);
          var gananciaPedido = g.items.reduce(function (s, v) { return s + KF.num(v.ganancia); }, 0);
          var esFiado = g.items[0].formaPago === 'fiado';
          var importado = !!g.items[0].importado;
          var estiloExtra = importado
            ? 'background:#fffbe6;border-left-color:var(--dorado);border-left-width:6px;'
            : 'border-left-width:6px;';

          html += '<div class="kf-item' + (esFiado ? ' stock-bajo' : '') + '" style="' + estiloExtra + '">';
          html += '<div class="kf-item-cab">';
          html += '<div class="kf-item-nombre">📦 Pedido · ' + g.items.length + ' productos</div>';
          html += esFiado
            ? '<span class="kf-badge kf-badge-rojo">Fiado</span>'
            : '<span class="kf-badge kf-badge-verde">Efectivo</span>';
          html += '</div>';

          if (importado) {
            html += '<div style="margin:4px 0 8px 0;"><span class="kf-badge kf-badge-dorado" style="font-size:10px;">📥 Importado' +
                    (g.items[0].origenNombre ? ' · ' + KF.esc(g.items[0].origenNombre) : '') + '</span></div>';
          }

          html += '<div style="margin:8px 0;">';
          g.items.forEach(function (v) {
            html += '<div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-bottom:1px solid var(--gris-borde);">';
            html += '<span>' + KF.esc(v.productoNombre) + ' <b style="color:#7b8a9a;">x' + KF.num(v.cantidad) + '</b></span>';
            html += '<b>' + KF.dinero(v.total) + '</b>';
            html += '</div>';
          });
          html += '</div>';

          html += '<div class="kf-item-datos">';
          html += '<div>Total: <b>' + KF.dinero(totalPedido) + '</b></div>';
          html += '<div>Ganancia: <b style="color:var(--verde);">' + KF.dinero(gananciaPedido) + '</b></div>';
          if (g.items[0].cliente) {
            html += '<div style="grid-column:1/-1;">Cliente: <b>' + KF.esc(g.items[0].cliente) + '</b></div>';
          }
          html += '<div style="grid-column:1/-1;color:#7b8a9a;font-size:12px;">' + formatearFecha(g.fecha) + '</div>';
          html += '</div>';

          html += '<div class="kf-item-acciones">';
          html += '<button class="kf-btn kf-btn-rojo kf-btn-chico" data-accion="anular-pedido" data-pedido="' + g.pedidoId + '">Anular pedido</button>';
          html += '</div>';
          html += '</div>';
        } else {
          // Venta individual
          var v = g.items[0];
          var esFiado2 = v.formaPago === 'fiado';
          var importado2 = !!v.importado;
          var estiloExtra2 = importado2
            ? 'background:#fffbe6;border-left-color:var(--dorado);'
            : '';

          html += '<div class="kf-item' + (esFiado2 ? ' stock-bajo' : '') + '" style="' + estiloExtra2 + '">';
          html += '<div class="kf-item-cab">';
          html += '<div class="kf-item-nombre">' + KF.esc(v.productoNombre) + '</div>';
          html += esFiado2
            ? '<span class="kf-badge kf-badge-rojo">Fiado</span>'
            : '<span class="kf-badge kf-badge-verde">Efectivo</span>';
          html += '</div>';

          if (importado2) {
            html += '<div style="margin:4px 0 8px 0;"><span class="kf-badge kf-badge-dorado" style="font-size:10px;">📥 Importado' +
                    (v.origenNombre ? ' · ' + KF.esc(v.origenNombre) : '') + '</span></div>';
          }

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
        }
      });

      c.innerHTML = html;

      var btns = c.querySelectorAll('button[data-accion]');
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', function (e) {
          var acc = e.currentTarget.getAttribute('data-accion');
          if (acc === 'eliminar')       anularVenta(e.currentTarget.getAttribute('data-id'));
          if (acc === 'anular-pedido')  anularPedido(e.currentTarget.getAttribute('data-pedido'));
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

    // =====================================================
    // FORMULARIO DE PEDIDO MULTI-PRODUCTO
    // =====================================================
    function abrirFormulario() {
      if (KF.diaCerrado(KF.hoy())) {
        KF.aviso('El día ya está cerrado. No se pueden registrar ventas.', 'error');
        return;
      }

      var productos = KF.leer('inventario', []);
      if (!productos.length) {
        KF.aviso('Primero añade productos en Inventario', 'error');
        return;
      }

      var lineas = [lineaVacia()];
      var formaPago = 'efectivo';
      var cliente = '';
      var telefono = '';
      var notas = '';

      function lineaVacia() {
        return { estado: 'expandida', productoId: '', cantidad: 1, precio: 0 };
      }

      function buscarProducto(id) {
        return productos.find(function (p) { return p.id === id; });
      }

      function totales() {
        var costoTotal = 0, totalCobrar = 0, ganancia = 0;
        lineas.forEach(function (l) {
          if (l.estado !== 'confirmada') return;
          var p = buscarProducto(l.productoId);
          if (!p) return;
          var cUnit = KF.num(p.costo);
          var costoLinea = cUnit * l.cantidad;
          var totalLinea = l.precio * l.cantidad;
          costoTotal += costoLinea;
          totalCobrar += totalLinea;
          ganancia += (totalLinea - costoLinea);
        });
        return { costoTotal: costoTotal, totalCobrar: totalCobrar, ganancia: ganancia };
      }

      var contenido = '';
      contenido += '<div style="font-size:12px;font-weight:600;color:var(--azul-medio);text-transform:uppercase;letter-spacing:0.3px;margin-bottom:8px;">Productos del pedido</div>';
      contenido += '<div id="vp-lineas"></div>';

      contenido += '<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--gris-borde);">';
      contenido += '<div style="font-size:12px;font-weight:600;color:var(--azul-medio);text-transform:uppercase;letter-spacing:0.3px;margin-bottom:8px;">Pago</div>';
      contenido += '<div class="kf-campo"><label>Forma de pago</label>';
      contenido += '<select id="vp-forma"><option value="efectivo">Efectivo</option><option value="fiado">Fiado (cuenta por cobrar)</option></select></div>';
      contenido += '<div class="kf-campo" id="vp-cliente-wrap" style="display:none;"><label>Cliente</label><input type="text" id="vp-cliente" placeholder="Nombre del cliente"></div>';
      contenido += '<div class="kf-campo" id="vp-tel-wrap" style="display:none;"><label>Teléfono (opcional)</label><input type="tel" id="vp-telefono"></div>';
      contenido += '<div class="kf-campo"><label>Notas (opcional)</label><input type="text" id="vp-notas" placeholder="Detalles del pedido"></div>';
      contenido += '</div>';

      contenido += '<div id="vp-totales" style="background:var(--azul-suave);padding:12px;border-radius:8px;font-size:14px;color:var(--azul-medio);margin-top:12px;"></div>';

      KF.abrirModal({
        titulo: 'Registrar pedido',
        contenido: contenido,
        textoGuardar: 'Registrar pedido',
        alGuardar: function () { guardarPedido(lineas, formaPago, cliente, telefono, notas); }
      });

      function pintarLineas() {
        var c = document.getElementById('vp-lineas');
        if (!c) return;
        var html = '';
        lineas.forEach(function (l, i) {
          if (l.estado === 'expandida') html += lineaExpandidaHTML(l, i);
          else html += lineaConfirmadaHTML(l, i);
        });
        c.innerHTML = html;
        enlazarLineas();
        actualizarTotales();
      }

      function lineaExpandidaHTML(l, i) {
        var p = buscarProducto(l.productoId);
        var opciones = '<option value="">-- Selecciona un producto --</option>';
        productos.slice().sort(function (a, b) {
          return (a.nombre || '').localeCompare(b.nombre || '');
        }).forEach(function (prod) {
          opciones += '<option value="' + prod.id + '"' +
            (l.productoId === prod.id ? ' selected' : '') + '>' +
            KF.esc(prod.nombre) + ' (stock: ' + KF.num(prod.stock) + ')</option>';
        });

        var html = '';
        html += '<div class="kf-item" style="padding:12px;background:var(--azul-suave);border-left-color:var(--dorado);margin-bottom:8px;">';
        html += '<div style="font-size:12px;color:#7b8a9a;margin-bottom:6px;">Línea ' + (i + 1) + '</div>';
        html += '<div class="kf-campo" style="margin-bottom:8px;"><label style="font-size:11px;">Producto</label><select data-producto="' + i + '">' + opciones + '</select></div>';

        if (p) {
          html += '<div class="kf-fila" style="margin-bottom:8px;">';
          html += '<div class="kf-campo" style="margin-bottom:0;"><label style="font-size:11px;">Cantidad (' + KF.esc(p.unidad || 'u') + ')</label>';
          html += '<input type="number" step="0.01" inputmode="decimal" data-cantidad="' + i + '" value="' + l.cantidad + '"></div>';
          html += '<div class="kf-campo" style="margin-bottom:0;"><label style="font-size:11px;">Precio unit.</label>';
          html += '<input type="number" step="0.01" inputmode="decimal" data-precio="' + i + '" value="' + l.precio + '"></div>';
          html += '</div>';
        }

        html += '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px;">';
        if (lineas.length > 1) html += '<button class="kf-btn kf-btn-gris kf-btn-chico" data-cancelar="' + i + '" type="button">Cancelar</button>';
        html += '<button class="kf-btn kf-btn-verde kf-btn-chico" data-ok="' + i + '" type="button">✓ OK</button>';
        html += '</div></div>';
        return html;
      }

      function lineaConfirmadaHTML(l, i) {
        var p = buscarProducto(l.productoId);
        var nombre = p ? p.nombre : '(producto eliminado)';
        var totalLinea = l.precio * l.cantidad;
        var html = '';
        html += '<div class="kf-item" style="padding:10px;border-left-color:var(--verde);margin-bottom:8px;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">';
        html += '<div style="flex:1;min-width:0;">';
        html += '<div style="font-weight:700;color:var(--azul-medio);font-size:14px;word-break:break-word;">' + KF.esc(nombre) + '</div>';
        html += '<div style="font-size:12px;color:#7b8a9a;">x' + l.cantidad + ' · ' + KF.dinero(l.precio) + ' c/u · <b style="color:var(--azul-medio);">' + KF.dinero(totalLinea) + '</b></div>';
        html += '</div>';
        html += '<div style="display:flex;gap:6px;flex-shrink:0;">';
        html += '<button class="kf-btn kf-btn-gris kf-btn-chico" data-editar="' + i + '" type="button">✎</button>';
        html += '<button class="kf-btn kf-btn-rojo kf-btn-chico" data-quitar="' + i + '" type="button">✕</button>';
        html += '</div></div></div>';
        return html;
      }

      function enlazarLineas() {
        var c = document.getElementById('vp-lineas');
        if (!c) return;
        c.querySelectorAll('[data-producto]').forEach(function (el) {
          var i = parseInt(el.getAttribute('data-producto'), 10);
          el.addEventListener('change', function (e) {
            lineas[i].productoId = e.target.value;
            var p = buscarProducto(e.target.value);
            if (p) { lineas[i].precio = KF.num(p.precio); lineas[i].cantidad = 1; }
            pintarLineas();
          });
        });
        c.querySelectorAll('[data-cantidad]').forEach(function (el) {
          var i = parseInt(el.getAttribute('data-cantidad'), 10);
          el.addEventListener('input', function (e) { lineas[i].cantidad = KF.num(e.target.value); });
        });
        c.querySelectorAll('[data-precio]').forEach(function (el) {
          var i = parseInt(el.getAttribute('data-precio'), 10);
          el.addEventListener('input', function (e) { lineas[i].precio = KF.num(e.target.value); });
        });
        c.querySelectorAll('[data-ok]').forEach(function (el) {
          el.addEventListener('click', function (e) {
            confirmarLinea(parseInt(e.currentTarget.getAttribute('data-ok'), 10));
          });
        });
        c.querySelectorAll('[data-cancelar]').forEach(function (el) {
          el.addEventListener('click', function (e) {
            var i = parseInt(e.currentTarget.getAttribute('data-cancelar'), 10);
            if (lineas.length > 1) { lineas.splice(i, 1); asegurarLineaFinal(); pintarLineas(); }
          });
        });
        c.querySelectorAll('[data-editar]').forEach(function (el) {
          el.addEventListener('click', function (e) {
            var i = parseInt(e.currentTarget.getAttribute('data-editar'), 10);
            lineas[i].estado = 'expandida';
            if (lineas.length > 1 && lineas[lineas.length - 1].estado === 'expandida') lineas.pop();
            pintarLineas();
          });
        });
        c.querySelectorAll('[data-quitar]').forEach(function (el) {
          el.addEventListener('click', function (e) {
            var i = parseInt(e.currentTarget.getAttribute('data-quitar'), 10);
            lineas.splice(i, 1);
            asegurarLineaFinal();
            pintarLineas();
          });
        });
      }

      function asegurarLineaFinal() {
        if (!lineas.length || lineas[lineas.length - 1].estado !== 'expandida') {
          lineas.push(lineaVacia());
        }
      }

      function confirmarLinea(i) {
        var l = lineas[i];
        if (!l.productoId) { KF.aviso('Selecciona un producto', 'error'); return; }
        var p = buscarProducto(l.productoId);
        if (!p) { KF.aviso('Producto no encontrado', 'error'); return; }
        var cant = KF.num(l.cantidad);
        var prec = KF.num(l.precio);
        if (cant <= 0) { KF.aviso('Cantidad inválida', 'error'); return; }
        if (prec < 0)  { KF.aviso('Precio inválido', 'error'); return; }

        var yaEnPedido = 0;
        lineas.forEach(function (x, idx) {
          if (idx === i) return;
          if (x.estado === 'confirmada' && x.productoId === l.productoId) {
            yaEnPedido += KF.num(x.cantidad);
          }
        });
        var totalReq = yaEnPedido + cant;
        if (KF.num(p.stock) < totalReq) {
          KF.aviso('Stock insuficiente de "' + p.nombre + '". Disponible: ' + KF.num(p.stock) +
                   (yaEnPedido > 0 ? ' (ya en pedido: ' + yaEnPedido + ')' : ''), 'error');
          return;
        }

        l.estado = 'confirmada';
        l.cantidad = cant;
        l.precio = prec;
        asegurarLineaFinal();
        pintarLineas();
      }

      function actualizarTotales() {
        var t = totales();
        var el = document.getElementById('vp-totales');
        if (!el) return;
        el.innerHTML =
          '<div style="display:flex;justify-content:space-between;"><span>Costo total:</span><b>' + KF.dinero(t.costoTotal) + '</b></div>' +
          '<div style="display:flex;justify-content:space-between;"><span>Total a cobrar:</span><b>' + KF.dinero(t.totalCobrar) + '</b></div>' +
          '<div style="display:flex;justify-content:space-between;margin-top:4px;color:' + (t.ganancia >= 0 ? 'var(--verde)' : 'var(--rojo)') + ';font-weight:800;">' +
          '<span>Ganancia estimada:</span><span>' + KF.dinero(t.ganancia) + '</span></div>';
      }

      var selForma = document.getElementById('vp-forma');
      var inpCliente = document.getElementById('vp-cliente');
      var inpTel = document.getElementById('vp-telefono');
      var inpNotas = document.getElementById('vp-notas');

      selForma.addEventListener('change', function (e) {
        formaPago = e.target.value;
        var esFiado = formaPago === 'fiado';
        document.getElementById('vp-cliente-wrap').style.display = esFiado ? 'block' : 'none';
        document.getElementById('vp-tel-wrap').style.display = esFiado ? 'block' : 'none';
      });
      inpCliente.addEventListener('input', function (e) { cliente = e.target.value; });
      inpTel.addEventListener('input', function (e) { telefono = e.target.value; });
      inpNotas.addEventListener('input', function (e) { notas = e.target.value; });

      pintarLineas();
    }

    // =====================================================
    // GUARDAR PEDIDO
    // =====================================================
    function guardarPedido(lineas, formaPago, cliente, telefono, notas) {
      if (KF.diaCerrado(KF.hoy())) {
        KF.aviso('El día ya está cerrado. No se pueden registrar ventas.', 'error');
        return;
      }

      var confirmadas = lineas.filter(function (l) { return l.estado === 'confirmada'; });
      if (!confirmadas.length) {
        KF.aviso('Añade al menos un producto', 'error');
        return;
      }

      var productos = KF.leer('inventario', []);

      for (var i = 0; i < confirmadas.length; i++) {
        var l = confirmadas[i];
        var p = productos.find(function (x) { return x.id === l.productoId; });
        if (!p) { KF.aviso('Producto no encontrado en el pedido', 'error'); return; }
        if (KF.num(p.stock) < KF.num(l.cantidad)) {
          KF.aviso('Stock insuficiente de "' + p.nombre + '". Disponible: ' + KF.num(p.stock), 'error');
          return;
        }
      }

      if (formaPago === 'fiado' && !cliente.trim()) {
        KF.aviso('Escribe el nombre del cliente', 'error');
        return;
      }

      var pedidoId = 'ped' + KF.id();
      var fecha = KF.ahora();
      var totalPedido = 0;

      confirmadas.forEach(function (l) {
        totalPedido += l.precio * l.cantidad;
      });

      var ventas = leerVentas();
      confirmadas.forEach(function (l) {
        var p = productos.find(function (x) { return x.id === l.productoId; });
        var costoUnitario = KF.num(p.costo);
        var total = l.precio * l.cantidad;
        var costoTotal = costoUnitario * l.cantidad;
        var ganancia = total - costoTotal;

        ventas.push({
          id: KF.id(),
          fecha: fecha,
          pedidoId: pedidoId,
          pedidoTotal: totalPedido,
          productoId: p.id,
          productoNombre: p.nombre,
          unidad: p.unidad || 'u',
          cantidad: l.cantidad,
          precioUnitario: l.precio,
          costoUnitarioHistorico: costoUnitario,
          total: total,
          costoTotal: costoTotal,
          ganancia: ganancia,
          formaPago: formaPago,
          cliente: cliente.trim(),
          telefono: telefono.trim(),
          notas: notas.trim()
        });
      });
      guardarVentas(ventas);

      confirmadas.forEach(function (l) {
        var idx = productos.findIndex(function (x) { return x.id === l.productoId; });
        productos[idx].stock = KF.num(productos[idx].stock) - KF.num(l.cantidad);
        productos[idx].actualizado = KF.ahora();
      });
      KF.escribir('inventario', productos);

      if (formaPago === 'efectivo') {
        var ef = KF.leer('efectivo', []);
        ef.push({
          id: KF.id(),
          fecha: fecha,
          tipo: 'ingreso',
          monto: totalPedido,
          concepto: 'Venta · Pedido ' + confirmadas.length + ' producto' + (confirmadas.length !== 1 ? 's' : ''),
          referencia: 'ventas',
          refId: pedidoId
        });
        KF.escribir('efectivo', ef);
      } else {
        var cxc = KF.leer('cuentas-cobrar', []);
        var detalle = confirmadas.map(function (l) {
          var p = productos.find(function (x) { return x.id === l.productoId; });
          return (p ? p.nombre : '?') + ' x' + l.cantidad;
        }).join(', ');
        cxc.push({
          id: KF.id(),
          fecha: fecha,
          cliente: cliente.trim(),
          telefono: telefono.trim(),
          monto: totalPedido,
          concepto: 'Venta fiada: ' + detalle,
          estado: 'pendiente',
          refVenta: pedidoId,
          pagos: []
        });
        KF.escribir('cuentas-cobrar', cxc);
      }

      KF.cerrarModal();
      KF.aviso('Pedido registrado (' + confirmadas.length + ' producto' + (confirmadas.length !== 1 ? 's' : '') + ')', 'ok');
      pintar();
    }

    // ---------- Anular venta ----------
    function anularVenta(id) {
      var ventas = leerVentas();
      var v = ventas.find(function (x) { return x.id === id; });
      if (!v) return;

      KF.confirmar('¿Anular esta venta de "' + v.productoNombre + '"? Se devolverá el stock y se revertirá el efecto en caja o cuenta por cobrar.', function () {
        revertirVenta(v, ventas);
        KF.aviso('Venta anulada', 'ok');
        pintar();
      });
    }

    // ---------- Anular pedido ----------
    function anularPedido(pedidoId) {
      var ventas = leerVentas();
      var delPedido = ventas.filter(function (x) { return x.pedidoId === pedidoId; });
      if (!delPedido.length) return;

      KF.confirmar('¿Anular el pedido completo (' + delPedido.length + ' productos)? Se revertirá todo: stock, caja o cuenta por cobrar.', function () {
        var lista = ventas;
        delPedido.forEach(function (v) {
          lista = revertirVentaSilencioso(v, lista);
        });
        guardarVentas(lista);

        var ef = KF.leer('efectivo', []).filter(function (m) {
          return !(m.referencia === 'ventas' && m.refId === pedidoId);
        });
        KF.escribir('efectivo', ef);

        var cxc = KF.leer('cuentas-cobrar', []).filter(function (c) {
          return c.refVenta !== pedidoId;
        });
        KF.escribir('cuentas-cobrar', cxc);

        KF.aviso('Pedido anulado', 'ok');
        pintar();
      });
    }

    function revertirVenta(v, ventas) {
      var lista = revertirVentaSilencioso(v, ventas);
      guardarVentas(lista);

      if (v.formaPago === 'efectivo') {
        var ef = KF.leer('efectivo', []);
        if (v.pedidoId) {
          var idx = ef.findIndex(function (m) {
            return m.referencia === 'ventas' && m.refId === v.pedidoId;
          });
          if (idx >= 0) {
            ef[idx].monto = KF.num(ef[idx].monto) - KF.num(v.total);
            if (ef[idx].monto <= 0.001) ef.splice(idx, 1);
          }
        } else {
          ef = ef.filter(function (m) {
            return !(m.referencia === 'ventas' && m.refId === v.id);
          });
        }
        KF.escribir('efectivo', ef);
      }

      if (v.formaPago === 'fiado') {
        var cxc = KF.leer('cuentas-cobrar', []);
        if (v.pedidoId) {
          var idx2 = cxc.findIndex(function (c) { return c.refVenta === v.pedidoId; });
          if (idx2 >= 0) {
            cxc[idx2].monto = KF.num(cxc[idx2].monto) - KF.num(v.total);
            if (cxc[idx2].monto <= 0.001) {
              cxc.splice(idx2, 1);
            } else {
              var pagado = (cxc[idx2].pagos || []).reduce(function (s, p) { return s + KF.num(p.monto); }, 0);
              cxc[idx2].estado = (KF.num(cxc[idx2].monto) - pagado) <= 0.001 ? 'pagado' : 'pendiente';
            }
          }
        } else {
          cxc = cxc.filter(function (c) { return c.refVenta !== v.id; });
        }
        KF.escribir('cuentas-cobrar', cxc);
      }
    }

    function revertirVentaSilencioso(v, ventas) {
      var productos = KF.leer('inventario', []);
      var idx = productos.findIndex(function (x) { return x.id === v.productoId; });
      if (idx >= 0) {
        productos[idx].stock = KF.num(productos[idx].stock) + KF.num(v.cantidad);
        KF.escribir('inventario', productos);
      }
      return ventas.filter(function (x) { return x.id !== v.id; });
    }

    pintar();
  }
});