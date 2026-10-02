/* =====================================================
   Modulo: Cuentas Personalizadas
   El usuario crea sus propias cuentas con subcuentas.
   Ejemplo:
     Cuenta "Activos fijos"
       Subcuenta "Nevera"     valor 50000
       Subcuenta "Vitrina"    valor 30000
     Cuenta "Deudas informales"
       Subcuenta "Préstamo Juan"  valor 5000
   Cada cuenta tiene un tipo que ayuda a clasificar despues
   en Balance / Estado de Resultados.
   ===================================================== */

KF.registrarModulo({
  id: 'cuentas-personalizadas',
  nombre: 'Cuentas y Subcuentas',
  icono: '🗂️',
  orden: 9,
  render: function (cont) {

    var MODULO = 'cuentas-personalizadas';
    var TIPOS = [
      { v: 'activo',       t: 'Activo (lo que tengo)' },
      { v: 'pasivo',       t: 'Pasivo (lo que debo)' },
      { v: 'patrimonio',   t: 'Patrimonio (capital)' },
      { v: 'ingreso',      t: 'Ingreso' },
      { v: 'gasto',        t: 'Gasto' },
      { v: 'otro',         t: 'Otro / informativo' }
    ];
    var TIPO_NOMBRE = {};
    TIPOS.forEach(function (x) { TIPO_NOMBRE[x.v] = x.t; });

    function leerCuentas() { return KF.leer(MODULO, []); }
    function guardarCuentas(l) { KF.escribir(MODULO, l); }

    function totalCuenta(c) {
      return (c.subcuentas || []).reduce(function (s, sc) { return s + KF.num(sc.valor); }, 0);
    }

    function pintar() {
      var cuentas = leerCuentas();

      var granTotal = 0;
      cuentas.forEach(function (c) { granTotal += totalCuenta(c); });

      var html = '';
      html += '<div class="kf-titulo-modulo">🗂️ Cuentas y Subcuentas</div>';
      html += '<div class="kf-subtitulo">Crea tus propias cuentas con subcuentas</div>';

      html += '<div class="kf-grid-resumen">';
      html += '<div class="kf-mini-card acento"><div class="lbl">Cuentas</div><div class="val">' + cuentas.length + '</div></div>';
      html += '<div class="kf-mini-card"><div class="lbl">Total general</div><div class="val">' + KF.dinero(granTotal) + '</div></div>';
      html += '</div>';

      html += '<button class="kf-btn kf-btn-dorado kf-btn-bloque" id="kf-cp-add" type="button" style="margin-bottom:12px;">+ Nueva cuenta</button>';

      // Lista de cuentas con sus subcuentas
      html += '<div id="kf-cp-lista"></div>';

      cont.innerHTML = html;

      document.getElementById('kf-cp-add').addEventListener('click', function () { abrirCuentaForm(); });

      pintarLista(cuentas);
    }

    function pintarLista(cuentas) {
      var cont = document.getElementById('kf-cp-lista');
      if (!cont) return;

      if (!cuentas.length) {
        cont.innerHTML = '<div class="kf-vacio"><span class="kf-vacio-icono">🗂️</span>Aún no has creado cuentas. Pulsa "Nueva cuenta" para empezar.</div>';
        return;
      }

      var html = '';
      cuentas.forEach(function (c) {
        var total = totalCuenta(c);
        var subs = c.subcuentas || [];
        html += '<div class="kf-card">';
        html += '<div class="kf-card-titulo">';
        html += '<span>' + KF.esc(c.nombre) + ' <small style="color:#7b8a9a;font-weight:400;">· ' + KF.esc(TIPO_NOMBRE[c.tipo] || 'Otro') + '</small></span>';
        html += '<span style="font-size:14px;">' + KF.dinero(total) + '</span>';
        html += '</div>';

        if (!subs.length) {
          html += '<div style="font-size:13px;color:#7b8a9a;padding:6px 0;">Sin subcuentas.</div>';
        } else {
          subs.forEach(function (sc) {
            html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gris-borde);">';
            html += '<span style="font-size:14px;">' + KF.esc(sc.nombre) + '</span>';
            html += '<b style="color:var(--azul-medio);font-size:14px;">' + KF.dinero(sc.valor) + '</b>';
            html += '</div>';
          });
        }

        html += '<div class="kf-item-acciones" style="margin-top:10px;">';
        html += '<button class="kf-btn kf-btn-verde kf-btn-chico" data-accion="sub-add" data-id="' + c.id + '">+ Subcuenta</button>';
        html += '<button class="kf-btn kf-btn-gris kf-btn-chico" data-accion="editar" data-id="' + c.id + '">Editar</button>';
        html += '<button class="kf-btn kf-btn-rojo kf-btn-chico" data-accion="eliminar" data-id="' + c.id + '">Eliminar</button>';
        html += '</div>';
        html += '</div>';
      });
      cont.innerHTML = html;

      var btns = cont.querySelectorAll('button[data-accion]');
      for (var k = 0; k < btns.length; k++) {
        btns[k].addEventListener('click', function (e) {
          var acc = e.currentTarget.getAttribute('data-accion');
          var id = e.currentTarget.getAttribute('data-id');
          if (acc === 'sub-add')  abrirSubForm(id);
          if (acc === 'editar')   abrirCuentaForm(id);
          if (acc === 'eliminar') eliminarCuenta(id);
        });
      }
    }

    // ---------- Cuenta ----------
    function abrirCuentaForm(id) {
      var c = id ? leerCuentas().find(function (x) { return x.id === id; }) : null;
      var datos = c || { nombre: '', tipo: 'activo', notas: '' };

      var ops = TIPOS.map(function (t) {
        return '<option value="' + t.v + '"' + (datos.tipo === t.v ? ' selected' : '') + '>' + KF.esc(t.t) + '</option>';
      }).join('');

      var contenido = '';
      contenido += '<div class="kf-campo"><label>Nombre de la cuenta</label><input type="text" id="cp-nombre" value="' + KF.esc(datos.nombre) + '" placeholder="Ej: Activos fijos"></div>';
      contenido += '<div class="kf-campo"><label>Tipo de cuenta</label><select id="cp-tipo">' + ops + '</select></div>';
      contenido += '<div class="kf-campo"><label>Notas (opcional)</label><input type="text" id="cp-notas" value="' + KF.esc(datos.notas || '') + '"></div>';

      KF.abrirModal({
        titulo: c ? 'Editar cuenta' : 'Nueva cuenta',
        contenido: contenido,
        textoGuardar: c ? 'Guardar cambios' : 'Crear cuenta',
        alGuardar: function () {
          var nombre = document.getElementById('cp-nombre').value.trim();
          var tipo = document.getElementById('cp-tipo').value;
          var notas = document.getElementById('cp-notas').value.trim();
          if (!nombre) { KF.aviso('Escribe un nombre', 'error'); return; }

          var lista = leerCuentas();
          if (c) {
            var i = lista.findIndex(function (x) { return x.id === c.id; });
            lista[i].nombre = nombre;
            lista[i].tipo = tipo;
            lista[i].notas = notas;
            lista[i].actualizado = KF.ahora();
          } else {
            lista.push({
              id: KF.id(), fecha: KF.ahora(),
              nombre: nombre, tipo: tipo, notas: notas,
              subcuentas: []
            });
          }
          guardarCuentas(lista);
          KF.cerrarModal();
          KF.aviso(c ? 'Cuenta actualizada' : 'Cuenta creada', 'ok');
          pintar();
        }
      });

      setTimeout(function () {
        var el = document.getElementById('cp-nombre');
        if (el && !c) el.focus();
      }, 100);
    }

    function eliminarCuenta(id) {
      var c = leerCuentas().find(function (x) { return x.id === id; });
      if (!c) return;
      KF.confirmar('¿Eliminar la cuenta "' + c.nombre + '" y todas sus subcuentas?', function () {
        var lista = leerCuentas().filter(function (x) { return x.id !== id; });
        guardarCuentas(lista);
        KF.aviso('Cuenta eliminada', 'ok');
        pintar();
      });
    }

    // ---------- Subcuenta ----------
    function abrirSubForm(cuentaId) {
      var contenido = '';
      contenido += '<div class="kf-campo"><label>Nombre de la subcuenta</label><input type="text" id="sc-nombre" placeholder="Ej: Nevera"></div>';
      contenido += '<div class="kf-campo"><label>Valor</label><input type="number" step="0.01" inputmode="decimal" id="sc-valor" value="0.00"></div>';
      contenido += '<div class="kf-campo"><label>Notas (opcional)</label><input type="text" id="sc-notas"></div>';

      KF.abrirModal({
        titulo: 'Nueva subcuenta',
        contenido: contenido,
        textoGuardar: 'Añadir',
        alGuardar: function () {
          var nombre = document.getElementById('sc-nombre').value.trim();
          var valor = KF.num(document.getElementById('sc-valor').value);
          var notas = document.getElementById('sc-notas').value.trim();
          if (!nombre) { KF.aviso('Escribe un nombre', 'error'); return; }

          var lista = leerCuentas();
          var i = lista.findIndex(function (x) { return x.id === cuentaId; });
          if (i < 0) { KF.aviso('Cuenta no encontrada', 'error'); return; }
          if (!lista[i].subcuentas) lista[i].subcuentas = [];
          lista[i].subcuentas.push({
            id: KF.id(), nombre: nombre, valor: valor, notas: notas,
            creado: KF.ahora()
          });
          guardarCuentas(lista);
          KF.cerrarModal();
          KF.aviso('Subcuenta añadida', 'ok');
          pintar();
        }
      });

      setTimeout(function () {
        var el = document.getElementById('sc-nombre');
        if (el) el.focus();
      }, 100);
    }

    pintar();
  }
});