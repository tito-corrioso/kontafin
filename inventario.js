/* =====================================================
   Modulo: Inventario - Version 2 (con categorias)
   Cada producto es una subcuenta de la cuenta Inventario.
   - CRUD completo con busqueda y alerta de stock bajo
   - Categorias: por defecto + las que añada el usuario
   - Filtro por categoria
   - Vista: todos o agrupados por categoria
   - Gestion de categorias desde un modal
   ===================================================== */

KF.registrarModulo({
  id: 'inventario',
  nombre: 'Inventario',
  icono: '📦',
  orden: 3,
  render: function (cont) {

    var MODULO = 'inventario';
    var busqueda = '';
    var filtroCategoria = ''; // '' = todas
    var agrupar = false;      // vista agrupada o plana

    // ---------- Lectura / escritura ----------
    function leerProductos() { return KF.leer(MODULO, []); }
    function guardarProductos(l) { KF.escribir(MODULO, l); }

    // ---------- Interfaz principal ----------
    function pintar() {
      var productos = leerProductos();

      var html = '';
      html += '<div class="kf-titulo-modulo">📦 Inventario</div>';
      html += '<div class="kf-subtitulo">Gestiona tus productos, stock y categorías</div>';

      // Boton añadir + boton categorias
      html += '<div class="kf-fila" style="margin-bottom:12px;">';
      html += '<button class="kf-btn kf-btn-dorado" id="kf-inv-add" type="button" style="flex:2;">+ Añadir producto</button>';
      html += '<button class="kf-btn kf-btn-gris" id="kf-inv-cats" type="button" style="flex:1;">🏷️ Categorías</button>';
      html += '</div>';

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

      // Filtros: categoria + vista
      var cats = KF.categoriasLista();
      html += '<div class="kf-fila" style="margin-bottom:12px;">';
      html += '<select id="kf-inv-filtro-cat" class="kf-buscador" style="padding-left:12px;background-image:none;margin-bottom:0;">';
      html += '<option value="">Todas las categorías</option>';
      html += '<option value="__sin__"' + (filtroCategoria === '__sin__' ? ' selected' : '') + '>Sin categoría</option>';
      cats.forEach(function (c) {
        html += '<option value="' + KF.esc(c) + '"' + (filtroCategoria === c ? ' selected' : '') + '>' + KF.esc(c) + '</option>';
      });
      html += '</select>';
      html += '<button class="kf-btn ' + (agrupar ? 'kf-btn-primario' : 'kf-btn-gris') + '" id="kf-inv-agrupar" type="button" style="flex:0 0 auto;white-space:nowrap;">' + (agrupar ? '📂 Agrupado' : '📄 Plano') + '</button>';
      html += '</div>';

      // Lista
      html += '<div id="kf-inv-lista"></div>';

      cont.innerHTML = html;

      // Enlazar eventos
      document.getElementById('kf-inv-add').addEventListener('click', function () { abrirFormulario(null); });
      document.getElementById('kf-inv-cats').addEventListener('click', abrirGestorCategorias);

      var buscador = document.getElementById('kf-inv-buscar');
      buscador.addEventListener('input', function (e) {
        busqueda = e.target.value || '';
        pintarLista();
      });

      document.getElementById('kf-inv-filtro-cat').addEventListener('change', function (e) {
        filtroCategoria = e.target.value;
        pintarLista();
      });

      document.getElementById('kf-inv-agrupar').addEventListener('click', function () {
        agrupar = !agrupar;
        pintar();
      });

      pintarLista();
    }

    // ---------- Lista de productos ----------
    function pintarLista() {
      var lista = document.getElementById('kf-inv-lista');
      if (!lista) return;

      var productos = leerProductos();

      // Filtro de busqueda
      var filtro = busqueda.trim().toLowerCase();
      if (filtro) {
        productos = productos.filter(function (p) {
          return (p.nombre || '').toLowerCase().indexOf(filtro) !== -1;
        });
      }

      // Filtro de categoria
      if (filtroCategoria) {
        if (filtroCategoria === '__sin__') {
          productos = productos.filter(function (p) { return !p.categoria; });
        } else {
          productos = productos.filter(function (p) {
            return (p.categoria || '') === filtroCategoria;
          });
        }
      }

      // Orden alfabetico
      productos.sort(function (a, b) {
        return (a.nombre || '').localeCompare(b.nombre || '');
      });

      // Vacio
      if (!productos.length) {
        lista.innerHTML = '<div class="kf-vacio">' +
          '<span class="kf-vacio-icono">📦</span>' +
          (busqueda || filtroCategoria
            ? 'Ningún producto coincide con el filtro.'
            : 'Aún no has añadido productos.') +
          '</div>';
        return;
      }

      // Render
      var html = '';
      if (agrupar) {
        // Agrupar por categoria
        var grupos = {};
        productos.forEach(function (p) {
          var c = p.categoria || 'Sin categoría';
          if (!grupos[c]) grupos[c] = [];
          grupos[c].push(p);
        });
        // Ordenar categorias: las que tienen productos primero, alfabeticas
        var nombresGrupo = Object.keys(grupos).sort(function (a, b) {
          if (a === 'Sin categoría') return 1;
          if (b === 'Sin categoría') return -1;
          return a.localeCompare(b);
        });
        nombresGrupo.forEach(function (cat) {
          var prods = grupos[cat];
          var totalCat = prods.reduce(function (s, p) {
            return s + KF.num(p.costo) * KF.num(p.stock);
          }, 0);
          html += '<div class="kf-card-titulo" style="margin:14px 2px 8px 2px;color:var(--azul-medio);">';
          html += '🏷️ ' + KF.esc(cat) + ' <span style="font-weight:400;color:#7b8a9a;font-size:12px;">(' + prods.length + ' · ' + KF.dinero(totalCat) + ')</span>';
          html += '</div>';
          prods.forEach(function (p) { html += itemHTML(p); });
        });
      } else {
        productos.forEach(function (p) { html += itemHTML(p); });
      }

      lista.innerHTML = html;

      // Enlazar botones editar / eliminar
      var botones = lista.querySelectorAll('button[data-accion]');
      for (var i = 0; i < botones.length; i++) {
        botones[i].addEventListener('click', function (e) {
          var accion = e.currentTarget.getAttribute('data-accion');
          var id = e.currentTarget.getAttribute('data-id');
          if (accion === 'editar')   abrirFormulario(id);
          if (accion === 'eliminar') confirmarEliminar(id);
        });
      }
    }

    // ---------- HTML de un item de producto ----------
    function itemHTML(p) {
      var c = KF.num(p.costo), pr = KF.num(p.precio), st = KF.num(p.stock);
      var minimo = KF.num(p.stockMinimo);
      var ganancia = pr - c;
      var margen = pr > 0 ? (ganancia / pr * 100) : 0;
      var bajo = st <= minimo;
      var cat = p.categoria || 'Sin categoría';

      var html = '';
      html += '<div class="kf-item' + (bajo ? ' stock-bajo' : '') + '">';
      html += '<div class="kf-item-cab">';
      html += '<div class="kf-item-nombre">' + KF.esc(p.nombre) + '</div>';
      html += bajo ? '<span class="kf-badge kf-badge-rojo">Stock bajo</span>'
                   : '<span class="kf-badge kf-badge-verde">OK</span>';
      html += '</div>';

      html += '<div style="margin-bottom:6px;"><span class="kf-badge kf-badge-dorado">🏷️ ' + KF.esc(cat) + '</span></div>';

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
      return html;
    }

    // ---------- Formulario añadir / editar ----------
    function abrirFormulario(id) {
      var productos = leerProductos();
      var p = id ? productos.find(function (x) { return x.id === id; }) : null;
      var esEdicion = !!p;

      var datos = p || {
        nombre: '', costo: '', precio: '', stock: '',
        stockMinimo: KF.num(KF.config.stockBajoDefault) || 5,
        unidad: 'u', categoria: '', notas: ''
      };

      // Selector de categorias
      var cats = KF.categoriasLista();
      var opcionesCat = '<option value="">— Sin categoría —</option>';
      cats.forEach(function (c) {
        opcionesCat += '<option value="' + KF.esc(c) + '"' +
          (datos.categoria === c ? ' selected' : '') + '>' + KF.esc(c) + '</option>';
      });

      var contenido = '';
      contenido += '<div class="kf-campo"><label>Nombre del producto</label><input type="text" id="f-nombre" value="' + KF.esc(datos.nombre) + '" placeholder="Ej: Arroz"></div>';
      contenido += '<div class="kf-campo"><label>Categoría</label><select id="f-categoria">' + opcionesCat + '</select></div>';
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
            categoria: document.getElementById('f-categoria').value || '',
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

    // ---------- Gestor de categorias ----------
    function abrirGestorCategorias() {
      var cats = KF.categoriasLista();
      var conteo = KF.categoriasConteo();

      var html = '';
      html += '<div style="font-size:13px;color:#46566a;margin-bottom:10px;">Añade, renombra o elimina categorías. Al eliminar una categoría, los productos que la usen quedarán como "Sin categoría".</div>';

      // Lista de categorias existentes
      if (!cats.length) {
        html += '<div class="kf-vacio">No hay categorías. Añade una abajo.</div>';
      } else {
        cats.forEach(function (c) {
          var n = conteo[c] || 0;
          html += '<div class="kf-item" style="padding:10px;">';
          html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
          html += '<div>';
          html += '<div style="font-weight:700;color:var(--azul-medio);">🏷️ ' + KF.esc(c) + '</div>';
          html += '<div style="font-size:12px;color:#7b8a9a;">' + n + ' producto' + (n !== 1 ? 's' : '') + '</div>';
          html += '</div>';
          html += '<div style="display:flex;gap:6px;">';
          html += '<button class="kf-btn kf-btn-gris kf-btn-chico" data-accion="renombrar" data-cat="' + KF.esc(c) + '">Renombrar</button>';
          html += '<button class="kf-btn kf-btn-rojo kf-btn-chico" data-accion="eliminar" data-cat="' + KF.esc(c) + '">Eliminar</button>';
          html += '</div>';
          html += '</div></div>';
        });
      }

      // Formulario añadir
      html += '<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--gris-borde);">';
      html += '<div class="kf-campo"><label>Nueva categoría</label><input type="text" id="kf-cat-nueva" placeholder="Ej: Congelados"></div>';
      html += '<button class="kf-btn kf-btn-dorado kf-btn-bloque" id="kf-cat-add" type="button">+ Añadir categoría</button>';
      html += '</div>';

      KF.abrirModal({
        titulo: '🏷️ Gestionar categorías',
        contenido: html,
        alGuardar: null
      });

      // Enlazar botones
      var btns = document.querySelectorAll('#kf-modal-cuerpo button[data-accion]');
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', function (e) {
          var acc = e.currentTarget.getAttribute('data-accion');
          var cat = e.currentTarget.getAttribute('data-cat');
          if (acc === 'renombrar') renombrarCategoria(cat);
          if (acc === 'eliminar')  confirmarEliminarCategoria(cat);
        });
      }

      var addBtn = document.getElementById('kf-cat-add');
      if (addBtn) addBtn.addEventListener('click', function () {
        var inp = document.getElementById('kf-cat-nueva');
        var n = inp.value.trim();
        if (!n) { KF.aviso('Escribe un nombre', 'error'); return; }
        if (KF.categoriasAgregar(n)) {
          KF.aviso('Categoría añadida', 'ok');
          abrirGestorCategorias(); // refrescar
        } else {
          KF.aviso('Esa categoría ya existe', 'error');
        }
      });
    }

    // Renombrar una categoria (y actualizar productos que la usan)
    function renombrarCategoria(vieja) {
      KF.cerrarModal();
      var contenido = '';
      contenido += '<div class="kf-campo"><label>Nuevo nombre para "' + KF.esc(vieja) + '"</label><input type="text" id="kf-cat-nuevo" value="' + KF.esc(vieja) + '"></div>';

      KF.abrirModal({
        titulo: 'Renombrar categoría',
        contenido: contenido,
        textoGuardar: 'Renombrar',
        alGuardar: function () {
          var nuevo = document.getElementById('kf-cat-nuevo').value.trim();
          if (!nuevo) { KF.aviso('Escribe un nombre', 'error'); return; }
          if (nuevo.toLowerCase() === vieja.toLowerCase()) {
            KF.cerrarModal();
            abrirGestorCategorias();
            return;
          }

          // Actualizar lista de categorias
          var lista = KF.categoriasLista().map(function (c) {
            return c === vieja ? nuevo : c;
          });
          KF.categoriasGuardar(lista);

          // Actualizar productos que tenian la categoria vieja
          var productos = leerProductos();
          productos.forEach(function (p) {
            if (p.categoria === vieja) p.categoria = nuevo;
          });
          guardarProductos(productos);

          KF.cerrarModal();
          KF.aviso('Categoría renombrada', 'ok');
          abrirGestorCategorias();
          pintar();
        }
      });

      setTimeout(function () {
        var el = document.getElementById('kf-cat-nuevo');
        if (el) { el.focus(); el.select(); }
      }, 100);
    }

    // Confirmar eliminacion de categoria
    function confirmarEliminarCategoria(cat) {
      var conteo = KF.categoriasConteo();
      var n = conteo[cat] || 0;
      var msg = n > 0
        ? '¿Eliminar la categoría "' + cat + '"? Hay ' + n + ' producto' + (n !== 1 ? 's' : '') + ' que la usan y quedarán como "Sin categoría".'
        : '¿Eliminar la categoría "' + cat + '"?';

      KF.confirmar(msg, function () {
        KF.categoriasEliminar(cat);
        KF.aviso('Categoría eliminada', 'ok');
        abrirGestorCategorias();
        pintar();
      });
    }

    // ---------- Arrancar ----------
    pintar();
  }
});