/* =====================================================
   Sincronizacion manual por archivo
   - Exporta/importa Ventas, Compras e Inventario
   - Perfil del dispositivo (nombre + cargo)
   - Fusion por ID: nunca duplica
   - Aplica todos los efectos colaterales
     (Efectivo, Cuentas por Cobrar/Pagar, stock)
   - Marca los importados con "importado: true"
   - Movimientos en Efectivo llevan origenNombre
   - Rechaza operaciones cuyo producto no cuadre
   - Codigo ES5 (compatible con WebViews viejos)
   ===================================================== */

/* =====================================================
   PERFIL DEL DISPOSITIVO
   ===================================================== */
KF.perfilActual = function () {
  var p = (KF.config && KF.config.perfil) || {};
  return {
    nombre: p.nombre || '',
    cargo:  p.cargo  || '',
    negocio: KF.negocioActivo ? KF.negocioActivo.nombre : ''
  };
};

KF.nombreArchivoSeguro = function (s) {
  return String(s || '').replace(/[^a-zA-Z0-9_\-]/g, '').substring(0, 20);
};

/* =====================================================
   UTILIDADES DE ARCHIVO
   ===================================================== */
KF.descargarJSON = function (nombre, objeto) {
  try {
    var json = JSON.stringify(objeto, null, 2);
    var blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
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
};

KF.leerArchivoJSON = function (callback) {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      try {
        callback(null, JSON.parse(ev.target.result));
      } catch (err) {
        callback(err, null);
      }
    };
    reader.readAsText(file);
  };
  input.click();
};

function nombreArchivoSync(modulo, perfil) {
  return 'KontaFin-' + modulo + '-' +
         KF.nombreArchivoSeguro(perfil.nombre) + '-' +
         KF.hoy() + '.json';
}

/* =====================================================
   EXPORTAR INVENTARIO
   ===================================================== */
KF.syncExportarInventario = function () {
  var productos = KF.leer('inventario', []);
  if (!productos.length) {
    KF.aviso('No hay productos en el inventario para exportar', 'error');
    return;
  }
  var perfil = KF.perfilActual();
  if (!perfil.nombre) {
    KF.aviso('Configura tu perfil en Configuración antes de exportar', 'error');
    return;
  }

  var paquete = {
    app: 'KontaFin',
    modulo: 'inventario',
    versionFormato: 1,
    fecha: KF.ahora(),
    emisor: {
      nombre: perfil.nombre,
      cargo: perfil.cargo || '(sin cargo)',
      negocio: perfil.negocio
    },
    cantidad: productos.length,
    datos: productos
  };

  if (KF.descargarJSON(nombreArchivoSync('inventario', perfil), paquete)) {
    KF.aviso('Inventario exportado (' + productos.length + ' productos)', 'ok');
  } else {
    KF.aviso('No se pudo exportar', 'error');
  }
};

/* =====================================================
   IMPORTAR INVENTARIO
   ===================================================== */
KF.syncImportarInventario = function () {
  KF.leerArchivoJSON(function (err, paquete) {
    if (err) { KF.aviso('Archivo no válido: ' + err.message, 'error'); return; }
    if (!paquete || paquete.modulo !== 'inventario' || !Array.isArray(paquete.datos)) {
      KF.aviso('El archivo no es un export de Inventario de KontaFin', 'error');
      return;
    }

    var emisor = paquete.emisor || {};
    var texto = (emisor.nombre || 'otro dispositivo') +
                (emisor.cargo ? ' · ' + emisor.cargo : '');

    KF.confirmar(
      'Importar ' + paquete.datos.length + ' productos desde: ' + texto + '?\n\n' +
      'Los productos nuevos se añadirán. Los existentes actualizarán nombre, costo y precio, y su stock se sumará.',
      function () { ejecutarImportacionInventario(paquete.datos, emisor); }
    );
  });
};

function ejecutarImportacionInventario(entrantes, emisor) {
  var productos = KF.leer('inventario', []);
  var mapa = {};
  productos.forEach(function (p, i) { mapa[p.id] = i; });

  var nuevos = 0, actualizados = 0;

  entrantes.forEach(function (ent) {
    if (!ent.id || !ent.nombre) return;

    if (mapa[ent.id] !== undefined) {
      var idx = mapa[ent.id];
      productos[idx].nombre      = ent.nombre;
      productos[idx].costo       = KF.num(ent.costo);
      productos[idx].precio      = KF.num(ent.precio);
      productos[idx].unidad      = ent.unidad || 'u';
      productos[idx].categoria   = ent.categoria || '';
      productos[idx].stockMinimo = KF.num(ent.stockMinimo);
      productos[idx].stock       = KF.num(productos[idx].stock) + KF.num(ent.stock);
      productos[idx].importado   = true;
      productos[idx].origenNombre = emisor.nombre || '';
      productos[idx].origenCargo  = emisor.cargo || '';
      productos[idx].importadoEn  = KF.ahora();
      productos[idx].actualizado  = KF.ahora();
      actualizados++;
    } else {
      var nuevo = {
        id: ent.id,
        nombre: ent.nombre,
        costo: KF.num(ent.costo),
        precio: KF.num(ent.precio),
        stock: KF.num(ent.stock),
        stockMinimo: KF.num(ent.stockMinimo),
        unidad: ent.unidad || 'u',
        categoria: ent.categoria || '',
        notas: ent.notas || '',
        creado: ent.creado || KF.ahora(),
        actualizado: KF.ahora(),
        importado: true,
        origenNombre: emisor.nombre || '',
        origenCargo: emisor.cargo || '',
        importadoEn: KF.ahora()
      };
      productos.push(nuevo);
      nuevos++;
    }
  });

  KF.escribir('inventario', productos);

  mostrarResumenSimple(
    'Inventario importado',
    emisor,
    [
      ['✅ Nuevos', nuevos],
      ['🔄 Actualizados', actualizados]
    ]
  );
}

/* =====================================================
   EXPORTAR VENTAS
   ===================================================== */
KF.syncExportarVentas = function () {
  var ventas = KF.leer('ventas', []);
  if (!ventas.length) {
    KF.aviso('No hay ventas para exportar', 'error');
    return;
  }
  var perfil = KF.perfilActual();
  if (!perfil.nombre) {
    KF.aviso('Configura tu perfil en Configuración antes de exportar', 'error');
    return;
  }

  var paquete = {
    app: 'KontaFin',
    modulo: 'ventas',
    versionFormato: 1,
    fecha: KF.ahora(),
    emisor: {
      nombre: perfil.nombre,
      cargo: perfil.cargo || '(sin cargo)',
      negocio: perfil.negocio
    },
    cantidad: ventas.length,
    datos: ventas
  };

  if (KF.descargarJSON(nombreArchivoSync('ventas', perfil), paquete)) {
    KF.aviso('Ventas exportadas (' + ventas.length + ')', 'ok');
  } else {
    KF.aviso('No se pudo exportar', 'error');
  }
};

/* =====================================================
   IMPORTAR VENTAS
   ===================================================== */
KF.syncImportarVentas = function () {
  KF.leerArchivoJSON(function (err, paquete) {
    if (err) { KF.aviso('Archivo no válido: ' + err.message, 'error'); return; }
    if (!paquete || paquete.modulo !== 'ventas' || !Array.isArray(paquete.datos)) {
      KF.aviso('El archivo no es un export de Ventas de KontaFin', 'error');
      return;
    }
    var emisor = paquete.emisor || {};
    var texto = (emisor.nombre || 'otro dispositivo') +
                (emisor.cargo ? ' · ' + emisor.cargo : '');

    KF.confirmar(
      'Importar ' + paquete.datos.length + ' ventas desde: ' + texto + '?\n\n' +
      'Se aplicarán los cambios en Inventario, Efectivo y Cuentas por Cobrar. ' +
      'Los pedidos cuyos productos no existan o no tengan stock suficiente serán rechazados completos.',
      function () { ejecutarImportacionVentas(paquete.datos, emisor); }
    );
  });
};

function ejecutarImportacionVentas(entrantes, emisor) {
  var ventasLocales = KF.leer('ventas', []);
  var idsVentas = {};
  ventasLocales.forEach(function (v) { idsVentas[v.id] = true; });

  var grupos = {};
  var orden = [];
  entrantes.forEach(function (v) {
    var key = v.pedidoId || ('solo_' + v.id);
    if (!grupos[key]) { grupos[key] = []; orden.push(key); }
    grupos[key].push(v);
  });

  orden.sort(function (a, b) {
    var fa = new Date(grupos[a][0].fecha).getTime();
    var fb = new Date(grupos[b][0].fecha).getTime();
    return fa - fb;
  });

  var productos = KF.leer('inventario', []);
  var mapaProd = {};
  productos.forEach(function (p, i) { mapaProd[p.id] = i; });

  var importadas = 0;
  var duplicadas = 0;
  var rechazadasGrupos = [];

  var nuevasVentas = [];
  var movEfectivo = [];
  var movCxC = [];

  orden.forEach(function (key) {
    var items = grupos[key];

    var todosExisten = items.every(function (v) { return !!idsVentas[v.id]; });
    if (todosExisten) {
      duplicadas += items.length;
      return;
    }

    var algunosExisten = items.some(function (v) { return !!idsVentas[v.id]; });
    if (algunosExisten) {
      rechazadasGrupos.push({
        items: items,
        motivo: 'Pedido parcialmente importado antes (estado inconsistente)'
      });
      return;
    }

    var falta = null;
    for (var i = 0; i < items.length; i++) {
      var v = items[i];
      var idxP = mapaProd[v.productoId];
      if (idxP === undefined) {
        falta = { item: v, motivo: 'Producto no existe en tu inventario' };
        break;
      }
      if (KF.num(productos[idxP].stock) < KF.num(v.cantidad)) {
        falta = {
          item: v,
          motivo: 'Stock insuficiente de "' + v.productoNombre + '" (disponible: ' +
                  KF.num(productos[idxP].stock) + ', requiere: ' + KF.num(v.cantidad) + ')'
        };
        break;
      }
    }

    if (falta) {
      rechazadasGrupos.push({ items: items, motivo: falta.motivo });
      return;
    }

    var consumo = {};
    items.forEach(function (v) {
      consumo[v.productoId] = (consumo[v.productoId] || 0) + KF.num(v.cantidad);
    });
    var insuf = null;
    Object.keys(consumo).forEach(function (pid) {
      if (insuf) return;
      var idxP = mapaProd[pid];
      if (KF.num(productos[idxP].stock) < consumo[pid]) {
        insuf = 'Stock insuficiente acumulado de "' + productos[idxP].nombre + '"';
      }
    });
    if (insuf) {
      rechazadasGrupos.push({ items: items, motivo: insuf });
      return;
    }

    items.forEach(function (v) {
      var idxP = mapaProd[v.productoId];
      productos[idxP].stock = KF.num(productos[idxP].stock) - KF.num(v.cantidad);
      productos[idxP].actualizado = KF.ahora();

      var copia = {};
      Object.keys(v).forEach(function (k) { copia[k] = v[k]; });
      copia.importado = true;
      copia.origenNombre = emisor.nombre || '';
      copia.origenCargo  = emisor.cargo  || '';
      copia.importadoEn  = KF.ahora();
      nuevasVentas.push(copia);
      idsVentas[v.id] = true;
      importadas++;
    });

    var primero = items[0];
    var totalGrupo = 0;
    items.forEach(function (v) { totalGrupo += KF.num(v.total); });

    if (primero.formaPago === 'efectivo') {
      movEfectivo.push({
        id: KF.id(),
        fecha: primero.fecha,
        tipo: 'ingreso',
        monto: totalGrupo,
        concepto: 'Venta importada · ' +
                  (items.length > 1 ? ('Pedido ' + items.length + ' productos') : (primero.productoNombre || '')) +
                  ' (' + (emisor.nombre || 'otro') + ')',
        referencia: 'ventas-importadas',
        refId: primero.pedidoId || primero.id,
        origenNombre: emisor.nombre || ''
      });
    } else {
      var detalle = items.map(function (v) {
        return (v.productoNombre || '?') + ' x' + v.cantidad;
      }).join(', ');
      movCxC.push({
        id: KF.id(),
        fecha: primero.fecha,
        cliente: primero.cliente || '(sin nombre)',
        telefono: primero.telefono || '',
        monto: totalGrupo,
        concepto: 'Venta fiada importada: ' + detalle,
        estado: 'pendiente',
        refVenta: primero.pedidoId || primero.id,
        refImportado: true,
        pagos: []
      });
    }
  });

  if (nuevasVentas.length) {
    KF.escribir('ventas', ventasLocales.concat(nuevasVentas));
  }
  if (importadas > 0) {
    KF.escribir('inventario', productos);
  }
  if (movEfectivo.length) {
    KF.escribir('efectivo', KF.leer('efectivo', []).concat(movEfectivo));
  }
  if (movCxC.length) {
    KF.escribir('cuentas-cobrar', KF.leer('cuentas-cobrar', []).concat(movCxC));
  }

  mostrarResultadoImportacion(emisor, importadas, duplicadas, rechazadasGrupos);
}

/* =====================================================
   EXPORTAR COMPRAS
   ===================================================== */
KF.syncExportarCompras = function () {
  var compras = KF.leer('compras', []);
  if (!compras.length) {
    KF.aviso('No hay compras para exportar', 'error');
    return;
  }
  var perfil = KF.perfilActual();
  if (!perfil.nombre) {
    KF.aviso('Configura tu perfil en Configuración antes de exportar', 'error');
    return;
  }

  var paquete = {
    app: 'KontaFin',
    modulo: 'compras',
    versionFormato: 1,
    fecha: KF.ahora(),
    emisor: {
      nombre: perfil.nombre,
      cargo: perfil.cargo || '(sin cargo)',
      negocio: perfil.negocio
    },
    cantidad: compras.length,
    datos: compras
  };

  if (KF.descargarJSON(nombreArchivoSync('compras', perfil), paquete)) {
    KF.aviso('Compras exportadas (' + compras.length + ')', 'ok');
  } else {
    KF.aviso('No se pudo exportar', 'error');
  }
};

/* =====================================================
   IMPORTAR COMPRAS
   ===================================================== */
KF.syncImportarCompras = function () {
  KF.leerArchivoJSON(function (err, paquete) {
    if (err) { KF.aviso('Archivo no válido: ' + err.message, 'error'); return; }
    if (!paquete || paquete.modulo !== 'compras' || !Array.isArray(paquete.datos)) {
      KF.aviso('El archivo no es un export de Compras de KontaFin', 'error');
      return;
    }
    var emisor = paquete.emisor || {};
    var texto = (emisor.nombre || 'otro dispositivo') +
                (emisor.cargo ? ' · ' + emisor.cargo : '');

    KF.confirmar(
      'Importar ' + paquete.datos.length + ' compras desde: ' + texto + '?\n\n' +
      'Se aplicarán los cambios en Inventario, Efectivo y Cuentas por Pagar. ' +
      'Las compras cuyos productos no existan serán rechazadas.',
      function () { ejecutarImportacionCompras(paquete.datos, emisor); }
    );
  });
};

function ejecutarImportacionCompras(entrantes, emisor) {
  var comprasLocales = KF.leer('compras', []);
  var idsExistentes = {};
  comprasLocales.forEach(function (c) { idsExistentes[c.id] = true; });

  var productos = KF.leer('inventario', []);
  var mapaProd = {};
  productos.forEach(function (p, i) { mapaProd[p.id] = i; });

  var listaOrden = entrantes.slice().sort(function (a, b) {
    return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
  });

  var importadas = 0;
  var duplicadas = 0;
  var rechazadas = [];

  var nuevasCompras = [];
  var movEfectivo = [];
  var movCxP = [];

  listaOrden.forEach(function (c) {
    if (idsExistentes[c.id]) { duplicadas++; return; }

    var idxP = mapaProd[c.productoId];
    if (idxP === undefined) {
      rechazadas.push({
        producto: c.productoNombre || '(sin nombre)',
        fecha: c.fecha,
        cantidad: c.cantidad,
        motivo: 'Producto no existe en tu inventario'
      });
      return;
    }

    productos[idxP].stock = KF.num(productos[idxP].stock) + KF.num(c.cantidad);
    if (KF.num(c.costoUnitario) > 0) {
      productos[idxP].costo = KF.num(c.costoUnitario);
    }
    productos[idxP].actualizado = KF.ahora();

    var copia = {};
    Object.keys(c).forEach(function (k) { copia[k] = c[k]; });
    copia.importado = true;
    copia.origenNombre = emisor.nombre || '';
    copia.origenCargo  = emisor.cargo  || '';
    copia.importadoEn  = KF.ahora();
    nuevasCompras.push(copia);
    idsExistentes[c.id] = true;
    importadas++;

    if (c.formaPago === 'efectivo') {
      movEfectivo.push({
        id: KF.id(),
        fecha: c.fecha,
        tipo: 'egreso',
        monto: KF.num(c.total),
        concepto: 'Compra importada: ' + (c.productoNombre || '') + ' x' + c.cantidad +
                  ' (' + (emisor.nombre || 'otro') + ')',
        referencia: 'compras-importadas',
        refId: c.id,
        origenNombre: emisor.nombre || ''
      });
    } else {
      movCxP.push({
        id: KF.id(),
        fecha: c.fecha,
        proveedor: c.proveedor || '(sin nombre)',
        telefono: c.telefono || '',
        monto: KF.num(c.total),
        concepto: 'Compra a crédito importada: ' + (c.productoNombre || '') + ' x' + c.cantidad,
        estado: 'pendiente',
        refCompra: c.id,
        refImportado: true,
        pagos: []
      });
    }
  });

  if (nuevasCompras.length) {
    KF.escribir('compras', comprasLocales.concat(nuevasCompras));
  }
  if (importadas > 0) {
    KF.escribir('inventario', productos);
  }
  if (movEfectivo.length) {
    KF.escribir('efectivo', KF.leer('efectivo', []).concat(movEfectivo));
  }
  if (movCxP.length) {
    KF.escribir('cuentas-pagar', KF.leer('cuentas-pagar', []).concat(movCxP));
  }

  mostrarResultadoImportacionSimple(emisor, importadas, duplicadas, rechazadas);
}

/* =====================================================
   RESULTADOS
   ===================================================== */
function mostrarResultadoImportacion(emisor, importadas, duplicadas, rechazadasGrupos) {
  var html = '';
  html += '<div style="font-size:13px;color:var(--gris-texto);line-height:1.6;">';

  if (emisor && emisor.nombre) {
    html += '<div style="background:var(--azul-suave);padding:10px;border-radius:8px;margin-bottom:12px;">';
    html += '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#7b8a9a;">Origen</div>';
    html += '<div style="font-weight:700;color:var(--azul-medio);">' + KF.esc(emisor.nombre) + '</div>';
    if (emisor.cargo) html += '<div style="font-size:12px;color:#7b8a9a;">' + KF.esc(emisor.cargo) + '</div>';
    html += '</div>';
  }

  html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gris-borde);">';
  html += '<span>✅ Importadas</span><b style="color:var(--verde);">' + importadas + '</b></div>';

  html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gris-borde);">';
  html += '<span>⏭️ Ya existían</span><b style="color:#7b8a9a;">' + duplicadas + '</b></div>';

  if (rechazadasGrupos.length) {
    var totalRech = 0;
    rechazadasGrupos.forEach(function (g) { totalRech += g.items.length; });

    html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gris-borde);">';
    html += '<span>❌ Rechazadas</span><b style="color:var(--rojo);">' + totalRech + '</b></div>';

    html += '<div style="font-size:11px;font-weight:700;color:var(--rojo);margin-top:10px;text-transform:uppercase;letter-spacing:0.5px;">Detalle de rechazadas</div>';
    html += '<div style="max-height:240px;overflow-y:auto;margin-top:6px;">';
    rechazadasGrupos.forEach(function (g) {
      var primero = g.items[0];
      var titulo = g.items.length > 1
        ? 'Pedido de ' + g.items.length + ' productos'
        : (primero.productoNombre || '(sin nombre)');
      html += '<div style="background:var(--rojo-claro);border-left:3px solid var(--rojo);padding:8px 10px;border-radius:4px;margin-bottom:6px;font-size:12px;">';
      html += '<b>' + KF.esc(titulo) + '</b><br>';
      html += '<span style="color:#7a3a3a;">' + KF.esc(g.motivo) + '</span>';
      html += '</div>';
    });
    html += '</div>';
  }

  html += '</div>';

  KF.abrirModal({
    titulo: 'Resultado de la importación',
    contenido: html,
    alGuardar: null
  });
}

function mostrarResultadoImportacionSimple(emisor, importadas, duplicadas, rechazadas) {
  var html = '';
  html += '<div style="font-size:13px;color:var(--gris-texto);line-height:1.6;">';

  if (emisor && emisor.nombre) {
    html += '<div style="background:var(--azul-suave);padding:10px;border-radius:8px;margin-bottom:12px;">';
    html += '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#7b8a9a;">Origen</div>';
    html += '<div style="font-weight:700;color:var(--azul-medio);">' + KF.esc(emisor.nombre) + '</div>';
    if (emisor.cargo) html += '<div style="font-size:12px;color:#7b8a9a;">' + KF.esc(emisor.cargo) + '</div>';
    html += '</div>';
  }

  html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gris-borde);">';
  html += '<span>✅ Importadas</span><b style="color:var(--verde);">' + importadas + '</b></div>';

  html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gris-borde);">';
  html += '<span>⏭️ Ya existían</span><b style="color:#7b8a9a;">' + duplicadas + '</b></div>';

  if (rechazadas.length) {
    html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gris-borde);">';
    html += '<span>❌ Rechazadas</span><b style="color:var(--rojo);">' + rechazadas.length + '</b></div>';

    html += '<div style="font-size:11px;font-weight:700;color:var(--rojo);margin-top:10px;text-transform:uppercase;letter-spacing:0.5px;">Detalle de rechazadas</div>';
    html += '<div style="max-height:240px;overflow-y:auto;margin-top:6px;">';
    rechazadas.forEach(function (r) {
      html += '<div style="background:var(--rojo-claro);border-left:3px solid var(--rojo);padding:8px 10px;border-radius:4px;margin-bottom:6px;font-size:12px;">';
      html += '<b>' + KF.esc(r.producto) + '</b> x' + KF.num(r.cantidad) + '<br>';
      html += '<span style="color:#7a3a3a;">' + KF.esc(r.motivo) + '</span>';
      html += '</div>';
    });
    html += '</div>';
  }

  html += '</div>';

  KF.abrirModal({
    titulo: 'Resultado de la importación',
    contenido: html,
    alGuardar: null
  });
}

function mostrarResumenSimple(titulo, emisor, filas) {
  var html = '';
  html += '<div style="font-size:13px;color:var(--gris-texto);line-height:1.6;">';

  if (emisor && emisor.nombre) {
    html += '<div style="background:var(--azul-suave);padding:10px;border-radius:8px;margin-bottom:12px;">';
    html += '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#7b8a9a;">Origen</div>';
    html += '<div style="font-weight:700;color:var(--azul-medio);">' + KF.esc(emisor.nombre) + '</div>';
    if (emisor.cargo) html += '<div style="font-size:12px;color:#7b8a9a;">' + KF.esc(emisor.cargo) + '</div>';
    html += '</div>';
  }

  filas.forEach(function (f) {
    html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gris-borde);">';
    html += '<span>' + f[0] + '</span><b>' + f[1] + '</b></div>';
  });

  html += '</div>';

  KF.abrirModal({
    titulo: titulo,
    contenido: html,
    alGuardar: null
  });
}

/* =====================================================
   BOTONES REUTILIZABLES
   Modulos soportados: 'ventas' | 'inventario' | 'compras'
   ===================================================== */
KF.syncPintarBotones = function (contenedorId, modulo) {
  var cont = document.getElementById(contenedorId);
  if (!cont) return;

  var expId = 'kf-sync-exp-' + modulo;
  var impId = 'kf-sync-imp-' + modulo;

  cont.innerHTML =
    '<button class="kf-btn kf-btn-gris kf-btn-chico" id="' + expId + '" type="button">↗️ Exportar</button>' +
    '<button class="kf-btn kf-btn-gris kf-btn-chico" id="' + impId + '" type="button">↘️ Importar</button>';

  document.getElementById(expId).addEventListener('click', function () {
    if (modulo === 'ventas')     KF.syncExportarVentas();
    if (modulo === 'inventario') KF.syncExportarInventario();
    if (modulo === 'compras')    KF.syncExportarCompras();
  });
  document.getElementById(impId).addEventListener('click', function () {
    if (modulo === 'ventas')     KF.syncImportarVentas();
    if (modulo === 'inventario') KF.syncImportarInventario();
    if (modulo === 'compras')    KF.syncImportarCompras();
  });
};