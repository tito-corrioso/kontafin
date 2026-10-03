/* =====================================================
   Acerca de (About)
   Modulo autocontenido: se inyecta solo en el menu.
   No requiere tocar app.js, estilos.css ni index.html
   (salvo la linea <script src="about.js"></script>).
   ===================================================== */

(function () {

  // ---------- 1) CSS propio (una sola vez) ----------
  function inyectarCSS() {
    if (document.getElementById('kf-about-css')) return;
    var st = document.createElement('style');
    st.id = 'kf-about-css';
    st.textContent = '' +
      '.kf-menu-about{' +
        'background:transparent;' +
        'border:1px solid rgba(242,169,0,0.5);' +
        'color:#f2a900;' +
        'font-family:inherit;' +
        'font-size:11px;' +
        'font-weight:700;' +
        'letter-spacing:0.4px;' +
        'text-transform:uppercase;' +
        'padding:5px 10px;' +
        'border-radius:12px;' +
        'cursor:pointer;' +
        'flex-shrink:0;' +
      '}' +
      '.kf-menu-about:active{background:rgba(242,169,0,0.15);}';
    document.head.appendChild(st);
  }

  // ---------- 2) Insertar el boton en la cabecera del menu ----------
  function insertarBoton() {
    var cabecera = document.querySelector('.kf-menu-cabecera');
    if (!cabecera) return false;
    if (document.getElementById('kf-menu-about')) return true;

    // Envolver el logo+nombre en un div para que el boton quede a la derecha
    var logo = cabecera.querySelector('.kf-logo-mini');
    var nombre = cabecera.querySelector('.kf-nombre-app');
    if (logo && nombre && !cabecera.querySelector('.kf-menu-cabecera-izq')) {
      var izq = document.createElement('div');
      izq.className = 'kf-menu-cabecera-izq';
      izq.style.cssText = 'display:flex;align-items:center;gap:10px;';
      cabecera.insertBefore(izq, logo);
      izq.appendChild(logo);
      izq.appendChild(nombre);
    }

    var btn = document.createElement('button');
    btn.id = 'kf-menu-about';
    btn.type = 'button';
    btn.className = 'kf-menu-about';
    btn.textContent = 'Acerca de';
    btn.addEventListener('click', abrirAbout);
    cabecera.appendChild(btn);
    return true;
  }

  // ---------- 3) Modal About ----------
  function abrirAbout() {
    var html = '';

    // Cabecera con logo
    html += '<div style="text-align:center;padding:10px 0 4px 0;">';
    html += '<div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:16px;background:var(--dorado);color:var(--azul-oscuro);font-size:36px;font-weight:800;margin-bottom:12px;">K</div>';
    html += '<div style="font-size:22px;font-weight:800;color:var(--azul-medio);letter-spacing:0.3px;">KontaFin</div>';
    html += '<div style="font-size:12px;color:#7b8a9a;margin-top:2px;">Asistente de Gestión para Negocios</div>';
    html += '<div style="display:inline-block;margin-top:10px;padding:3px 10px;border-radius:12px;background:var(--azul-suave);color:var(--azul-medio);font-size:11px;font-weight:700;letter-spacing:0.5px;">Versión ' + (KF.version || '—') + '</div>';
    html += '</div>';

    // Separador
    html += '<div style="border-top:1px solid var(--gris-borde);margin:16px 0;"></div>';

    // Autor
    html += '<div style="text-align:center;">';
    html += '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#7b8a9a;">Desarrollada por</div>';
    html += '<div style="font-weight:700;color:var(--azul-medio);font-size:16px;margin-top:4px;">Osmani Tito Corrioso</div>';
    html += '</div>';

    // Aviso
    html += '<div style="background:var(--rojo-claro);border-left:3px solid var(--rojo);padding:10px 12px;border-radius:6px;font-size:12px;color:#5a1a1a;line-height:1.5;margin:16px 0;">';
    html += '⚠️ Esta aplicación no puede ser utilizada ni compartida sin la licencia y la debida autorización del desarrollador.';
    html += '</div>';

    // Pie
    html += '<div style="text-align:center;font-size:12px;color:#7b8a9a;margin-top:6px;">';
    html += '<div style="font-weight:700;color:var(--azul-medio);font-size:13px;">© OSTICOR ' + new Date().getFullYear() + '</div>';
    html += '<div style="margin-top:10px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Contacto</div>';
    html += '<a href="mailto:osmanitito94@zoho.com" style="color:var(--dorado);text-decoration:none;font-weight:600;font-size:13px;">osmanitito94@zoho.com</a>';

    // Enlace a Terminos y Condiciones
    html += '<div style="margin-top:16px;font-size:12px;color:#7b8a9a;line-height:1.5;">';
    html += 'Al utilizar KontaFin aceptas los ';
    html += '<a href="#" id="kf-about-terminos" style="color:var(--dorado);text-decoration:underline;font-weight:600;">Términos y Condiciones</a>';
    html += '</div>';

    html += '</div>';

    KF.abrirModal({
      titulo: 'Acerca de KontaFin',
      contenido: html,
      alGuardar: null
    });
         // Enlazar el enlace de Terminos despues de que el modal se pinte
    setTimeout(function () {
      var enlace = document.getElementById('kf-about-terminos');
      if (enlace) {
        enlace.addEventListener('click', function (e) {
          e.preventDefault();
          KF.abrirTerminos();
        });
      }
    }, 50);
  }

  // ---------- 4) Arranque ----------
  // Esperar a que el DOM y KF esten listos
  function iniciar() {
    inyectarCSS();
    // Intentar insertar ya
    if (insertarBoton()) return;
    // Si aun no existe la cabecera, reintentar un par de veces
    var intentos = 0;
    var t = setInterval(function () {
      intentos++;
      if (insertarBoton() || intentos > 20) clearInterval(t);
    }, 100);
  }

  // KF se inicializa en DOMContentLoaded, asi que arrancamos despues
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(iniciar, 0); });
  } else {
    setTimeout(iniciar, 0);
  }

})();
