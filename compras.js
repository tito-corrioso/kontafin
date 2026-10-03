/* =====================================================
   Modulo: Compras
   - Registra compra de mercancia (suma stock)
   - Si es a credito, crea cuenta por pagar
   - Si es efectivo, resta de caja
   - SINCRONIZACION: Exportar/Importar + fondo dorado
   ===================================================== */

KF.registrarModulo({
  id: 'compras',
  nombre: 'Compras',
  icono: '🧾',
  orden: 2,
  render: function (cont) {

    var MODULO = 'compras';
    var filtroFecha = 'hoy';

    function leerCompras() { return KF.leer(MODULO, []); }
    function guardarCompras(l) { KF.escribir(MODULO, l); }

    function rangoSegunFiltro() {
      var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      var desde = new Date(hoy);
      if (filtroFecha === 'semana') desde.setDate(hoy.getDate() - 6);
      if (filtroFecha === 'mes')    desde.setDate(1);
      if (filtroFecha === 'todo')   desde = new Date(0);
      return desde.getTime();
    }

    function dentroDelFiltro(iso) { return new Date(iso).getTime() >= rangoSegunFiltro(); }

    // ---------- Interfaz ----------
    function pintar() {
      var compras = leerCompras().filter(function (c) { return dentroDelFiltro(c.fecha); });

      var totalCompras = 0, totalCredito = 0, totalContado = 0;
      compras.forEach(function (c) {
        totalCompras += KF.num(c.total);
        if (c.formaPago === 'credito') totalCredito += KF.num(c.total);
        else totalContado += KF.num(c.total);
      });

      var html = '';
      html += '<div class="kf-titulo-modulo">🧾 Compras</div>';
      html += '<div class="kf-subtitulo">Registra la entrada de mercancía a tu negocio</div>';

      // Botones de sincronizacion
      html += '<div id="kf-sync-botones-compras" style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:8px;"></div>';

      html += '<div class="kf-fila" style="margin-bottom:12px;">';
      html += '<select id="kf-compras-filtro" class="kf-buscador" style="padding-left:12px;background-image:none;">';
      html += '<option value="hoy"' + (filtroFecha === 'hoy' ? ' selected' : '') + '>Hoy</option>';
      html += '<option value="semana"' + (filtroFecha === 'semana' ? ' selected' : '') + '>Últimos 7 días</option>';
      html += '<option value="mes"' + (filtroFecha === 'mes' ? ' selected' : '') + '>Este mes</option>';
      html += '<option value="todo"' + (filtroFecha === 'todo' ? ' selected' : '') + '>Todo</option>';
      html += '</select></div>';

      html += '<div class="kf-grid-resumen">';
      html += '<div class="kf-mini-card acento"><div class="lbl">Total compras</div><div class="val">' + KF.dinero(totalCompras) + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Al contado</div><div class="val">' + KF.dinero(totalContado) + '</div></div>';
      html += '<div class="kf-mini-card ' + (totalCredito > 0 ? 'negativo' : 'positivo') + '"><div class="lbl">A crédito</div><div class="val">' + KF.dinero(totalCredito) + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Operaciones</div><div class="val">' + compras.length + '</div></div>';
      html += '</div>';

      html += '<button class="kf-btn kf-btn-dorado kf-btn-bloque" id="kf-compras-add" type="button" style="margin-bottom:12px;">+ Registrar compra</button>';
      html += '<div id="kf-compras-lista"></div>';

      cont.innerHTML = html;

      KF.syncPintarBotones('kf-sync-botones-compras', 'compras');
      document.getElementById('kf-compras-add').addEventListener('click', abrirFormulario);
      document.getElementById('kf-compras-filtro').addEventListener('change', function (e) {
        filtroFecha = e.target.value;
        pintar();
      });

      pintarLista(compras);
    }

    function pintarLista(compras) {
      var cont = document.getElementById('kf-compras-lista');
      if (!cont) return;

      if (!compras.length) {
        cont.innerHTML = '<div class="kf-vacio"><span class="kf-vacio-icono">🧾</span>No hay compras en este período.</div>';
        return;
      }

      compras = compras.slice().sort(function (a, b) {
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      });

      var html = '';
      compras.forEach(function (c) {
        var aCredito = c.formaPago === 'credito';
        var importado = !!c.importado;
        var estiloExtra = importado ? 'background:#fffbe6;border-left-color:var(--dorado);' : '';

        html += '<div class="kf-item' + (aCredito ? ' stock-bajo' : '') + '" style="' + estiloExtra + '">';
        html += '<div class="kf-item-cab">';
        html += '<div class="kf-item-nombre">' + KF.esc(c.productoNombre) + '</div>';
        html += aCredito
          ? '<span class="kf-badge kf-badge-rojo">A crédito</span>'
          : '<span class="kf-badge kf-badge-verde">Contado</span>';
        html += '</div>';

        if (importado) {
          html += '<div style="margin:4px 0 8px 0;"><span class="kf-badge kf-badge-dorado" style="font-size:10px;">📥 Importado' +
                  (c.origenNombre ? ' · ' + KF.esc(c.origenNombre) : '') + '</span></div>';
        }

        html += '<div class="kf-item-datos">';
        html += '<div>Cantidad: <b>' + KF.num(c.cantidad) + ' ' + KF.esc(c.unidad || 'u') + '</b></div>';
        html += '<div>Costo unit.: <b>' + KF.dinero(c.costoUnitario) + '</b></div>';
        html += '<div>Total: <b>' + KF.dinero(c.total) + '</b></div>';
        if (c.proveedor) html += '<div style="grid-column:1/-1;">Proveedor: <b>' + KF.esc(c.proveedor) + '</b></div>';
        html += '<div style="grid-column:1/-1;color:#7b8a9a;font-size:12px;">' + formatearFecha(c.fecha) + '</div>';
        html += '</div>';

        html += '<div class="kf-item-acciones">';
        html += '<button class="kf-btn kf-btn-rojo kf-btn-chico" data-accion="eliminar" data-id="' + c.id + '">Anular</button>';
        html += '</div></div>';
      });
      cont.innerHTML = html;

      var botones = cont.querySelectorAll('button[data-accion="eliminar"]');
      for (var i = 0; i < botones.length; i++) {
        botones[i].addEventListener('click', function (e) {
          anularCompra(e.currentTarget.getAttribute('data-id'));
        });
      }
    }

    function formatearFecha(iso) {
      var d = new Date(iso);
      return String(d.getDate()).padStart(2, '0') + '/' +
             String(d.getMonth() + 1).padStart(2, '0') + ' ' +
             String(d.getHours()).padStart(2, '0') + ':' +
             String(d.getMinutes()).padStart(2, '0');
    }

    // ---------- Formulario ----------
    function abrirFormulario() {
      var productos = KF.leer('inventario', []);

      var opciones = '<option value="">-- Producto existente --</option>';
      productos.slice().sort(function (a, b) {
        return (a.nombre || '').localeCompare(b.nombre || '');
      }).forEach(function (p) {
        opciones += '<option value="' + p.id + '">' + KF.esc(p.nombre) + '</option>';
      });
      opciones += '<option value="__nuevo__">➕ Producto nuevo</option>';

      var contenido = '';
      contenido += '<div class="kf-campo"><label>Producto</label><select id="c-producto">' + opciones + '</select></div>';
      contenido += '<div class="kf-campo" id="c-nuevo-wrap" style="display:none;"><label>Nombre del producto nuevo</label><input type="text" id="c-nuevo-nombre" placeholder="Ej: Arroz"></div>';
      contenido += '<div class="kf-campo" id="c-nuevo-unidad-wrap" style="display:none;"><label>Unidad</label><input type="text" id="c-nuevo-unidad" value="u" placeholder="u, kg, L..."></div>';
      contenido += '<div class="kf-campo"><label>Cantidad</label><input type="number" step="0.01" inputmode="decimal" id="c-cantidad" value="1"></div>';
      contenido += '<div class="kf-campo"><label>Costo unitario</label><input type="number" step="0.01" inputmode="decimal" id="c-costo" value="0.00"></div>';
      contenido += '<div class="kf-campo"><label>Precio de venta (opcional)</label><input type="number" step="0.01" inputmode="decimal" id="c-precio" value="0.00" placeholder="Actualiza el precio del producto"></div>';
      contenido += '<div class="kf-campo"><label>Forma de pago</label>';
      contenido += '<select id="c-forma"><option value="efectivo">Efectivo</option><option value="credito">A crédito (cuenta por pagar)</option></select></div>';
      contenido += '<div class="kf-campo" id="c-prov-wrap" style="display:none;"><label>Proveedor</label><input type="text" id="c-proveedor" placeholder="Nombre del proveedor"></div>';
      contenido += '<div class="kf-campo" id="c-tel-wrap" style="display:none;"><label>Teléfono (opcional)</label><input type="tel" id="c-telefono"></div>';
      contenido += '<div class="kf-campo"><label>Notas (opcional)</label><input type="text" id="c-notas"></div>';
      contenido += '<div id="c-info" style="background:var(--azul-suave);padding:10px;border-radius:8px;font-size:13px;color:var(--azul-medio);"></div>';

      KF.abrirModal({
        titulo: 'Registrar compra',
        contenido: contenido,
        textoGuardar: 'Registrar',
        alGuardar: guardarCompra
      });

      var selProducto = document.getElementById('c-producto');
      var inpCantidad = document.getElementById('c-cantidad');
      var inpCosto = document.getElementById('c-costo');
      var selForma = document.getElementById('c-forma');

      function actualizar() {
        var cant = KF.num(inpCantidad.value);
        var costo = KF.num(inpCosto.value);
        document.getElementById('c-info').innerHTML = 'Total a pagar: <b>' + KF.dinero(cant * costo) + '</b>';
      }

      selProducto.addEventListener('change', function () {
        var esNuevo = selProducto.value === '__nuevo__';
        document.getElementById('c-nuevo-wrap').style.display = esNuevo ? 'block' : 'none';
        document.getElementById('c-nuevo-unidad-wrap').style.display = esNuevo ? 'block' : 'none';
        if (!esNuevo) {
          var p = productos.find(function (x) { return x.id === selProducto.value; });
          if (p) {
            document.getElementById('c-costo').value = KF.num(p.costo);
            document.getElementById('c-precio').value = KF.num(p.precio);
          }
        }
        actualizar();
      });

      selForma.addEventListener('change', function () {
        var aCred = selForma.value === 'credito';
        document.getElementById('c-prov-wrap').style.display = aCred ? 'block' : 'none';
        document.getElementById('c-tel-wrap').style.display = aCred ? 'block' : 'none';
      });

      inpCantidad.addEventListener('input', actualizar);
      inpCosto.addEventListener('input', actualizar);
    }

    // ---------- Guardar compra ----------
    function guardarCompra() {
      if (KF.diaCerrado(KF.hoy())) {
        KF.aviso('El día ya está cerrado. No se pueden registrar compras.', 'error');
        return;
      }
      var idProd = document.getElementById('c-producto').value;
      if (!idProd) { KF.aviso('Selecciona un producto', 'error'); return; }

      var cantidad = KF.num(document.getElementById('c-cantidad').value);
      var costo = KF.num(document.getElementById('c-costo').value);
      var precio = KF.num(document.getElementById('c-precio').value);
      var forma = document.getElementById('c-forma').value;
      var proveedor = document.getElementById('c-proveedor') ? document.getElementById('c-proveedor').value.trim() : '';
      var telefono = document.getElementById('c-telefono') ? document.getElementById('c-telefono').value.trim() : '';
      var notas = document.getElementById('c-notas').value.trim();

      if (cantidad <= 0) { KF.aviso('Cantidad inválida', 'error'); return; }
      if (costo < 0)     { KF.aviso('Costo inválido', 'error'); return; }
      if (forma === 'credito' && !proveedor) { KF.aviso('Escribe el proveedor', 'error'); return; }

      var productos = KF.leer('inventario', []);
      var p;
      var esNuevo = idProd === '__nuevo__';

      if (esNuevo) {
        var nombre = document.getElementById('c-nuevo-nombre').value.trim();
        var unidad = document.getElementById('c-nuevo-unidad').value.trim() || 'u';
        if (!nombre) { KF.aviso('Escribe el nombre del producto nuevo', 'error'); return; }
        p = {
          id: KF.id(),
          nombre: nombre,
          costo: costo,
          precio: precio,
          stock: 0,
          stockMinimo: KF.num(KF.config.stockBajoDefault) || 5,
          unidad: unidad,
          notas: '',
          creado: KF.ahora(),
          actualizado: KF.ahora()
        };
        productos.push(p);
      } else {
        p = productos.find(function (x) { return x.id === idProd; });
        if (!p) { KF.aviso('Producto no encontrado', 'error'); return; }
      }

      var idx = productos.findIndex(function (x) { return x.id === p.id; });
      productos[idx].stock = KF.num(productos[idx].stock) + cantidad;
      productos[idx].costo = costo;
      if (precio > 0) productos[idx].precio = precio;
      productos[idx].actualizado = KF.ahora();
      KF.escribir('inventario', productos);

      var total = cantidad * costo;

      var compra = {
        id: KF.id(),
        fecha: KF.ahora(),
        productoId: p.id,
        productoNombre: p.nombre,
        unidad: p.unidad || 'u',
        cantidad: cantidad,
        costoUnitario: costo,
        total: total,
        formaPago: forma,
        proveedor: proveedor,
        telefono: telefono,
        notas: notas
      };
      var compras = leerCompras();
      compras.push(compra);
      guardarCompras(compras);

      if (forma === 'efectivo') {
        var efectivo = KF.leer('efectivo', []);
        efectivo.push({
          id: KF.id(),
          fecha: KF.ahora(),
          tipo: 'egreso',
          monto: total,
          concepto: 'Compra: ' + p.nombre + ' x' + cantidad,
          referencia: 'compras',
          refId: compra.id
        });
        KF.escribir('efectivo', efectivo);
      } else {
        var cxp = KF.leer('cuentas-pagar', []);
        cxp.push({
          id: KF.id(),
          fecha: KF.ahora(),
          proveedor: proveedor,
          telefono: telefono,
          monto: total,
          concepto: 'Compra a crédito: ' + p.nombre + ' x' + cantidad,
          estado: 'pendiente',
          refCompra: compra.id,
          pagos: []
        });
        KF.escribir('cuentas-pagar', cxp);
      }

      KF.cerrarModal();
      KF.aviso('Compra registrada', 'ok');
      pintar();
    }

    // ---------- Anular compra ----------
    function anularCompra(id) {
      var compras = leerCompras();
      var c = compras.find(function (x) { return x.id === id; });
      if (!c) return;

      KF.confirmar('¿Anular esta compra de "' + c.productoNombre + '"? Se devolverá la mercancía y se revertirá el efecto en caja o cuenta por pagar.', function () {
        var productos = KF.leer('inventario', []);
        var idx = productos.findIndex(function (x) { return x.id === c.productoId; });
        if (idx >= 0) {
          productos[idx].stock = KF.num(productos[idx].stock) - KF.num(c.cantidad);
          KF.escribir('inventario', productos);
        }

        if (c.formaPago === 'efectivo') {
          var ef = KF.leer('efectivo', []).filter(function (m) {
            return !(m.referencia === 'compras' && m.refId === c.id);
          });
          KF.escribir('efectivo', ef);
        } else {
          var cxp = KF.leer('cuentas-pagar', []).filter(function (x) {
            return x.refCompra !== c.id;
          });
          KF.escribir('cuentas-pagar', cxp);
        }

        var nuevas = compras.filter(function (x) { return x.id !== id; });
        guardarCompras(nuevas);
        KF.aviso('Compra anulada', 'ok');
        pintar();
      });
    }

    pintar();
  }
});