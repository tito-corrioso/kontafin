/* =====================================================
   Modulo: Configuracion
   - Datos del negocio actual (nombre, moneda)
   - Multi-negocio (crear, cambiar, eliminar)
   - Preferencias (umbral stock por defecto)
   - Exportar / Importar todos los datos (JSON)
   - Licencia (campo guardado, sin validar todavia)
   - Telegram (token + chatId, guardados, sin enviar todavia)
   - Borrar datos del negocio actual
   ===================================================== */

KF.registrarModulo({
  id: 'configuracion',
  nombre: 'Configuración',
  icono: '⚙️',
  orden: 16,
  render: function (cont) {

    var MONEDAS = ['CUP', 'MLC', 'USD', 'EUR', 'OTRA'];

    function pintar() {
      var c = KF.config;
      var neg = KF.negocioActivo;

      var html = '';
      html += '<div class="kf-titulo-modulo">⚙️ Configuración</div>';
      html += '<div class="kf-subtitulo">Ajustes generales de KontaFin</div>';

      // ---- Negocio actual ----
      html += '<div class="kf-card">';
      html += '<div class="kf-card-titulo">Negocio actual</div>';
      html += '<div class="kf-campo"><label>Nombre</label><input type="text" id="cfg-nombre" value="' + KF.esc(neg.nombre) + '"></div>';

      var opsMon = MONEDAS.map(function (m) {
        return '<option value="' + m + '"' + (neg.moneda === m ? ' selected' : '') + '>' + m + '</option>';
      }).join('');
      html += '<div class="kf-campo"><label>Moneda</label><select id="cfg-moneda">' + opsMon + '</select></div>';
      html += '<button class="kf-btn kf-btn-primario kf-btn-bloque" id="cfg-guardar-neg" type="button">Guardar cambios</button>';
      html += '</div>';

      // ---- Preferencias ----
      html += '<div class="kf-card">';
      html += '<div class="kf-card-titulo">Preferencias</div>';
      html += '<div class="kf-campo"><label>Umbral de stock bajo por defecto</label><input type="number" step="1" inputmode="numeric" id="cfg-stock" value="' + (c.stockBajoDefault || 5) + '"></div>';
      html += '<button class="kf-btn kf-btn-primario kf-btn-bloque" id="cfg-guardar-pref" type="button">Guardar preferencias</button>';
      html += '</div>';

      // ---- Multi-negocio ----
      html += '<div class="kf-card">';
      html += '<div class="kf-card-titulo">Negocios <span>' + c.negocios.length + '</span></div>';
      c.negocios.forEach(function (n) {
        var activo = n.id === neg.id;
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--gris-borde);">';
        html += '<div>';
        html += '<div style="font-weight:600;color:var(--azul-medio);">' + KF.esc(n.nombre) + (activo ? ' <span class="kf-badge kf-badge-verde">Activo</span>' : '') + '</div>';
        html += '<div style="font-size:12px;color:#7b8a9a;">' + KF.esc(n.moneda) + '</div>';
        html += '</div>';
        html += '<div style="display:flex;gap:6px;">';
        if (!activo) {
          html += '<button class="kf-btn kf-btn-primario kf-btn-chico" data-accion="cambiar" data-id="' + n.id + '">Usar</button>';
        }
        if (c.negocios.length > 1) {
          html += '<button class="kf-btn kf-btn-rojo kf-btn-chico" data-accion="borrar-neg" data-id="' + n.id + '">Borrar</button>';
        }
        html += '</div>';
        html += '</div>';
      });
      html += '<button class="kf-btn kf-btn-dorado kf-btn-bloque" id="cfg-nuevo-neg" type="button" style="margin-top:10px;">+ Añadir negocio</button>';
      html += '</div>';

      // ---- Exportar / Importar ----
      html += '<div class="kf-card">';
      html += '<div class="kf-card-titulo">Datos y respaldo</div>';
      if (c.ultimoRespaldo) {
        html += '<div style="font-size:12px;color:#7b8a9a;margin-bottom:8px;">Último respaldo: ' + fechaLarga(new Date(c.ultimoRespaldo)) + '</div>';
      } else {
        html += '<div style="font-size:12px;color:#7b8a9a;margin-bottom:8px;">Aún no has hecho respaldo.</div>';
      }
      html += '<button class="kf-btn kf-btn-verde kf-btn-bloque" id="cfg-export" type="button" style="margin-bottom:8px;">💾 Exportar todo (JSON)</button>';
      html += '<button class="kf-btn kf-btn-primario kf-btn-bloque" id="cfg-import" type="button">📥 Importar desde JSON</button>';
      html += '</div>';

      // ---- Licencia ----
      html += '<div class="kf-card">';
      html += '<div class="kf-card-titulo">Licencia</div>';
      var lic = c.licencia || {};
      html += '<div class="kf-campo"><label>Teléfono</label><input type="tel" id="cfg-lic-tel" value="' + KF.esc(lic.telefono || '') + '" placeholder="Ej: 55555555"></div>';
      html += '<div class="kf-campo"><label>Código de licencia</label><input type="text" id="cfg-lic-cod" value="' + KF.esc(lic.codigo || '') + '" placeholder="Introduce tu código"></div>';
      html += '<button class="kf-btn kf-btn-primario kf-btn-bloque" id="cfg-guardar-lic" type="button">Guardar licencia</button>';
      html += '<div style="font-size:12px;color:#7b8a9a;margin-top:8px;">La validación se añadirá en una próxima versión.</div>';
      html += '</div>';

      // ---- Telegram ----
      html += '<div class="kf-card">';
      html += '<div class="kf-card-titulo">Telegram (opcional)</div>';
      var tg = c.telegram || {};
      html += '<div class="kf-campo"><label>Token del bot</label><input type="text" id="cfg-tg-token" value="' + KF.esc(tg.token || '') + '" placeholder="123456:ABC-DEF..."></div>';
      html += '<div class="kf-campo"><label>Chat ID</label><input type="text" id="cfg-tg-chat" value="' + KF.esc(tg.chatId || '') + '" placeholder="Ej: 987654321"></div>';
      html += '<div class="kf-campo"><label>Activo</label><select id="cfg-tg-activo">';
      html += '<option value="0"' + (tg.activo ? '' : ' selected') + '>No</option>';
      html += '<option value="1"' + (tg.activo ? ' selected' : '') + '>Sí</option>';
      html += '</select></div>';
      html += '<button class="kf-btn kf-btn-primario kf-btn-bloque" id="cfg-guardar-tg" type="button">Guardar Telegram</button>';
      html += '<div style="font-size:12px;color:#7b8a9a;margin-top:8px;">El envío se activará cuando se instale el módulo de panel.</div>';
      html += '</div>';

      // ---- Zona peligrosa ----
      html += '<div class="kf-card" style="border:1px solid var(--rojo);background:var(--rojo-claro);">';
      html += '<div class="kf-card-titulo" style="color:var(--rojo);">Zona peligrosa</div>';
      html += '<div style="font-size:13px;color:#46566a;margin-bottom:10px;">Esta acción borra todos los datos del negocio activo. No se puede deshacer.</div>';
      html += '<button class="kf-btn kf-btn-rojo kf-btn-bloque" id="cfg-borrar" type="button">Borrar datos del negocio actual</button>';
      html += '</div>';

      html += '<div style="text-align:center;color:#9aa7b4;font-size:12px;margin-top:16px;">KontaFin v' + KF.version + ' · OSTICOR</div>';

      cont.innerHTML = html;

      // ---- Enlazar eventos ----
      document.getElementById('cfg-guardar-neg').addEventListener('click', guardarNegocio);
      document.getElementById('cfg-guardar-pref').addEventListener('click', guardarPref);
      document.getElementById('cfg-nuevo-neg').addEventListener('click', nuevoNegocio);
      document.getElementById('cfg-export').addEventListener('click', exportarTodo);
      document.getElementById('cfg-import').addEventListener('click', importarTodo);
      document.getElementById('cfg-guardar-lic').addEventListener('click', guardarLicencia);
      document.getElementById('cfg-guardar-tg').addEventListener('click', guardarTelegram);
      document.getElementById('cfg-borrar').addEventListener('click', borrarNegocioActual);

      var btns = cont.querySelectorAll('button[data-accion]');
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', function (e) {
          var acc = e.currentTarget.getAttribute('data-accion');
          var id = e.currentTarget.getAttribute('data-id');
          if (acc === 'cambiar') cambiarNegocio(id);
          if (acc === 'borrar-neg') borrarNegocio(id);
        });
      }
    }

    function fechaLarga(d) {
      var meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
      return d.getDate() + ' ' + meses[d.getMonth()] + ' ' + d.getFullYear() + ' ' +
             String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    }

    // ---- Guardar negocio ----
    function guardarNegocio() {
      var nombre = document.getElementById('cfg-nombre').value.trim();
      var moneda = document.getElementById('cfg-moneda').value;
      if (!nombre) { KF.aviso('Escribe el nombre del negocio', 'error'); return; }
      KF.negocioActivo.nombre = nombre;
      KF.negocioActivo.moneda = moneda;
      KF.guardarConfig();
      KF.actualizarNombreNegocio();
      KF.aviso('Datos guardados', 'ok');
      pintar();
    }

    // ---- Guardar preferencias ----
    function guardarPref() {
      var stock = KF.num(document.getElementById('cfg-stock').value);
      if (stock < 0) stock = 0;
      KF.config.stockBajoDefault = stock;
      KF.guardarConfig();
      KF.aviso('Preferencias guardadas', 'ok');
    }

    // ---- Multi-negocio ----
    function nuevoNegocio() {
      var contenido = '';
      contenido += '<div class="kf-campo"><label>Nombre del negocio</label><input type="text" id="nn-nombre" placeholder="Ej: Bodega La Esquina"></div>';
      contenido += '<div class="kf-campo"><label>Moneda</label><select id="nn-moneda">';
      MONEDAS.forEach(function (m) { contenido += '<option value="' + m + '">' + m + '</option>'; });
      contenido += '</select></div>';

      KF.abrirModal({
        titulo: 'Añadir negocio',
        contenido: contenido,
        textoGuardar: 'Crear',
        alGuardar: function () {
          var nombre = document.getElementById('nn-nombre').value.trim();
          var moneda = document.getElementById('nn-moneda').value;
          if (!nombre) { KF.aviso('Escribe un nombre', 'error'); return; }
          var id = 'neg' + KF.id();
          KF.config.negocios.push({ id: id, nombre: nombre, moneda: moneda, creado: KF.ahora() });
          KF.config.negocioActivoId = id;
          KF.guardarConfig();
          KF.negocioActivo = KF.config.negocios.find(function (n) { return n.id === id; });
          KF.actualizarNombreNegocio();
          KF.cerrarModal();
          KF.aviso('Negocio creado y activado', 'ok');
          KF.irA('inicio');
        }
      });
      setTimeout(function () { var el = document.getElementById('nn-nombre'); if (el) el.focus(); }, 100);
    }

    function cambiarNegocio(id) {
      KF.config.negocioActivoId = id;
      KF.guardarConfig();
      KF.negocioActivo = KF.config.negocios.find(function (n) { return n.id === id; });
      KF.actualizarNombreNegocio();
      KF.aviso('Negocio cambiado a ' + KF.negocioActivo.nombre, 'ok');
      KF.irA('inicio');
    }

    function borrarNegocio(id) {
      var n = KF.config.negocios.find(function (x) { return x.id === id; });
      if (!n) return;
      KF.confirmar('¿Eliminar el negocio "' + n.nombre + '" y TODOS sus datos? No se puede deshacer.', function () {
        // Borrar claves de localStorage del negocio
        var prefijo = 'kf_' + id + '_';
        var borrar = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k.indexOf(prefijo) === 0) borrar.push(k);
        }
        borrar.forEach(function (k) { localStorage.removeItem(k); });

        KF.config.negocios = KF.config.negocios.filter(function (x) { return x.id !== id; });
        if (KF.config.negocioActivoId === id) {
          KF.config.negocioActivoId = KF.config.negocios[0].id;
          KF.negocioActivo = KF.config.negocios[0];
          KF.actualizarNombreNegocio();
        }
        KF.guardarConfig();
        KF.aviso('Negocio eliminado', 'ok');
        KF.irA('inicio');
      });
    }

    // ---- Exportar / Importar ----
    function exportarTodo() {
      var datos = {};
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k.indexOf('kf_') === 0) {
          datos[k] = localStorage.getItem(k);
        }
      }
      var json = JSON.stringify({ app: 'KontaFin', version: KF.version, fecha: KF.ahora(), datos: datos }, null, 2);

      // Registrar fecha de respaldo
      KF.config.ultimoRespaldo = KF.ahora();
      KF.guardarConfig();

      var nombre = 'KontaFin-respaldo-' + KF.hoy() + '.json';
      var ok = descargarBlob(nombre, json, 'application/json');
      if (ok) {
        KF.aviso('Respaldo descargado', 'ok');
        pintar();
      } else {
        KF.aviso('No se pudo descargar', 'error');
      }
    }

    function descargarBlob(nombre, contenido, tipoMime) {
      try {
        var blob = new Blob([contenido], { type: tipoMime });
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
      } catch (e) { return false; }
    }

    function importarTodo() {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
          try {
            var data = JSON.parse(ev.target.result);
            if (!data || !data.datos) { KF.aviso('Archivo no válido', 'error'); return; }

            KF.confirmar('¿Reemplazar TODOS los datos actuales con los del archivo? Esto borra lo que tienes ahora.', function () {
              // Borrar todo lo actual con prefijo kf_
              var borrar = [];
              for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (k.indexOf('kf_') === 0) borrar.push(k);
              }
              borrar.forEach(function (k) { localStorage.removeItem(k); });

              // Cargar los del archivo
              Object.keys(data.datos).forEach(function (k) {
                localStorage.setItem(k, data.datos[k]);
              });

              KF.aviso('Datos importados. Recargando...', 'ok');
              setTimeout(function () { location.reload(); }, 900);
            });
          } catch (err) {
            KF.aviso('Error al leer el archivo: ' + err.message, 'error');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    }

    // ---- Licencia ----
    function guardarLicencia() {
      var tel = document.getElementById('cfg-lic-tel').value.trim();
      var cod = document.getElementById('cfg-lic-cod').value.trim();
      KF.config.licencia = { telefono: tel, codigo: cod, actualizado: KF.ahora() };
      KF.guardarConfig();
      KF.aviso('Licencia guardada', 'ok');
    }

    // ---- Telegram ----
    function guardarTelegram() {
      var token = document.getElementById('cfg-tg-token').value.trim();
      var chatId = document.getElementById('cfg-tg-chat').value.trim();
      var activo = document.getElementById('cfg-tg-activo').value === '1';
      KF.config.telegram = { token: token, chatId: chatId, activo: activo };
      KF.guardarConfig();
      KF.aviso('Configuración de Telegram guardada', 'ok');
    }

    // ---- Borrar negocio actual ----
    function borrarNegocioActual() {
      if (KF.config.negocios.length <= 1) {
        KF.aviso('No puedes borrar el único negocio. Crea otro primero.', 'error');
        return;
      }
      borrarNegocio(KF.negocioActivo.id);
    }

    pintar();
  }
});