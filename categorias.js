/* =====================================================
   Modulo auxiliar: Categorias
   NO es un modulo visible en el menu.
   Provee funciones para que Inventario (y otros modulos)
   usen categorias sin duplicar codigo.

   Se guardan por negocio en: kf_<negId>_categorias
   ===================================================== */

(function () {

  // Categorias por defecto que se crean si el negocio
  // todavia no tiene ninguna guardada.
  var POR_DEFECTO = ['Bebidas', 'Alimentos', 'Limpieza', 'Higiene', 'Otros'];

  // Clave de almacenamiento por negocio
  function clave() {
    return 'kf_' + KF.negocioActivo.id + '_categorias';
  }

  // Devuelve la lista de categorias (strings).
  // Si no existe, la inicializa con las por defecto.
  KF.categoriasLista = function () {
    var raw = localStorage.getItem(clave());
    if (!raw) {
      localStorage.setItem(clave(), JSON.stringify(POR_DEFECTO));
      return POR_DEFECTO.slice();
    }
    try {
      var l = JSON.parse(raw);
      if (!Array.isArray(l)) return POR_DEFECTO.slice();
      return l;
    } catch (e) {
      return POR_DEFECTO.slice();
    }
  };

  // Guarda la lista completa
  KF.categoriasGuardar = function (lista) {
    // Limpieza: quitar vacios, duplicados y ordenar
    var vistas = {};
    var limpia = [];
    (lista || []).forEach(function (c) {
      var n = String(c || '').trim();
      if (!n) return;
      var k = n.toLowerCase();
      if (vistas[k]) return;
      vistas[k] = true;
      limpia.push(n);
    });
    limpia.sort(function (a, b) { return a.localeCompare(b); });
    localStorage.setItem(clave(), JSON.stringify(limpia));
    return limpia;
  };

  // Agrega una categoria si no existe. Devuelve true/false.
  KF.categoriasAgregar = function (nombre) {
    var n = String(nombre || '').trim();
    if (!n) return false;
    var lista = KF.categoriasLista();
    var existe = lista.some(function (c) {
      return c.toLowerCase() === n.toLowerCase();
    });
    if (existe) return false;
    lista.push(n);
    KF.categoriasGuardar(lista);
    return true;
  };

  // Elimina una categoria de la lista.
  // NO toca los productos: quedan como "Sin categoria".
  KF.categoriasEliminar = function (nombre) {
    var n = String(nombre || '').trim().toLowerCase();
    var lista = KF.categoriasLista().filter(function (c) {
      return c.toLowerCase() !== n;
    });
    KF.categoriasGuardar(lista);
  };

  // Cuenta cuantos productos (del modulo inventario) usan cada categoria
  KF.categoriasConteo = function () {
    var productos = KF.leer('inventario', []);
    var conteo = {};
    productos.forEach(function (p) {
      var c = (p.categoria || 'Sin categoría').trim();
      conteo[c] = (conteo[c] || 0) + 1;
    });
    return conteo;
  };

})();