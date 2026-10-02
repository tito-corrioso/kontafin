/* =====================================================
   Modulo: Inventario
   Cada producto es una subcuenta de la cuenta Inventario.
   CRUD completo con busqueda y alerta de stock bajo.
   ===================================================== */

KF.registrarModulo({
  id: 'inventario',
  nombre: 'Inventario',
  icono: '📦',
  orden: 3,
  render: function (cont) {

    var MODULO = 'inventario'; // clave de almacenamiento
    var busqueda = '';

    // ---------- Leer productos ----------
    function leerProductos() {
      return KF.leer(MODULO, []);
    }

    // ---------- Guardar lista completa ----------
    function guardarProductos(lista) {
      KF.escribir(MODULO, lista);
    }

    // ---------- Pintar interfaz ----------
    function pintar() {
      var productos = leerProductos();

      var html = '';
      html += '<div class="kf-titulo-modulo">📦 Inventario</div>';
      html += '<div class="kf-subtitulo">Gestiona tus productos y su stock</div>';

      // Boton añadir
      html += '<button class="kf-btn kf-btn-dorado kf-btn-bloque" id="kf-inv-add" type="button" style="margin-bottom:12px;">+ Añadir producto</button>';

      // Resumen
      var valorCosto = 0, valorVenta = 0, bajos = 0;
      productos.forEach(function (p) {
        var c = KF.num(p.costo), pr = KF.num(p.precio), st = KF.num(p.stock);
        valorCosto += c * st;
        valorVenta += pr * st;
        if (st <= KF.num(p.stockMinimo)) bajos++;
      });

      html += '<div class="kf-grid-resumen">';
      html += '<div class="kf-mini-card acento"><div class="lbl">Productos</div><div class="val">' + productos.length + '</div></div>';
      html += '<div class="kf-mini-card ' + (bajos > 0 ? 'negativo' : 'positivo') + '"><div class="lbl">Stock bajo</div><div class="val">' + bajos + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Invertido</div><div class="val">' + KF.dinero(valorCosto) + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">A venta</div><div class="val">' + KF.dinero(valorVenta) + '</div></div>';
      html += '</div>';

      // Buscador
      html += '<input type="text" class="kf-buscador" id="kf-inv-buscar" placeholder="Buscar producto..." value="' + KF.esc(busqueda) + '">';

      // Lista de productos
      html += '<div id="kf-inv-lista"></div>';

      cont.innerHTML = html;

      // Enlazar boton añadir
      document.getElementById('kf-inv-add').addEventListener('click', function () { abrirFormulario(null); });

      // Enlazar buscador
      var buscador = document.getElementById('kf-inv-buscar');
      buscador.addEventListener('input', function (e) {
        busqueda = e.target.value || '';
        pintarLista();
      });

      pintarLista();
    }

    // ---------- Pintar solo la lista (para no perder el foco del buscador) ----------
    function pintarLista() {
      var lista = document.getElementById('kf-inv-lista');
      if (!lista) return;

      var productos = leerProductos();
      var filtro = busqueda.trim().toLowerCase();
      if (filtro) {
        productos = productos.filter(function (p) {
          return (p.nombre || '').toLowerCase().indexOf(filtro) !== -1;
        });
      }

      if (!productos.length) {
        lista.innerHTML = '<div class="kf-vacio">' +
          '<span class="kf-vacio-icono">📦</span>' +
          (busqueda ? 'Ningún producto coincide con la búsqueda.' : 'Aún no has añadido productos.') +
          '</div>';
        return;
      }

      // Ordenar alfabeticamente
      productos.sort(function (a, b) {
        return (a.nombre || '').localeCompare(b.nombre || '');
      });

      var html = '';
      productos.forEach(function (p) {
        var c = KF.num(p.costo), pr = KF.num(p.precio), st = KF.num(p.stock);
        var minimo = KF.num(p.stockMinimo);
        var ganancia = pr - c;
        var margen = pr > 0 ? (ganancia / pr * 100) : 0;
        var bajo = st <= minimo;

        html += '<div class="kf-item' + (bajo ? ' stock-bajo' : '') + '">';
        html += '<div class="kf-item-cab">';
        html += '<div class="kf-item-nombre">' + KF.esc(p.nombre) + '</div>';
        html += bajo ? '<span class="kf-badge kf-badge-rojo">Stock bajo</span>'
                     : '<span class="kf-badge kf-badge-verde">OK</span>';
        html += '</div>';

        html += '<div class="kf-item-datos">';
        html += '<div>Stock: <b>' + st + '</b> ' + KF.esc(p.unidad || 'u') + '</div>';
        html += '<div>Mínimo: <b>' + minimo + '</b></div>';
        html += '<div>Costo: <b>' + KF.dinero(c) + '</b></div>';
        html += '<div>Precio: <b>' + KF.dinero(pr) + '</b></div>';
        html += '<div>Ganancia: <b style="color:' + (ganancia >= 0 ? 'var(--verde)' : 'var(--rojo)') + ';">' + KF.dinero(ganancia) + '</b></div>';
        html += '<div>Margen: <b>' + margen.toFixed(1) + '%</b></div>';
        html += '</div>';

        html += '<div class="kf-item-acciones">';
        html += '<button class="kf-btn kf-btn-gris kf-btn-chico" data-accion="editar" data-id="' + p.id + '">Editar</button>';
        html += '<button class="kf-btn kf-btn-rojo kf-btn-chico" data-accion="eliminar" data-id="' + p.id + '">Eliminar</button>';
        html += '</div>';
        html += '</div>';
      });

      lista.innerHTML = html;

      // Enlazar botones editar / eliminar
      var botones = lista.querySelectorAll('button[data-accion]');
      for (var i = 0; i < botones.length; i++) {
        botones[i].addEventListener('click', function (e) {
          var accion = e.currentTarget.getAttribute('data-accion');
          var id = e.currentTarget.getAttribute('data-id');
          if (accion === 'editar') abrirFormulario(id);
          if (accion === 'eliminar') confirmarEliminar(id);
        });
      }
    }

    // ---------- Formulario añadir / editar ----------
    function abrirFormulario(id) {
      var productos = leerProductos();
      var p = id ? productos.find(function (x) { return x.id === id; }) : null;

      var esEdicion = !!p;
      var datos = p || {
        nombre: '', costo: '', precio: '', stock: '', stockMinimo: KF.num(KF.config.stockBajoDefault) || 5, unidad: 'u'
      };

      var contenido = '';
      contenido += '<div class="kf-campo"><label>Nombre del producto</label><input type="text" id="f-nombre" value="' + KF.esc(datos.nombre) + '" placeholder="Ej: Arroz"></div>';
      contenido += '<div class="kf-fila">';
      contenido += '<div class="kf-campo"><label>Costo</label><input type="number" step="0.01" inputmode="decimal" id="f-costo" value="' + KF.esc(datos.costo) + '" placeholder="0.00"></div>';
      contenido += '<div class="kf-campo"><label>Precio venta</label><input type="number" step="0.01" inputmode="decimal" id="f-precio" value="' + KF.esc(datos.precio) + '" placeholder="0.00"></div>';
      contenido += '</div>';
      contenido += '<div class="kf-fila">';
      contenido += '<div class="kf-campo"><label>Stock actual</label><input type="number" step="0.01" inputmode="decimal" id="f-stock" value="' + KF.esc(datos.stock) + '" placeholder="0"></div>';
      contenido += '<div class="kf-campo"><label>Unidad</label><input type="text" id="f-unidad" value="' + KF.esc(datos.unidad || 'u') + '" placeholder="u, kg, L..."></div>';
      contenido += '</div>';
      contenido += '<div class="kf-campo"><label>Stock mínimo (alerta)</label><input type="number" step="0.01" inputmode="decimal" id="f-minimo" value="' + KF.esc(datos.stockMinimo) + '" placeholder="5"></div>';
      contenido += '<div class="kf-campo"><label>Notas (opcional)</label><textarea id="f-notas" rows="2">' + KF.esc(datos.notas || '') + '</textarea></div>';

      KF.abrirModal({
        titulo: esEdicion ? 'Editar producto' : 'Nuevo producto',
        contenido: contenido,
        textoGuardar: esEdicion ? 'Guardar cambios' : 'Añadir',
        alGuardar: function () {
          var nombre = document.getElementById('f-nombre').value.trim();
          if (!nombre) { KF.aviso('Escribe un nombre', 'error'); return; }

          var nuevo = {
            id: p ? p.id : KF.id(),
            nombre: nombre,
            costo: KF.num(document.getElementById('f-costo').value),
            precio: KF.num(document.getElementById('f-precio').value),
            stock: KF.num(document.getElementById('f-stock').value),
            stockMinimo: KF.num(document.getElementById('f-minimo').value),
            unidad: document.getElementById('f-unidad').value.trim() || 'u',
            notas: document.getElementById('f-notas').value.trim(),
            actualizado: KF.ahora()
          };

          var lista = leerProductos();
          if (esEdicion) {
            var i = lista.findIndex(function (x) { return x.id === nuevo.id; });
            if (i >= 0) lista[i] = nuevo;
          } else {
            nuevo.creado = KF.ahora();
            lista.push(nuevo);
          }
          guardarProductos(lista);
          KF.cerrarModal();
          KF.aviso(esEdicion ? 'Producto actualizado' : 'Producto añadido', 'ok');
          pintar();
        }
      });

      // Enfocar el primer campo despues de abrir
      setTimeout(function () {
        var el = document.getElementById('f-nombre');
        if (el) el.focus();
      }, 100);
    }

    // ---------- Confirmar eliminacion ----------
    function confirmarEliminar(id) {
      var productos = leerProductos();
      var p = productos.find(function (x) { return x.id === id; });
      if (!p) return;

      KF.confirmar('¿Eliminar "' + p.nombre + '"? Esta acción no se puede deshacer.', function () {
        var lista = leerProductos().filter(function (x) { return x.id !== id; });
        guardarProductos(lista);
        KF.aviso('Producto eliminado', 'ok');
        pintar();
      });
    }

    // ---------- Arrancar el modulo ----------
    pintar();
  }
});