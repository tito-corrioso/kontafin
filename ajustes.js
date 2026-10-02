/* =====================================================
   Modulo: Ajustes (partida doble)
   - Registro manual de ajustes contables
   - Multiples lineas con Cuenta / Subcuenta / Monto / Debe-Haber
   - Validacion: suma Debe = suma Haber
   - Concepto obligatorio, fecha editable
   - Opcional por linea: reflejar en el modulo Efectivo
   - No bloquea por cierre (es justamente para corregir)
   ===================================================== */

KF.registrarModulo({
  id: 'ajustes',
  nombre: 'Ajustes',
  icono: '🔧',
  orden: 9.7,
  render: function (cont) {

    var MODULO = 'ajustes';

    function leerAjustes() { return KF.leer(MODULO, []); }
    function guardarAjustes(l) { KF.escribir(MODULO, l); }

    // ---------- Catalogo de cuentas del sistema ----------
    var CATALOGO = [
      { grupo: 'Activo', cuentas: [
        { id: 'efectivo',   nombre: 'Efectivo en caja' },
        { id: 'inventario', nombre: 'Inventario' },
        { id: 'cxc',        nombre: 'Cuentas por cobrar' }
      ]},
      { grupo: 'Pasivo', cuentas: [
        { id: 'cxp', nombre: 'Cuentas por pagar' }
      ]},
      { grupo: 'Patrimonio', cuentas: [
        { id: 'capital',    nombre: 'Capital' },
        { id: 'resultados', nombre: 'Resultados acumulados' }
      ]},
      { grupo: 'Ingresos', cuentas: [
        { id: 'ventas',         nombre: 'Ventas' },
        { id: 'otros_ingresos', nombre: 'Otros ingresos' }
      ]},
      { grupo: 'Gastos', cuentas: [
        { id: 'costo_ventas', nombre: 'Costo de ventas' },
        { id: 'gastos_op',    nombre: 'Gastos operativos' }
      ]}
    ];

    // Cuentas personalizadas del usuario como cuentas adicionales
    function cuentasPersonalizadas() {
      var l = KF.leer('cuentas-personalizadas', []);
      return (l || []).map(function (c) {
        return { id: 'pers_' + c.id, nombre: c.nombre, tipo: c.tipo || 'otro' };
      });
    }

    // Opciones para el <select> de cuenta
    function opcionesCuentas() {
      var html = '';
      CATALOGO.forEach(function (grupo) {
        html += '<optgroup label="' + KF.esc(grupo.grupo) + '">';
        grupo.cuentas.forEach(function (c) {
          html += '<option value="' + c.id + '">' + KF.esc(c.nombre) + '</option>';
        });
        html += '</optgroup>';
      });

      var pers = cuentasPersonalizadas();
      if (pers.length) {
        var porTipo = {};
        pers.forEach(function (c) {
          if (!porTipo[c.tipo]) porTipo[c.tipo] = [];
          porTipo[c.tipo].push(c);
        });
        var etiq = {
          activo: 'Personalizadas · Activo',
          pasivo: 'Personalizadas · Pasivo',
          patrimonio: 'Personalizadas · Patrimonio',
          ingreso: 'Personalizadas · Ingreso',
          gasto: 'Personalizadas · Gasto',
          otro: 'Personalizadas · Otras'
        };
        Object.keys(porTipo).forEach(function (t) {
          html += '<optgroup label="' + KF.esc(etiq[t] || t) + '">';
          porTipo[t].forEach(function (c) {
            html += '<option value="' + c.id + '">' + KF.esc(c.nombre) + '</option>';
          });
          html += '</optgroup>';
        });
      }
      return html;
    }

    // ---------- Interfaz principal ----------
    function pintar() {
      var ajustes = leerAjustes();
      var total = 0;
      ajustes.forEach(function (a) { total += KF.num(a.totalDebe); });

      var html = '';
      html += '<div class="kf-titulo-modulo">🔧 Ajustes</div>';
      html += '<div class="kf-subtitulo">Correcciones manuales con partida doble (Debe = Haber)</div>';

      html += '<div class="kf-card" style="background:var(--azul-suave);border:1px solid var(--azul-claro);font-size:13px;color:var(--azul-medio);">';
      html += 'Un ajuste permite corregir errores o registrar operaciones especiales sin alterar cierres anteriores. Cada ajuste debe tener al menos dos líneas y la suma del Debe debe ser igual a la del Haber.';
      html += '</div>';

      html += '<div class="kf-grid-resumen">';
      html += '<div class="kf-mini-card acento"><div class="lbl">Ajustes</div><div class="val">' + ajustes.length + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Total movido</div><div class="val">' + KF.dinero(total) + '</div></div>';
      html += '</div>';

      html += '<button class="kf-btn kf-btn-dorado kf-btn-bloque" id="kf-aj-add" type="button" style="margin-bottom:12px;">+ Nuevo ajuste</button>';

      html += '<div id="kf-aj-lista"></div>';
      cont.innerHTML = html;

      document.getElementById('kf-aj-add').addEventListener('click', abrirFormulario);

      pintarLista(ajustes);
    }

    function pintarLista(ajustes) {
      var c = document.getElementById('kf-aj-lista');
      if (!c) return;

      if (!ajustes.length) {
        c.innerHTML = '<div class="kf-vacio"><span class="kf-vacio-icono">🔧</span>Aún no has registrado ajustes.</div>';
        return;
      }

      var lista = ajustes.slice().sort(function (a, b) {
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      });

      var html = '';
      lista.forEach(function (a) {
        html += '<div class="kf-item" style="border-left-color:var(--dorado);">';
        html += '<div class="kf-item-cab">';
        html += '<div class="kf-item-nombre">' + KF.esc(a.concepto) + '</div>';
        html += '<span class="kf-badge kf-badge-dorado">' + KF.dinero(a.totalDebe) + '</span>';
        html += '</div>';
        html += '<div class="kf-item-datos">';
        html += '<div style="grid-column:1/-1;color:#7b8a9a;font-size:12px;">' + fechaHora(a.fecha) + '</div>';
        html += '<div style="grid-column:1/-1;">' + a.lineas.length + ' línea' + (a.lineas.length !== 1 ? 's' : '') + '</div>';
        html += '</div>';
        html += '<div class="kf-item-acciones">';
        html += '<button class="kf-btn kf-btn-primario kf-btn-chico" data-accion="ver" data-id="' + a.id + '">Ver</button>';
        html += '<button class="kf-btn kf-btn-rojo kf-btn-chico" data-accion="eliminar" data-id="' + a.id + '">Eliminar</button>';
        html += '</div></div>';
      });
      c.innerHTML = html;

      var btns = c.querySelectorAll('button[data-accion]');
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', function (e) {
          var acc = e.currentTarget.getAttribute('data-accion');
          var id = e.currentTarget.getAttribute('data-id');
          if (acc === 'ver')      verAjuste(id);
          if (acc === 'eliminar') eliminarAjuste(id);
        });
      }
    }

    function fechaHora(iso) {
      var d = new Date(iso);
      return String(d.getDate()).padStart(2,'0') + '/' +
             String(d.getMonth()+1).padStart(2,'0') + '/' +
             d.getFullYear() + ' ' +
             String(d.getHours()).padStart(2,'0') + ':' +
             String(d.getMinutes()).padStart(2,'0');
    }

    // ---------- Ver detalle ----------
    function verAjuste(id) {
      var a = leerAjustes().find(function (x) { return x.id === id; });
      if (!a) return;

      var html = '';
      html += '<div style="font-size:13px;color:#46566a;margin-bottom:10px;">';
      html += '<b>Concepto:</b> ' + KF.esc(a.concepto) + '<br>';
      html += '<b>Fecha:</b> ' + fechaHora(a.fecha);
      html += '</div>';

      html += '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
      html += '<thead><tr style="background:var(--azul-suave);color:var(--azul-medio);">';
      html += '<th style="text-align:left;padding:6px 4px;">Cuenta</th>';
      html += '<th style="text-align:right;padding:6px 4px;">Debe</th>';
      html += '<th style="text-align:right;padding:6px 4px;">Haber</th>';
      html += '</tr></thead><tbody>';
      a.lineas.forEach(function (l) {
        var nombre = nombreCuenta(l.cuenta) + (l.subcuenta ? ' · ' + l.subcuenta : '');
        var debe = l.lado === 'debe' ? KF.dinero(l.monto) : '';
        var haber = l.lado === 'haber' ? KF.dinero(l.monto) : '';
        html += '<tr style="border-bottom:1px solid var(--gris-borde);">';
        html += '<td style="padding:6px 4px;">' + KF.esc(nombre) + '</td>';
        html += '<td style="text-align:right;padding:6px 4px;color:var(--azul-medio);">' + debe + '</td>';
        html += '<td style="text-align:right;padding:6px 4px;color:var(--rojo);">' + haber + '</td>';
        html += '</tr>';
      });
      html += '<tr style="font-weight:800;background:var(--gris-suave);">';
      html += '<td style="padding:8px 4px;">TOTAL</td>';
      html += '<td style="text-align:right;padding:8px 4px;">' + KF.dinero(a.totalDebe) + '</td>';
      html += '<td style="text-align:right;padding:8px 4px;">' + KF.dinero(a.totalHaber) + '</td>';
      html += '</tr>';
      html += '</tbody></table>';

      KF.abrirModal({
        titulo: 'Detalle del ajuste',
        contenido: html,
        alGuardar: null
      });
    }

    function nombreCuenta(id) {
      for (var i = 0; i < CATALOGO.length; i++) {
        var c = CATALOGO[i].cuentas.find(function (x) { return x.id === id; });
        if (c) return c.nombre;
      }
      if (id && id.indexOf('pers_') === 0) {
        var real = KF.leer('cuentas-personalizadas', []).find(function (x) {
          return 'pers_' + x.id === id;
        });
        if (real) return real.nombre;
      }
      return id;
    }

    // ---------- Formulario de nuevo ajuste ----------
    function abrirFormulario() {
      // Lineas en memoria (minimo 2)
      var lineas = [
        { cuenta: '', subcuenta: '', monto: 0, lado: 'debe',  reflejar: false },
        { cuenta: '', subcuenta: '', monto: 0, lado: 'haber', reflejar: false }
      ];

      var contenido = '';
      contenido += '<div class="kf-campo"><label>Concepto</label><input type="text" id="aj-concepto" placeholder="Ej: Corrección venta del 12/10"></div>';
      contenido += '<div class="kf-campo"><label>Fecha</label><input type="date" id="aj-fecha" value="' + KF.hoy() + '"></div>';
      contenido += '<div style="margin-top:14px;font-size:12px;font-weight:600;color:var(--azul-medio);text-transform:uppercase;letter-spacing:0.3px;margin-bottom:6px;">Líneas del ajuste</div>';
      contenido += '<div id="aj-lineas"></div>';
      contenido += '<button class="kf-btn kf-btn-gris kf-btn-bloque" id="aj-add-linea" type="button" style="margin-top:8px;">+ Añadir línea</button>';
      contenido += '<div id="aj-totales" style="margin-top:12px;padding:10px;border-radius:8px;background:var(--azul-suave);font-size:14px;"></div>';

      KF.abrirModal({
        titulo: 'Nuevo ajuste',
        contenido: contenido,
        textoGuardar: 'Guardar ajuste',
        alGuardar: function () { guardarAjuste(lineas); }
      });

      // Render de las lineas
      function pintarLineas() {
        var c = document.getElementById('aj-lineas');
        if (!c) return;
        var ops = opcionesCuentas();
        var html = '';
        lineas.forEach(function (l, i) {
          html += '<div class="kf-item" style="padding:10px;margin-bottom:8px;">';
          html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
          html += '<div style="font-size:12px;color:#7b8a9a;">Línea ' + (i + 1) + '</div>';
          html += '<button class="kf-btn kf-btn-rojo kf-btn-chico" data-quitar="' + i + '" type="button">✕</button>';
          html += '</div>';

          html += '<div class="kf-campo" style="margin-bottom:6px;">';
          html += '<label style="font-size:10px;">Cuenta</label>';
          html += '<select data-cuenta="' + i + '">';
          html += '<option value="">-- Selecciona --</option>';
          html += ops;
          html += '</select>';
          html += '</div>';

          html += '<div class="kf-campo" style="margin-bottom:6px;">';
          html += '<label style="font-size:10px;">Subcuenta / detalle (opcional)</label>';
          html += '<input type="text" data-subcuenta="' + i + '" value="' + KF.esc(l.subcuenta) + '" placeholder="Ej: producto, cliente...">';
          html += '</div>';

          html += '<div class="kf-fila" style="margin-bottom:6px;">';
          html += '<div class="kf-campo" style="margin-bottom:0;">';
          html += '<label style="font-size:10px;">Monto</label>';
          html += '<input type="number" step="0.01" inputmode="decimal" data-monto="' + i + '" value="' + KF.esc(l.monto) + '">';
          html += '</div>';
          html += '<div class="kf-campo" style="margin-bottom:0;">';
          html += '<label style="font-size:10px;">Lado</label>';
          html += '<select data-lado="' + i + '">';
          html += '<option value="debe"' + (l.lado === 'debe' ? ' selected' : '') + '>Debe</option>';
          html += '<option value="haber"' + (l.lado === 'haber' ? ' selected' : '') + '>Haber</option>';
          html += '</select>';
          html += '</div>';
          html += '</div>';

          html += '<label style="font-size:11px;display:flex;align-items:center;gap:6px;color:#7b8a9a;">';
          html += '<input type="checkbox" data-reflejar="' + i + '"' + (l.reflejar ? ' checked' : '') + '>';
          html += 'Reflejar en Efectivo (solo si la cuenta es Efectivo en caja)';
          html += '</label>';

          html += '</div>';
        });
        c.innerHTML = html;

        // Restaurar valores seleccionados y enlazar eventos
        c.querySelectorAll('[data-cuenta]').forEach(function (el) {
          var idx = parseInt(el.getAttribute('data-cuenta'), 10);
          el.value = lineas[idx].cuenta || '';
          el.addEventListener('change', function (e) {
            lineas[idx].cuenta = e.target.value;
            actualizarTotales();
          });
        });
        c.querySelectorAll('[data-subcuenta]').forEach(function (el) {
          var idx = parseInt(el.getAttribute('data-subcuenta'), 10);
          el.addEventListener('input', function (e) {
            lineas[idx].subcuenta = e.target.value;
          });
        });
        c.querySelectorAll('[data-monto]').forEach(function (el) {
          var idx = parseInt(el.getAttribute('data-monto'), 10);
          el.addEventListener('input', function (e) {
            lineas[idx].monto = KF.num(e.target.value);
            actualizarTotales();
          });
        });
        c.querySelectorAll('[data-lado]').forEach(function (el) {
          var idx = parseInt(el.getAttribute('data-lado'), 10);
          el.addEventListener('change', function (e) {
            lineas[idx].lado = e.target.value;
            actualizarTotales();
          });
        });
        c.querySelectorAll('[data-reflejar]').forEach(function (el) {
          var idx = parseInt(el.getAttribute('data-reflejar'), 10);
          el.addEventListener('change', function (e) {
            lineas[idx].reflejar = e.target.checked;
          });
        });
        c.querySelectorAll('[data-quitar]').forEach(function (el) {
          el.addEventListener('click', function (e) {
            if (lineas.length <= 2) {
              KF.aviso('Mínimo 2 líneas', 'error');
              return;
            }
            var idx = parseInt(e.currentTarget.getAttribute('data-quitar'), 10);
            lineas.splice(idx, 1);
            pintarLineas();
            actualizarTotales();
          });
        });
      }

      function actualizarTotales() {
        var debe = 0, haber = 0;
        lineas.forEach(function (l) {
          if (l.lado === 'debe') debe += KF.num(l.monto);
          else haber += KF.num(l.monto);
        });
        var dif = debe - haber;
        var cuadra = Math.abs(dif) < 0.01;
        var el = document.getElementById('aj-totales');
        if (!el) return;
        el.innerHTML =
          '<div style="display:flex;justify-content:space-between;"><span>Total Debe:</span><b>' + KF.dinero(debe) + '</b></div>' +
          '<div style="display:flex;justify-content:space-between;"><span>Total Haber:</span><b>' + KF.dinero(haber) + '</b></div>' +
          '<div style="display:flex;justify-content:space-between;margin-top:4px;color:' + (cuadra ? 'var(--verde)' : 'var(--rojo)') + ';font-weight:700;">' +
          '<span>' + (cuadra ? '✅ Cuadra' : '⚠️ Diferencia') + ':</span>' +
          '<span>' + KF.dinero(dif) + '</span></div>';
      }

      var addBtn = document.getElementById('aj-add-linea');
      if (addBtn) addBtn.addEventListener('click', function () {
        lineas.push({ cuenta: '', subcuenta: '', monto: 0, lado: 'debe', reflejar: false });
        pintarLineas();
        actualizarTotales();
      });

      pintarLineas();
      actualizarTotales();

      setTimeout(function () {
        var el = document.getElementById('aj-concepto');
        if (el) el.focus();
      }, 100);
    }

    // ---------- Guardar ajuste ----------
    function guardarAjuste(lineas) {
      var concepto = document.getElementById('aj-concepto').value.trim();
      var fecha = document.getElementById('aj-fecha').value;

      if (!concepto) { KF.aviso('Escribe un concepto', 'error'); return; }
      if (!fecha)    { KF.aviso('Elige una fecha', 'error'); return; }
      if (lineas.length < 2) { KF.aviso('Mínimo 2 líneas', 'error'); return; }

      for (var i = 0; i < lineas.length; i++) {
        if (!lineas[i].cuenta) { KF.aviso('Línea ' + (i+1) + ': falta la cuenta', 'error'); return; }
        if (KF.num(lineas[i].monto) <= 0) { KF.aviso('Línea ' + (i+1) + ': monto inválido', 'error'); return; }
      }

      var debe = 0, haber = 0;
      lineas.forEach(function (l) {
        if (l.lado === 'debe') debe += KF.num(l.monto);
        else haber += KF.num(l.monto);
      });

      if (Math.abs(debe - haber) > 0.01) {
        KF.aviso('Debe (' + KF.dinero(debe) + ') ≠ Haber (' + KF.dinero(haber) + ')', 'error');
        return;
      }

      // Guardar
      var ajuste = {
        id: KF.id(),
        fecha: fecha + 'T' + new Date().toTimeString().substring(0, 8),
        concepto: concepto,
        lineas: lineas.map(function (l) {
          return {
            cuenta: l.cuenta,
            subcuenta: l.subcuenta || '',
            monto: KF.num(l.monto),
            lado: l.lado,
            reflejar: !!l.reflejar
          };
        }),
        totalDebe: debe,
        totalHaber: haber
      };

      var lista = leerAjustes();
      lista.push(ajuste);
      guardarAjustes(lista);

      // Reflejar en Efectivo (lineas con cuenta efectivo + reflejar marcado)
      var efectivo = KF.leer('efectivo', []);
      var algoReflejado = false;
      ajuste.lineas.forEach(function (l) {
        if (l.cuenta !== 'efectivo' || !l.reflejar) return;
        var esIngreso = (l.lado === 'debe'); // Debe en caja = entra
        efectivo.push({
          id: KF.id(),
          fecha: new Date(fecha + 'T12:00:00').toISOString(),
          tipo: esIngreso ? 'ingreso' : 'egreso',
          monto: l.monto,
          concepto: 'Ajuste: ' + concepto + (l.subcuenta ? ' · ' + l.subcuenta : ''),
          referencia: 'ajustes',
          refId: ajuste.id
        });
        algoReflejado = true;
      });
      if (algoReflejado) KF.escribir('efectivo', efectivo);

      KF.cerrarModal();
      KF.aviso('Ajuste guardado', 'ok');
      pintar();
    }

    // ---------- Eliminar ----------
    function eliminarAjuste(id) {
      var a = leerAjustes().find(function (x) { return x.id === id; });
      if (!a) return;

      var msg = '¿Eliminar este ajuste?';
      var tieneReflejo = a.lineas.some(function (l) { return l.cuenta === 'efectivo' && l.reflejar; });
      if (tieneReflejo) msg += ' También se eliminarán sus movimientos en Efectivo.';

      KF.confirmar(msg, function () {
        var lista = leerAjustes().filter(function (x) { return x.id !== id; });
        guardarAjustes(lista);

        // Quitar movimientos de efectivo asociados
        var ef = KF.leer('efectivo', []).filter(function (m) {
          return !(m.referencia === 'ajustes' && m.refId === id);
        });
        KF.escribir('efectivo', ef);

        KF.aviso('Ajuste eliminado', 'ok');
        pintar();
      });
    }

    // ---------- Arrancar ----------
    pintar();
  }
});