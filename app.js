/* =====================================================
   KontaFin - Nucleo de la aplicacion
   Aqui vive:
   - Estado global
   - Almacenamiento en localStorage (con prefijo por negocio)
   - Registro de modulos
   - Navegacion
   - Utilidades (formato, IDs, avisos, modal)
   ===================================================== */

var KF = {

  /* -------- Version -------- */
  version: '0.1.0',

  /* -------- Estado en memoria -------- */
  config: null,
  negocioActivo: null,
  modulos: [],          // modulos registrados
  moduloActivo: null,

  /* -------- Clave raiz de configuracion -------- */
  CLAVE_CONFIG: 'kf_config',

  /* =====================================================
     UTILIDADES GENERALES
     ===================================================== */

  // Genera un id unico corto
  id: function () {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  },

  // Fecha de hoy en formato AAAA-MM-DD
  hoy: function () {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  },

  // Marca de tiempo ISO
  ahora: function () {
    return new Date().toISOString();
  },

  // Convierte a numero seguro (admite decimales)
  num: function (v) {
    var x = parseFloat(v);
    return isNaN(x) ? 0 : x;
  },

  // Formatea un numero como dinero con la moneda del negocio
  dinero: function (n) {
    var x = KF.num(n);
    var moneda = (KF.negocioActivo && KF.negocioActivo.moneda) || 'CUP';
    return x.toFixed(2) + ' ' + moneda;
  },

  // Escapa texto para insertar en HTML sin romperlo
  esc: function (t) {
    if (t === null || t === undefined) return '';
    return String(t)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /* =====================================================
     CONFIGURACION Y NEGOCIOS
     ===================================================== */

  cargarConfig: function () {
    var raw = localStorage.getItem(KF.CLAVE_CONFIG);
    if (raw) {
      try { KF.config = JSON.parse(raw); } catch (e) { KF.config = null; }
    }
    // Si no hay configuracion valida, crear una por defecto
    if (!KF.config || !KF.config.negocios || !KF.config.negocios.length) {
      KF.config = {
        version: 1,
        negocioActivoId: 'neg1',
        negocios: [{
          id: 'neg1',
          nombre: 'Mi Negocio',
          moneda: 'CUP',
          creado: KF.ahora()
        }],
        telegram: { activo: false, token: '', chatId: '' },
        stockBajoDefault: 5,
        licencia: null
      };
      KF.guardarConfig();
    }
    // Establecer negocio activo
    KF.negocioActivo = KF.config.negocios.find(function (n) {
      return n.id === KF.config.negocioActivoId;
    }) || KF.config.negocios[0];
    KF.config.negocioActivoId = KF.negocioActivo.id;
  },

  guardarConfig: function () {
    localStorage.setItem(KF.CLAVE_CONFIG, JSON.stringify(KF.config));
  },

  /* =====================================================
     ALMACENAMIENTO POR NEGOCIO Y MODULO
     Cada negocio tiene sus propios datos: kf_<negId>_<modulo>
     ===================================================== */

  claveDatos: function (modulo) {
    return 'kf_' + KF.negocioActivo.id + '_' + modulo;
  },

  leer: function (modulo, porDefecto) {
    var raw = localStorage.getItem(KF.claveDatos(modulo));
    if (!raw) return porDefecto === undefined ? [] : porDefecto;
    try { return JSON.parse(raw); }
    catch (e) { return porDefecto === undefined ? [] : porDefecto; }
  },

  escribir: function (modulo, datos) {
    localStorage.setItem(KF.claveDatos(modulo), JSON.stringify(datos));
  },

  /* =====================================================
     REGISTRO DE MODULOS
     Un modulo se registra con: id, nombre, icono, orden, render
     ===================================================== */

  registrarModulo: function (mod) {
    // Evitar duplicados
    var existe = KF.modulos.some(function (m) { return m.id === mod.id; });
    if (existe) return;
    KF.modulos.push(mod);
  },

  moduloPorId: function (id) {
    return KF.modulos.find(function (m) { return m.id === id; });
  },

  /* =====================================================
     NAVEGACION
     ===================================================== */

  irA: function (id) {
    var mod = KF.moduloPorId(id);
    if (!mod) { KF.aviso('Modulo no encontrado: ' + id, 'error'); return; }
    KF.moduloActivo = id;

    var cont = document.getElementById('kf-contenido');
    cont.innerHTML = '';
    cont.scrollTop = 0;

    try {
      mod.render(cont);
    } catch (e) {
      cont.innerHTML = '<div class="kf-card">Error al cargar el modulo: ' +
        KF.esc(e.message) + '</div>';
    }

    // Marcar item activo en el menu
    var items = document.querySelectorAll('.kf-menu-item');
    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      if (el.getAttribute('data-modulo') === id) el.classList.add('activo');
      else el.classList.remove('activo');
    }

    KF.cerrarMenu();
  },

  pintarMenu: function () {
    var lista = document.getElementById('kf-menu-lista');
    lista.innerHTML = '';
    // Ordenar por campo orden
    var ordenados = KF.modulos.slice().sort(function (a, b) {
      return (a.orden || 99) - (b.orden || 99);
    });
    ordenados.forEach(function (m) {
      var li = document.createElement('li');
      li.className = 'kf-menu-item';
      li.setAttribute('data-modulo', m.id);
      li.innerHTML =
        '<span class="kf-menu-icono">' + (m.icono || '•') + '</span>' +
        '<span>' + KF.esc(m.nombre) + '</span>';
      li.addEventListener('click', function () { KF.irA(m.id); });
      lista.appendChild(li);
    });
  },

  abrirMenu: function () {
    document.getElementById('kf-menu').classList.add('abierto');
    document.getElementById('kf-menu-fondo').classList.add('visible');
  },

  cerrarMenu: function () {
    document.getElementById('kf-menu').classList.remove('abierto');
    document.getElementById('kf-menu-fondo').classList.remove('visible');
  },

  actualizarNombreNegocio: function () {
    var el = document.getElementById('kf-negocio-nombre');
    if (el && KF.negocioActivo) el.textContent = KF.negocioActivo.nombre;
  },

  /* =====================================================
     AVISO FLOTANTE (TOAST)
     ===================================================== */

  _toastTimer: null,

  aviso: function (mensaje, tipo) {
    var t = document.getElementById('kf-toast');
    if (!t) return;
    t.textContent = mensaje;
    t.className = 'kf-toast visible kf-toast-' + (tipo || 'info');
    clearTimeout(KF._toastTimer);
    KF._toastTimer = setTimeout(function () {
      t.classList.remove('visible');
    }, 2400);
  },

  /* =====================================================
     MODAL GENERICO
     abrirModal({
       titulo: 'texto',
       contenido: 'html del cuerpo',
       textoGuardar: 'Guardar',         // opcional
       alGuardar: function(){ ... }      // opcional
     })
     ===================================================== */

  _alGuardar: null,

  abrirModal: function (op) {
    document.getElementById('kf-modal-titulo').textContent = op.titulo || '';
    document.getElementById('kf-modal-cuerpo').innerHTML = op.contenido || '';
    document.getElementById('kf-modal-guardar').textContent = op.textoGuardar || 'Guardar';
    // Mostrar u ocultar boton guardar segun callback
    document.getElementById('kf-modal-guardar').style.display = op.alGuardar ? 'inline-flex' : 'none';
    KF._alGuardar = op.alGuardar || null;

    document.getElementById('kf-modal').classList.add('visible');
    document.getElementById('kf-modal-fondo').classList.add('visible');
  },

  cerrarModal: function () {
    document.getElementById('kf-modal').classList.remove('visible');
    document.getElementById('kf-modal-fondo').classList.remove('visible');
    KF._alGuardar = null;
  },

  /* =====================================================
     CONFIRMACION SIMPLE
     ===================================================== */

  confirmar: function (mensaje, alConfirmar) {
    KF.abrirModal({
      titulo: 'Confirmar',
      contenido: '<p style="font-size:15px;padding:4px 0;">' + KF.esc(mensaje) + '</p>',
      textoGuardar: 'Sí, continuar',
      alGuardar: function () {
        KF.cerrarModal();
        if (typeof alConfirmar === 'function') alConfirmar();
      }
    });
  },

  /* =====================================================
     INICIO
     ===================================================== */

  iniciar: function () {
    KF.cargarConfig();
    KF.actualizarNombreNegocio();
    KF.pintarMenu();

    // Enlazar controles de cabecera y menu
    document.getElementById('kf-btn-menu').addEventListener('click', KF.abrirMenu);
    document.getElementById('kf-menu-fondo').addEventListener('click', KF.cerrarMenu);

    // Enlazar controles del modal
    document.getElementById('kf-modal-cerrar').addEventListener('click', KF.cerrarModal);
    document.getElementById('kf-modal-cancelar').addEventListener('click', KF.cerrarModal);
    document.getElementById('kf-modal-fondo').addEventListener('click', KF.cerrarModal);
    document.getElementById('kf-modal-guardar').addEventListener('click', function () {
      if (typeof KF._alGuardar === 'function') KF._alGuardar();
    });

    // Boton de negocio (por ahora solo muestra el nombre activo)
    document.getElementById('kf-btn-negocio').addEventListener('click', function () {
      KF.aviso('Cambio de negocio: proximamente', 'info');
    });

    // Ir al modulo de inicio si existe
    if (KF.moduloPorId('inicio')) KF.irA('inicio');
  }

};

/* Arrancar cuando el DOM este listo */
document.addEventListener('DOMContentLoaded', function () { KF.iniciar(); });