/* =====================================================
   Modulo: Capital
   - Subcuentas (aportantes / dueños)
   - Aporte: entrada a Efectivo
   - Retiro: salida de Efectivo
   - Vista por subcuenta con neto, aportes y retiros
   - Gestion de aportantes: crear, renombrar, borrar
   ===================================================== */

KF.registrarModulo({
  id: 'capital',
  nombre: 'Capital',
  icono: '🏦',
  orden: 10,
  render: function (cont) {

    var MODULO = 'capital';
    var SUBCUENTAS_KEY = 'cap-subcuentas'; // guardado por negocio

    function leerMovs() { return KF.leer(MODULO, []); }
    function guardarMovs(l) { KF.escribir(MODULO, l); }

    // ---------- Subcuentas (aportantes) ----------
    function leerSubcuentas() {
      var lista = KF.leer(SUBCUENTAS_KEY, []);
      if (!Array.isArray(lista)) return [];
      var vistas = {};
      var limpia = [];
      lista.forEach(function (s) {
        var n = String(s || '').trim();
        if (!n) return;
        var k = n.toLowerCase();
        if (vistas[k]) return;
        vistas[k] = true;
        limpia.push(n);
      });
      return limpia;
    }
    function guardarSubcuentas(l) {
      var vistas = {};
      var limpia = [];
      (l || []).forEach(function (s) {
        var n = String(s || '').trim();
        if (!n) return;
        var k = n.toLowerCase();
        if (vistas[k]) return;
        vistas[k] = true;
        limpia.push(n);
      });
      limpia.sort(function (a, b) { return a.localeCompare(b); });
      KF.escribir(SUBCUENTAS_KEY, limpia);
      return limpia;
    }

    // Nombre visible de una subcuenta (vacia = "Sin asignar")
    function nombreSub(s) {
      var n = String(s || '').trim();
      return n || 'Sin asignar';
    }

    // ---------- Utilidades acumuladas (lee de otros modulos) ----------
    function calcularUtilidadesAcumuladas() {
      var ventas   = KF.leer('ventas', []);
      var gastos   = KF.leer('gastos', []);
      var ingresos = KF.leer('ingresos', []);

      var gananciaVentas = 0;
      ventas.forEach(function (v) { gananciaVentas += KF.num(v.ganancia); });

      var totalGastos = 0;
      gastos.forEach(function (g) { totalGastos += KF.num(g.monto); });

      var totalIngresos = 0;
      ingresos.forEach(function (i) { totalIngresos += KF.num(i.monto); });

      return gananciaVentas + totalIngresos - totalGastos;
    }

    // ---------- Agrupar movimientos por subcuenta ----------
    function agruparPorSubcuenta(movs) {
      var grupos = {};
      movs.forEach(function (m) {
        var s = nombreSub(m.subcuenta);
        if (!grupos[s]) grupos[s] = { nombre: s, aportes: 0, retiros: 0, movs: [] };
        if (m.tipo === 'aporte') grupos[s].aportes += KF.num(m.monto);
        else                     grupos[s].retiros += KF.num(m.monto);
        grupos[s].movs.push(m);
      });
      return grupos;
    }

    // ---------- Interfaz principal ----------
    function pintar() {
      var movs = leerMovs();

      var aportes = 0, retiros = 0;
      movs.forEach(function (m) {
        if (m.tipo === 'aporte') aportes += KF.num(m.monto);
        else                     retiros += KF.num(m.monto);
      });
      var netoAportado = aportes - retiros;
      var utilidades = calcularUtilidadesAcumuladas();
      var capitalTotal = netoAportado + utilidades;

      var grupos = agruparPorSubcuenta(movs);

      var html = '';
      html += '<div class="kf-titulo-modulo">🏦 Capital</div>';
      html += '<div class="kf-subtitulo">Aportes y retiros por aportante</div>';

      // Tarjeta grande
      html += '<div class="kf-card" style="text-align:center;">';
      html += '<div class="lbl" style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#7b8a9a;">Capital total del negocio</div>';
      html += '<div style="font-size:30px;font-weight:800;color:' + (capitalTotal >= 0 ? 'var(--verde)' : 'var(--rojo)') + ';margin-top:6px;">' + KF.dinero(capitalTotal) + '</div>';
      html += '<div style="font-size:12px;color:#7b8a9a;margin-top:4px;">Aportado neto: ' + KF.dinero(netoAportado) + ' · Utilidades: ' + KF.dinero(utilidades) + '</div>';
      html += '</div>';

      html += '<div class="kf-grid-resumen">';
      html += '<div class="kf-mini-card positivo"><div class="lbl">Aportes</div><div class="val">' + KF.dinero(aportes) + '</div></div>';
      html += '<div class="kf-mini-card negativo"><div class="lbl">Retiros</div><div class="val">' + KF.dinero(retiros) + '</div></div>';
      html += '</div>';

      // Botones principales
      html += '<div class="kf-fila" style="margin-bottom:8px;">';
      html += '<button class="kf-btn kf-btn-verde" id="kf-cap-ap" type="button">+ Aporte</button>';
      html += '<button class="kf-btn kf-btn-rojo" id="kf-cap-re" type="button">- Retiro</button>';
      html += '</div>';
      html += '<button class="kf-btn kf-btn-gris kf-btn-bloque" id="kf-cap-sub" type="button" style="margin-bottom:12px;">👤 Gestionar aportantes</button>';

      // Resumen por subcuenta
      var nombresSub = Object.keys(grupos).sort(function (a, b) {
        if (a === 'Sin asignar') return 1;
        if (b === 'Sin asignar') return -1;
        return a.localeCompare(b);
      });

      if (nombresSub.length) {
        html += '<div class="kf-card-titulo" style="margin:8px 2px 8px 2px;">Aportantes</div>';
        nombresSub.forEach(function (s) {
          var g = grupos[s];
          var neto = g.aportes - g.retiros;
          html += '<div class="kf-card">';
          html += '<div class="kf-card-titulo" style="color:var(--azul-medio);">';
          html += '<span>👤 ' + KF.esc(s) + '</span>';
          html += '<span style="font-size:14px;">' + KF.dinero(neto) + '</span>';
          html += '</div>';
          html += '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">';
          html += '<span>Aportes:</span><b style="color:var(--verde);">' + KF.dinero(g.aportes) + '</b>';
          html += '</div>';
          html += '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;">';
          html += '<span>Retiros:</span><b style="color:var(--rojo);">' + KF.dinero(g.retiros) + '</b>';
          html += '</div>';
          html += '</div>';
        });
      }

      html += '<div class="kf-card-titulo" style="margin:12px 2px 8px 2px;">Historial de movimientos</div>';
      html += '<div id="kf-cap-lista"></div>';

      cont.innerHTML = html;

      document.getElementById('kf-cap-ap').addEventListener('click', function () { abrirForm('aporte'); });
      document.getElementById('kf-cap-re').addEventListener('click', function () { abrirForm('retiro'); });
      document.getElementById('kf-cap-sub').addEventListener('click', abrirGestorSubcuentas);

      pintarLista(movs);
    }

    // ---------- Lista de movimientos ----------
    function pintarLista(movs) {
      var cont = document.getElementById('kf-cap-lista');
      if (!cont) return;

      if (!movs.length) {
        cont.innerHTML = '<div class="kf-vacio"><span class="kf-vacio-icono">🏦</span>Aún no hay aportes ni retiros registrados.</div>';
        return;
      }

      movs = movs.slice().sort(function (a, b) {
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      });

      var html = '';
      movs.forEach(function (m) {
        var esAporte = m.tipo === 'aporte';
        var color = esAporte ? 'var(--verde)' : 'var(--rojo)';
        var signo = esAporte ? '+' : '-';
        var sub = nombreSub(m.subcuenta);
        html += '<div class="kf-item" style="border-left-color:' + color + ';">';
        html += '<div class="kf-item-cab">';
        html += '<div class="kf-item-nombre">' + KF.esc(m.concepto || (esAporte ? 'Aporte' : 'Retiro')) + '</div>';
        html += '<div style="font-weight:800;color:' + color + ';white-space:nowrap;">' + signo + ' ' + KF.dinero(m.monto) + '</div>';
        html += '</div>';
        html += '<div style="margin-bottom:6px;"><span class="kf-badge kf-badge-dorado" style="font-size:10px;">👤 ' + KF.esc(sub) + '</span></div>';
        html += '<div class="kf-item-datos">';
        html += '<div style="grid-column:1/-1;color:#7b8a9a;font-size:12px;">' + formatearFecha(m.fecha) + '</div>';
        html += '</div>';
        html += '<div class="kf-item-acciones">';
        html += '<button class="kf-btn kf-btn-gris kf-btn-chico" data-accion="editar" data-id="' + m.id + '">Editar</button>';
        html += '<button class="kf-btn kf-btn-rojo kf-btn-chico" data-accion="eliminar" data-id="' + m.id + '">Eliminar</button>';
        html += '</div></div>';
      });
      cont.innerHTML = html;

      var btns = cont.querySelectorAll('button[data-accion]');
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', function (e) {
          var acc = e.currentTarget.getAttribute('data-accion');
          var id = e.currentTarget.getAttribute('data-id');
          if (acc === 'editar')   abrirForm(null, id);
          if (acc === 'eliminar') eliminar(id);
        });
      }
    }

    function formatearFecha(iso) {
      var d = new Date(iso);
      return String(d.getDate()).padStart(2, '0') + '/' +
             String(d.getMonth() + 1).padStart(2, '0') + '/' +
             d.getFullYear() + ' ' +
             String(d.getHours()).padStart(2, '0') + ':' +
             String(d.getMinutes()).padStart(2, '0');
    }

    // ---------- Formulario aporte / retiro ----------
    function abrirForm(tipo, idEdit) {
      var mov = idEdit ? leerMovs().find(function (x) { return x.id === idEdit; }) : null;
      var esEdicion = !!mov;
      if (esEdicion) tipo = mov.tipo;
      var esAporte = tipo === 'aporte';

      // Lista de subcuentas
      var subs = leerSubcuentas();
      // Si el movimiento tenía una subcuenta que ya no existe, la reincorporamos para no perderla
      if (mov && mov.subcuenta && subs.indexOf(mov.subcuenta) === -1) {
        subs.push(mov.subcuenta);
      }

      var opcionesSub = '';
      var esSinAsignar = !mov || !mov.subcuenta;
      opcionesSub += '<option value=""' + (esSinAsignar ? ' selected' : '') + '>— Sin asignar —</option>';
      subs.forEach(function (s) {
        opcionesSub += '<option value="' + KF.esc(s) + '"' +
          (mov && mov.subcuenta === s ? ' selected' : '') + '>' + KF.esc(s) + '</option>';
      });
      opcionesSub += '<option value="__nueva__">➕ Nueva subcuenta</option>';

      var datos = mov || { monto: '', concepto: '' };

      var contenido = '';
      contenido += '<div class="kf-campo"><label>Subcuenta / Aportante</label><select id="cap-sub">' + opcionesSub + '</select></div>';
      contenido += '<div class="kf-campo" id="cap-sub-nueva-wrap" style="display:none;"><label>Nombre de la nueva subcuenta</label><input type="text" id="cap-sub-nueva" placeholder="Ej: Juan Pérez"></div>';
      contenido += '<div class="kf-campo"><label>Monto</label><input type="number" step="0.01" inputmode="decimal" id="cap-monto" value="' + KF.esc(datos.monto) + '"></div>';
      contenido += '<div class="kf-campo"><label>Concepto (opcional)</label><input type="text" id="cap-concepto" value="' + KF.esc(datos.concepto || '') + '" placeholder="' + (esAporte ? 'Aporte inicial' : 'Retiro personal') + '"></div>';

      KF.abrirModal({
        titulo: esEdicion
          ? ('Editar ' + (esAporte ? 'aporte' : 'retiro'))
          : (esAporte ? 'Registrar aporte' : 'Registrar retiro'),
        contenido: contenido,
        textoGuardar: esEdicion ? 'Guardar cambios' : 'Guardar',
        alGuardar: function () {
          if (KF.diaCerrado(KF.hoy())) {
            KF.aviso('El día ya está cerrado. No se pueden registrar movimientos de capital.', 'error');
            return;
          }
          var monto = KF.num(document.getElementById('cap-monto').value);
          var concepto = document.getElementById('cap-concepto').value.trim();
          var selSub = document.getElementById('cap-sub');
          var nuevaSub = document.getElementById('cap-sub-nueva')
            ? document.getElementById('cap-sub-nueva').value.trim()
            : '';
          var subcuenta = selSub.value;

          if (monto <= 0) { KF.aviso('Monto inválido', 'error'); return; }

          // Subcuenta nueva
          if (subcuenta === '__nueva__') {
            if (!nuevaSub) { KF.aviso('Escribe el nombre de la nueva subcuenta', 'error'); return; }
            var lista = leerSubcuentas();
            var existe = lista.some(function (s) {
              return s.toLowerCase() === nuevaSub.toLowerCase();
            });
            if (!existe) {
              lista.push(nuevaSub);
              guardarSubcuentas(lista);
            }
            subcuenta = nuevaSub;
          }

          var movs = leerMovs();

          // ---------- EDICION ----------
          if (esEdicion) {
            // Revertir el efecto anterior en Efectivo
            var efAnt = KF.leer('efectivo', []).filter(function (x) {
              return !(x.referencia === 'capital' && x.refId === mov.id);
            });
            KF.escribir('efectivo', efAnt);

            var idx = movs.findIndex(function (x) { return x.id === mov.id; });
            movs[idx] = {
              id: mov.id,
              fecha: mov.fecha,
              tipo: tipo,
              monto: monto,
              concepto: concepto || (esAporte ? 'Aporte' : 'Retiro'),
              subcuenta: subcuenta
            };
            guardarMovs(movs);

            // Aplicar efecto nuevo
            var efNew = KF.leer('efectivo', []);
            efNew.push({
              id: KF.id(),
              fecha: mov.fecha,
              tipo: esAporte ? 'ingreso' : 'egreso',
              monto: monto,
              concepto: 'Capital (' + (subcuenta || 'Sin asignar') + '): ' +
                        (concepto || (esAporte ? 'Aporte' : 'Retiro')),
              referencia: 'capital',
              refId: mov.id
            });
            KF.escribir('efectivo', efNew);

            KF.cerrarModal();
            KF.aviso('Movimiento actualizado', 'ok');
            pintar();
            return;
          }

          // ---------- NUEVO ----------
          movs.push({
            id: KF.id(),
            fecha: KF.ahora(),
            tipo: tipo,
            monto: monto,
            concepto: concepto || (esAporte ? 'Aporte' : 'Retiro'),
            subcuenta: subcuenta || ''
          });
          guardarMovs(movs);

          var ef = KF.leer('efectivo', []);
          ef.push({
            id: KF.id(),
            fecha: KF.ahora(),
            tipo: esAporte ? 'ingreso' : 'egreso',
            monto: monto,
            concepto: 'Capital (' + (subcuenta || 'Sin asignar') + '): ' +
                      (concepto || (esAporte ? 'Aporte' : 'Retiro')),
            referencia: 'capital',
            refId: movs[movs.length - 1].id
          });
          KF.escribir('efectivo', ef);

          KF.cerrarModal();
          KF.aviso(esAporte ? 'Aporte registrado' : 'Retiro registrado', 'ok');
          pintar();
        }
      });

      // Mostrar/ocultar campo "nueva subcuenta"
      var selSub = document.getElementById('cap-sub');
      var wrapNueva = document.getElementById('cap-sub-nueva-wrap');
      selSub.addEventListener('change', function () {
        wrapNueva.style.display = selSub.value === '__nueva__' ? 'block' : 'none';
      });

      setTimeout(function () {
        var el = document.getElementById('cap-monto');
        if (el) el.focus();
      }, 100);
    }

    // ---------- Eliminar movimiento ----------
    function eliminar(id) {
      var m = leerMovs().find(function (x) { return x.id === id; });
      if (!m) return;
      KF.confirmar('¿Eliminar este movimiento? También se revertirá en Efectivo.', function () {
        var lista = leerMovs().filter(function (x) { return x.id !== id; });
        guardarMovs(lista);
        var ef = KF.leer('efectivo', []).filter(function (x) {
          return !(x.referencia === 'capital' && x.refId === id);
        });
        KF.escribir('efectivo', ef);
        KF.aviso('Movimiento eliminado', 'ok');
        pintar();
      });
    }

    // ---------- Gestor de subcuentas ----------
    function abrirGestorSubcuentas() {
      var subs = leerSubcuentas();
      var movs = leerMovs();

      // Conteo por subcuenta
      var conteo = {};
      movs.forEach(function (m) {
        var s = nombreSub(m.subcuenta);
        conteo[s] = (conteo[s] || 0) + 1;
      });

      var html = '';
      html += '<div style="font-size:13px;color:#46566a;margin-bottom:10px;">Añade, renombra o elimina aportantes. Al eliminar una subcuenta, sus movimientos quedarán como "Sin asignar".</div>';

      if (!subs.length) {
        html += '<div class="kf-vacio">No hay subcuentas. Añade una abajo.</div>';
      } else {
        subs.forEach(function (s) {
          var n = conteo[s] || 0;
          html += '<div class="kf-item" style="padding:10px;">';
          html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
          html += '<div>';
          html += '<div style="font-weight:700;color:var(--azul-medio);">👤 ' + KF.esc(s) + '</div>';
          html += '<div style="font-size:12px;color:#7b8a9a;">' + n + ' movimiento' + (n !== 1 ? 's' : '') + '</div>';
          html += '</div>';
          html += '<div style="display:flex;gap:6px;">';
          html += '<button class="kf-btn kf-btn-gris kf-btn-chico" data-accion="renombrar" data-sub="' + KF.esc(s) + '">Renombrar</button>';
          html += '<button class="kf-btn kf-btn-rojo kf-btn-chico" data-accion="eliminar" data-sub="' + KF.esc(s) + '">Eliminar</button>';
          html += '</div>';
          html += '</div></div>';
        });
      }

      html += '<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--gris-borde);">';
      html += '<div class="kf-campo"><label>Nueva subcuenta / aportante</label><input type="text" id="cap-sub-nueva2" placeholder="Ej: Juan Pérez"></div>';
      html += '<button class="kf-btn kf-btn-dorado kf-btn-bloque" id="cap-sub-add" type="button">+ Añadir subcuenta</button>';
      html += '</div>';

      KF.abrirModal({
        titulo: '👤 Gestionar aportantes',
        contenido: html,
        alGuardar: null
      });

      var btns = document.querySelectorAll('#kf-modal-cuerpo button[data-accion]');
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', function (e) {
          var acc = e.currentTarget.getAttribute('data-accion');
          var sub = e.currentTarget.getAttribute('data-sub');
          if (acc === 'renombrar') renombrarSubcuenta(sub);
          if (acc === 'eliminar')  confirmarEliminarSubcuenta(sub);
        });
      }

      var addBtn = document.getElementById('cap-sub-add');
      if (addBtn) addBtn.addEventListener('click', function () {
        var inp = document.getElementById('cap-sub-nueva2');
        var n = inp.value.trim();
        if (!n) { KF.aviso('Escribe un nombre', 'error'); return; }
        var lista = leerSubcuentas();
        var existe = lista.some(function (s) {
          return s.toLowerCase() === n.toLowerCase();
        });
        if (existe) { KF.aviso('Esa subcuenta ya existe', 'error'); return; }
        lista.push(n);
        guardarSubcuentas(lista);
        KF.aviso('Subcuenta añadida', 'ok');
        abrirGestorSubcuentas();
      });
    }

    function renombrarSubcuenta(vieja) {
      KF.cerrarModal();
      var contenido = '';
      contenido += '<div class="kf-campo"><label>Nuevo nombre para "' + KF.esc(vieja) + '"</label><input type="text" id="cap-sub-renom" value="' + KF.esc(vieja) + '"></div>';

      KF.abrirModal({
        titulo: 'Renombrar subcuenta',
        contenido: contenido,
        textoGuardar: 'Renombrar',
        alGuardar: function () {
          var nuevo = document.getElementById('cap-sub-renom').value.trim();
          if (!nuevo) { KF.aviso('Escribe un nombre', 'error'); return; }
          if (nuevo.toLowerCase() === vieja.toLowerCase()) {
            KF.cerrarModal();
            abrirGestorSubcuentas();
            return;
          }

          // Actualizar lista
          var lista = leerSubcuentas().map(function (s) {
            return s === vieja ? nuevo : s;
          });
          guardarSubcuentas(lista);

          // Actualizar movimientos que tenían la subcuenta vieja
          var movs = leerMovs();
          movs.forEach(function (m) {
            if (m.subcuenta === vieja) m.subcuenta = nuevo;
          });
          guardarMovs(movs);

          KF.cerrarModal();
          KF.aviso('Subcuenta renombrada', 'ok');
          abrirGestorSubcuentas();
          pintar();
        }
      });

      setTimeout(function () {
        var el = document.getElementById('cap-sub-renom');
        if (el) { el.focus(); el.select(); }
      }, 100);
    }

    function confirmarEliminarSubcuenta(sub) {
      var movs = leerMovs();
      var n = movs.filter(function (m) { return m.subcuenta === sub; }).length;
      var msg = n > 0
        ? '¿Eliminar la subcuenta "' + sub + '"? Sus ' + n + ' movimiento' + (n !== 1 ? 's' : '') + ' quedarán como "Sin asignar".'
        : '¿Eliminar la subcuenta "' + sub + '"?';

      KF.confirmar(msg, function () {
        // Quitar de la lista
        var lista = leerSubcuentas().filter(function (s) { return s !== sub; });
        guardarSubcuentas(lista);

        // Los movimientos con esa subcuenta quedan sin asignar
        var movs2 = leerMovs();
        movs2.forEach(function (m) {
          if (m.subcuenta === sub) m.subcuenta = '';
        });
        guardarMovs(movs2);

        KF.aviso('Subcuenta eliminada', 'ok');
        abrirGestorSubcuentas();
        pintar();
      });
    }

    pintar();
  }
});