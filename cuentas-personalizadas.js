/* =====================================================
   Modulo: Cuentas y Subcuentas - Centro de Cuentas
   Vista jerárquica de TODAS las cuentas del negocio:
   Activo, Pasivo, Patrimonio, Ingresos, Gastos y Ajustes.
   Cada nivel se expande/colapsa. Exporta a PDF y Excel.
   - Ingresos y Gastos agrupados por TIPO y luego por CATEGORÍA
   - Capital desglosado por subcuenta (aportante)
   ===================================================== */

KF.registrarModulo({
  id: 'cuentas-personalizadas',
  nombre: 'Cuentas y Subcuentas',
  icono: '🗂️',
  orden: 9,
  render: function (cont) {

    /* =====================================================
       CALCULO DE SALDOS
       ===================================================== */

    function saldoEfectivo() {
      var s = 0;
      KF.leer('efectivo', []).forEach(function (m) {
        s += (m.tipo === 'ingreso' ? 1 : -1) * KF.num(m.monto);
      });
      return s;
    }
    function saldoInventario() {
      var s = 0;
      KF.leer('inventario', []).forEach(function (p) {
        s += KF.num(p.costo) * KF.num(p.stock);
      });
      return s;
    }
    function saldoCxC() {
      var s = 0;
      KF.leer('cuentas-cobrar', []).forEach(function (c) {
        var pagado = (c.pagos || []).reduce(function (t, p) { return t + KF.num(p.monto); }, 0);
        s += Math.max(0, KF.num(c.monto) - pagado);
      });
      return s;
    }
    function saldoCxP() {
      var s = 0;
      KF.leer('cuentas-pagar', []).forEach(function (c) {
        var pagado = (c.pagos || []).reduce(function (t, p) { return t + KF.num(p.monto); }, 0);
        s += Math.max(0, KF.num(c.monto) - pagado);
      });
      return s;
    }
    function saldoCapital() {
      var movs = KF.leer('capital', []);
      var porSub = {};
      var aportes = 0, retiros = 0;
      movs.forEach(function (m) {
        var sub = String(m.subcuenta || '').trim() || 'Sin asignar';
        if (!porSub[sub]) porSub[sub] = { aportes: 0, retiros: 0 };
        if (m.tipo === 'aporte') {
          porSub[sub].aportes += KF.num(m.monto);
          aportes += KF.num(m.monto);
        } else {
          porSub[sub].retiros += KF.num(m.monto);
          retiros += KF.num(m.monto);
        }
      });
      return { aportes: aportes, retiros: retiros, neto: aportes - retiros, porSub: porSub };
    }
    function saldoResultados() {
      var u = 0;
      KF.leer('ventas', []).forEach(function (v) { u += KF.num(v.ganancia); });
      KF.leer('ingresos', []).forEach(function (i) { u += KF.num(i.monto); });
      KF.leer('gastos', []).forEach(function (g) { u -= KF.num(g.monto); });
      return u;
    }

    // ---------- Capital: hijos por subcuenta ----------
    function capitalHijos(porSub) {
      var nombres = Object.keys(porSub).sort(function (a, b) {
        if (a === 'Sin asignar') return 1;
        if (b === 'Sin asignar') return -1;
        return a.localeCompare(b);
      });
      return nombres.map(function (sub) {
        var d = porSub[sub];
        var neto = d.aportes - d.retiros;
        return {
          id: 'patrim:capital:sub:' + sub,
          nombre: sub,
          detalle: 'Aportes: ' + KF.dinero(d.aportes) + ' · Retiros: ' + KF.dinero(d.retiros),
          total: neto,
          hijos: []
        };
      });
    }

    // ---------- Inventario agrupado ----------
    function inventarioHijos() {
      var productos = KF.leer('inventario', []);
      var porCat = {};
      productos.forEach(function (p) {
        var cat = p.categoria || 'Sin categoría';
        if (!porCat[cat]) porCat[cat] = [];
        porCat[cat].push(p);
      });

      var hijos = [];
      Object.keys(porCat).sort().forEach(function (cat) {
        var prods = porCat[cat].sort(function (a, b) {
          return (a.nombre || '').localeCompare(b.nombre || '');
        });
        var total = prods.reduce(function (s, p) {
          return s + KF.num(p.costo) * KF.num(p.stock);
        }, 0);

        var subHijos = prods.map(function (p) {
          var val = KF.num(p.costo) * KF.num(p.stock);
          return {
            id: 'activo:inventario:' + cat + ':' + p.id,
            nombre: p.nombre,
            detalle: 'stock ' + KF.num(p.stock) + ' ' + (p.unidad || 'u'),
            total: val,
            hijos: []
          };
        });

        hijos.push({
          id: 'activo:inventario:' + cat,
          nombre: cat,
          detalle: prods.length + ' producto' + (prods.length !== 1 ? 's' : ''),
          total: total,
          hijos: subHijos
        });
      });
      return hijos;
    }

    // ---------- CxC agrupadas por cliente ----------
    function cxcHijos() {
      var cuentas = KF.leer('cuentas-cobrar', []);
      var porCliente = {};
      cuentas.forEach(function (c) {
        var cli = c.cliente || 'Sin nombre';
        if (!porCliente[cli]) porCliente[cli] = [];
        porCliente[cli].push(c);
      });

      var hijos = [];
      Object.keys(porCliente).sort().forEach(function (cli) {
        var arr = porCliente[cli];
        var total = arr.reduce(function (s, c) {
          var pagado = (c.pagos || []).reduce(function (t, p) { return t + KF.num(p.monto); }, 0);
          return s + Math.max(0, KF.num(c.monto) - pagado);
        }, 0);

        var subHijos = arr.map(function (c) {
          var pagado = (c.pagos || []).reduce(function (t, p) { return t + KF.num(p.monto); }, 0);
          var saldo = Math.max(0, KF.num(c.monto) - pagado);
          return {
            id: 'activo:cxc:' + cli + ':' + c.id,
            nombre: c.concepto || 'Cuenta',
            detalle: KF.fechaISO(c.fecha),
            total: saldo,
            hijos: []
          };
        });

        hijos.push({
          id: 'activo:cxc:' + cli,
          nombre: cli,
          detalle: arr.length + ' cuenta' + (arr.length !== 1 ? 's' : ''),
          total: total,
          hijos: subHijos
        });
      });
      return hijos;
    }

    // ---------- CxP agrupadas por proveedor ----------
    function cxpHijos() {
      var cuentas = KF.leer('cuentas-pagar', []);
      var porProv = {};
      cuentas.forEach(function (c) {
        var p = c.proveedor || 'Sin nombre';
        if (!porProv[p]) porProv[p] = [];
        porProv[p].push(c);
      });

      var hijos = [];
      Object.keys(porProv).sort().forEach(function (prov) {
        var arr = porProv[prov];
        var total = arr.reduce(function (s, c) {
          var pagado = (c.pagos || []).reduce(function (t, p) { return t + KF.num(p.monto); }, 0);
          return s + Math.max(0, KF.num(c.monto) - pagado);
        }, 0);

        var subHijos = arr.map(function (c) {
          var pagado = (c.pagos || []).reduce(function (t, p) { return t + KF.num(p.monto); }, 0);
          var saldo = Math.max(0, KF.num(c.monto) - pagado);
          return {
            id: 'pasivo:cxp:' + prov + ':' + c.id,
            nombre: c.concepto || 'Cuenta',
            detalle: KF.fechaISO(c.fecha),
            total: saldo,
            hijos: []
          };
        });

        hijos.push({
          id: 'pasivo:cxp:' + prov,
          nombre: prov,
          detalle: arr.length + ' cuenta' + (arr.length !== 1 ? 's' : ''),
          total: total,
          hijos: subHijos
        });
      });
      return hijos;
    }

    /* =====================================================
       INGRESOS: TIPO -> CATEGORIA
       ===================================================== */
    var TIPOS_INGRESO = [
      { id: 'operacionales', nombre: 'Ingresos Operacionales' },
      { id: 'financieros',   nombre: 'Ingresos Financieros' },
      { id: 'otros',         nombre: 'Otros Ingresos' }
    ];
    var CATS_INGRESO_BASE = {
      operacionales: ['Alquiler', 'Servicios', 'Comisiones', 'Devolución'],
      financieros:   ['Intereses', 'Dividendos'],
      otros:         ['Varios', 'Aporte']
    };

    function inferirTipoIngreso(categoria, custom) {
      if (!categoria) return 'operacionales';
      var tipos = Object.keys(CATS_INGRESO_BASE);
      for (var i = 0; i < tipos.length; i++) {
        if (CATS_INGRESO_BASE[tipos[i]].indexOf(categoria) !== -1) return tipos[i];
      }
      if (custom) {
        for (var t in custom) {
          if ((custom[t] || []).indexOf(categoria) !== -1) return t;
        }
      }
      return 'operacionales';
    }

    function ingresosHijos() {
      var lista = KF.leer('ingresos', []);
      var custom = KF.leer('cat-ingresos', {});
      if (!custom || typeof custom !== 'object') custom = {};

      var porTipo = {};
      lista.forEach(function (i) {
        var cat = i.categoria || 'Otros';
        var tipo = i.tipo || inferirTipoIngreso(cat, custom);
        if (!porTipo[tipo]) porTipo[tipo] = {};
        if (!porTipo[tipo][cat]) porTipo[tipo][cat] = 0;
        porTipo[tipo][cat] += KF.num(i.monto);
      });

      var hijos = [];
      TIPOS_INGRESO.forEach(function (t) {
        var cats = porTipo[t.id];
        if (!cats) return;
        var nombresCat = Object.keys(cats).sort();
        var totalTipo = 0;
        var subHijos = nombresCat.map(function (cat) {
          totalTipo += cats[cat];
          return {
            id: 'ingresos:tipo:' + t.id + ':cat:' + cat,
            nombre: cat,
            detalle: 'categoría',
            total: cats[cat],
            hijos: []
          };
        });
        hijos.push({
          id: 'ingresos:tipo:' + t.id,
          nombre: t.nombre,
          detalle: nombresCat.length + ' categoría' + (nombresCat.length !== 1 ? 's' : ''),
          total: totalTipo,
          hijos: subHijos
        });
      });
      return hijos;
    }

    /* =====================================================
       GASTOS: TIPO -> CATEGORIA
       ===================================================== */
    var TIPOS_GASTO = [
      { id: 'ventas',      nombre: 'Gastos de Ventas' },
      { id: 'admin',       nombre: 'Gastos de Administración' },
      { id: 'financieros', nombre: 'Gastos Financieros' },
      { id: 'otros',       nombre: 'Otros Gastos' }
    ];
    var CATS_GASTO_BASE = {
      ventas:      ['Publicidad', 'Comisiones', 'Transporte', 'Empaque', 'Promociones'],
      admin:       ['Alquiler', 'Salarios', 'Servicios', 'Mantenimiento', 'Papelería', 'Limpieza', 'Impuestos'],
      financieros: ['Intereses', 'Comisiones bancarias', 'Impuestos financieros'],
      otros:       ['Varios']
    };

    function inferirTipoGasto(categoria, custom) {
      if (!categoria) return 'admin';
      var tipos = Object.keys(CATS_GASTO_BASE);
      for (var i = 0; i < tipos.length; i++) {
        if (CATS_GASTO_BASE[tipos[i]].indexOf(categoria) !== -1) return tipos[i];
      }
      if (custom) {
        for (var t in custom) {
          if ((custom[t] || []).indexOf(categoria) !== -1) return t;
        }
      }
      return 'admin';
    }

    function gastosHijos() {
      var lista = KF.leer('gastos', []);
      var custom = KF.leer('cat-gastos', {});
      if (!custom || typeof custom !== 'object') custom = {};

      var porTipo = {};
      lista.forEach(function (g) {
        var cat = g.categoria || 'Otros';
        var tipo = g.tipo || inferirTipoGasto(cat, custom);
        if (!porTipo[tipo]) porTipo[tipo] = {};
        if (!porTipo[tipo][cat]) porTipo[tipo][cat] = 0;
        porTipo[tipo][cat] += KF.num(g.monto);
      });

      var hijos = [];
      TIPOS_GASTO.forEach(function (t) {
        var cats = porTipo[t.id];
        if (!cats) return;
        var nombresCat = Object.keys(cats).sort();
        var totalTipo = 0;
        var subHijos = nombresCat.map(function (cat) {
          totalTipo += cats[cat];
          return {
            id: 'gastos:tipo:' + t.id + ':cat:' + cat,
            nombre: cat,
            detalle: 'categoría',
            total: cats[cat],
            hijos: []
          };
        });
        hijos.push({
          id: 'gastos:tipo:' + t.id,
          nombre: t.nombre,
          detalle: nombresCat.length + ' categoría' + (nombresCat.length !== 1 ? 's' : ''),
          total: totalTipo,
          hijos: subHijos
        });
      });
      return hijos;
    }

    // ---------- Cuentas personalizadas por tipo ----------
    function cuentasPersonalizadasHijos(tipo) {
      var lista = KF.leer('cuentas-personalizadas', []);
      var filtradas = lista.filter(function (c) { return (c.tipo || 'otro') === tipo; });

      return filtradas.map(function (c) {
        var total = (c.subcuentas || []).reduce(function (s, sc) {
          return s + KF.num(sc.valor);
        }, 0);
        var subs = (c.subcuentas || []).map(function (sc) {
          return {
            id: 'pers:' + c.id + ':' + sc.id,
            nombre: sc.nombre,
            detalle: sc.notas || '',
            total: KF.num(sc.valor),
            hijos: []
          };
        });
        return {
          id: 'pers:' + c.id,
          nombre: c.nombre,
          detalle: (c.subcuentas || []).length + ' subcuenta' + ((c.subcuentas || []).length !== 1 ? 's' : ''),
          total: total,
          hijos: subs
        };
      });
    }

    // ---------- Ajustes ----------
    function ajustesHijos() {
      var lista = KF.leer('ajustes', []);
      return lista.slice().sort(function (a, b) {
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      }).map(function (a) {
        return {
          id: 'ajuste:' + a.id,
          nombre: a.concepto,
          detalle: KF.fechaISO(a.fecha),
          total: KF.num(a.totalDebe),
          hijos: a.lineas.map(function (l, i) {
            return {
              id: 'ajuste:' + a.id + ':linea:' + i,
              nombre: nombreCuentaAjuste(l.cuenta),
              detalle: (l.subcuenta ? l.subcuenta + ' · ' : '') + l.lado.toUpperCase(),
              total: KF.num(l.monto),
              hijos: []
            };
          })
        };
      });
    }
    function nombreCuentaAjuste(id) {
      var mapa = {
        efectivo: 'Efectivo en caja',
        inventario: 'Inventario',
        cxc: 'Cuentas por cobrar',
        cxp: 'Cuentas por pagar',
        capital: 'Capital',
        resultados: 'Resultados acumulados',
        ventas: 'Ventas',
        otros_ingresos: 'Otros ingresos',
        costo_ventas: 'Costo de ventas',
        gastos_op: 'Gastos operativos'
      };
      if (mapa[id]) return mapa[id];
      if (id && id.indexOf('pers_') === 0) {
        var real = KF.leer('cuentas-personalizadas', []).find(function (x) {
          return 'pers_' + x.id === id;
        });
        if (real) return real.nombre;
      }
      return id;
    }

    /* =====================================================
       CONSTRUIR ARBOL COMPLETO
       ===================================================== */
    function construirArbol() {
      var ef = saldoEfectivo();
      var inv = saldoInventario();
      var cxc = saldoCxC();
      var cxp = saldoCxP();
      var cap = saldoCapital();
      var res = saldoResultados();

      var totIngresos = 0;
      KF.leer('ingresos', []).forEach(function (i) { totIngresos += KF.num(i.monto); });

      var totGastos = 0;
      KF.leer('gastos', []).forEach(function (g) { totGastos += KF.num(g.monto); });

      var totAjustes = 0;
      KF.leer('ajustes', []).forEach(function (a) { totAjustes += KF.num(a.totalDebe); });

      var persActivo = cuentasPersonalizadasHijos('activo');
      var persPasivo = cuentasPersonalizadasHijos('pasivo');
      var persPatrim = cuentasPersonalizadasHijos('patrimonio');
      var persIng    = cuentasPersonalizadasHijos('ingreso');
      var persGas    = cuentasPersonalizadasHijos('gasto');

      var totalPersActivo = persActivo.reduce(function (s, c) { return s + c.total; }, 0);
      var totalPersPasivo = persPasivo.reduce(function (s, c) { return s + c.total; }, 0);
      var totalPersPatrim = persPatrim.reduce(function (s, c) { return s + c.total; }, 0);
      var totalPersIng    = persIng.reduce(function (s, c) { return s + c.total; }, 0);
      var totalPersGas    = persGas.reduce(function (s, c) { return s + c.total; }, 0);

      // Hijos Activo
      var activoHijos = [
        { id: 'activo:efectivo',   nombre: 'Efectivo en caja',    detalle: '', total: ef,  hijos: [] },
        { id: 'activo:inventario', nombre: 'Inventario',          detalle: '', total: inv, hijos: inventarioHijos() },
        { id: 'activo:cxc',        nombre: 'Cuentas por cobrar',  detalle: '', total: cxc, hijos: cxcHijos() }
      ];
      persActivo.forEach(function (c) { activoHijos.push(c); });
      var totalActivo = ef + inv + cxc + totalPersActivo;

      // Hijos Pasivo
      var pasivoHijos = [
        { id: 'pasivo:cxp', nombre: 'Cuentas por pagar', detalle: '', total: cxp, hijos: cxpHijos() }
      ];
      persPasivo.forEach(function (c) { pasivoHijos.push(c); });
      var totalPasivo = cxp + totalPersPasivo;

      // Hijos Patrimonio (Capital con subcuentas)
      var patrimHijos = [
        {
          id: 'patrim:capital',
          nombre: 'Capital',
          detalle: '',
          total: cap.neto,
          hijos: capitalHijos(cap.porSub)
        },
        {
          id: 'patrim:resultados',
          nombre: 'Resultados acumulados',
          detalle: '',
          total: res,
          hijos: []
        }
      ];
      persPatrim.forEach(function (c) { patrimHijos.push(c); });
      var totalPatrim = cap.neto + res + totalPersPatrim;

      // Hijos Ingresos
      var ingHijos = ingresosHijos();
      persIng.forEach(function (c) { ingHijos.push(c); });
      var totalIng = totIngresos + totalPersIng;

      // Hijos Gastos
      var gasHijos = gastosHijos();
      persGas.forEach(function (c) { gasHijos.push(c); });
      var totalGas = totGastos + totalPersGas;

      // Hijos Ajustes
      var ajHijos = [
        {
          id: 'ajustes:total', nombre: 'Ajustes registrados', detalle: '', total: totAjustes,
          hijos: ajustesHijos()
        }
      ];

      return [
        { id: 'activo',     nombre: 'ACTIVO',     color: 'var(--azul-medio)',   total: totalActivo, hijos: activoHijos },
        { id: 'pasivo',     nombre: 'PASIVO',     color: 'var(--rojo)',         total: totalPasivo, hijos: pasivoHijos },
        { id: 'patrimonio', nombre: 'PATRIMONIO', color: 'var(--verde)',        total: totalPatrim, hijos: patrimHijos },
        { id: 'ingresos',   nombre: 'INGRESOS',   color: 'var(--verde)',        total: totalIng,    hijos: ingHijos },
        { id: 'gastos',     nombre: 'GASTOS',     color: 'var(--rojo)',         total: totalGas,    hijos: gasHijos },
        { id: 'ajustes',    nombre: 'AJUSTES',    color: 'var(--dorado)',       total: totAjustes,  hijos: ajHijos }
      ];
    }

    /* =====================================================
       RENDER DEL ARBOL
       ===================================================== */
    var abiertos = { 'activo': true };

    function pintar() {
      var arbol = construirArbol();

      var html = '';
      html += '<div class="kf-titulo-modulo">🗂️ Cuentas y Subcuentas</div>';
      html += '<div class="kf-subtitulo">Estado completo de todas las cuentas del negocio</div>';

      html += '<style>' +
        '.kf-nodo summary{list-style:none;}' +
        '.kf-nodo summary::-webkit-details-marker{display:none;}' +
        '.kf-nodo summary::after{content:"▸";font-size:11px;color:#7b8a9a;margin-left:auto;padding-left:8px;}' +
        '.kf-nodo[open] > summary::after{content:"▾";}' +
        '</style>';

      html += '<div class="kf-fila" style="margin-bottom:12px;">';
      html += '<button class="kf-btn kf-btn-primario" id="kf-cc-pdf" type="button">🖨️ PDF</button>';
      html += '<button class="kf-btn kf-btn-verde" id="kf-cc-xlsx" type="button">📊 Excel</button>';
      html += '</div>';

      html += '<div class="kf-fila" style="margin-bottom:12px;">';
      html += '<button class="kf-btn kf-btn-gris" id="kf-cc-exp" type="button">↕️ Expandir</button>';
      html += '<button class="kf-btn kf-btn-gris" id="kf-cc-col" type="button">↕️ Colapsar</button>';
      html += '</div>';

      html += '<div id="kf-cc-arbol"></div>';
      cont.innerHTML = html;

      var arbolCont = document.getElementById('kf-cc-arbol');
      arbolCont.innerHTML = arbol.map(function (n) { return nodoHTML(n, 0); }).join('');

      document.getElementById('kf-cc-pdf').addEventListener('click', function () { exportarPDF(arbol); });
      document.getElementById('kf-cc-xlsx').addEventListener('click', function () { exportarExcel(arbol); });
      document.getElementById('kf-cc-exp').addEventListener('click', function () {
        arbolCont.querySelectorAll('details').forEach(function (d) { d.open = true; });
      });
      document.getElementById('kf-cc-col').addEventListener('click', function () {
        arbolCont.querySelectorAll('details').forEach(function (d) { d.open = false; });
      });
    }

    function nodoHTML(nodo, nivel) {
      var tieneHijos = nodo.hijos && nodo.hijos.length > 0;
      var colorIzq = nivel === 0 ? 'var(--azul-medio)'
                    : nivel === 1 ? 'var(--azul-claro)'
                    : 'var(--gris-borde)';
      var paddingLeft = 10 + nivel * 12;
      var fontSize = nivel === 0 ? '15px' : (nivel === 1 ? '14px' : '13px');
      var fontWeight = nivel === 0 ? '800' : (nivel === 1 ? '700' : '500');
      var colorTexto = nivel === 0 ? 'var(--azul-medio)' : 'var(--gris-texto)';

      var html = '';
      html += '<details class="kf-nodo" style="margin-bottom:6px;background:var(--blanco);border-radius:8px;border-left:4px solid ' + colorIzq + ';overflow:hidden;">';
      html += '<summary style="padding:10px;padding-left:' + paddingLeft + 'px;display:flex;align-items:center;cursor:pointer;font-size:' + fontSize + ';">';
      html += '<div style="flex:1;min-width:0;">';
      html += '<div style="font-weight:' + fontWeight + ';color:' + colorTexto + ';word-break:break-word;">' + KF.esc(nodo.nombre) + '</div>';
      if (nodo.detalle) {
        html += '<div style="font-size:11px;color:#7b8a9a;margin-top:2px;">' + KF.esc(nodo.detalle) + '</div>';
      }
      html += '</div>';
      html += '<b style="color:var(--azul-medio);font-size:13px;white-space:nowrap;padding-left:8px;">' + KF.dinero(nodo.total) + '</b>';
      html += '</summary>';

      if (tieneHijos) {
        html += '<div style="padding:4px 10px 10px ' + (paddingLeft + 8) + 'px;">';
        nodo.hijos.forEach(function (h) { html += nodoHTML(h, nivel + 1); });
        html += '</div>';
      }

      html += '</details>';
      return html;
    }

    /* =====================================================
       EXPORTAR PDF
       ===================================================== */
    function exportarPDF(arbol) {
      var filas = aplanarArbol(arbol);

      if (window.jspdf && window.jspdf.jsPDF) {
        try {
          var doc = new window.jspdf.jsPDF();
          var W = 210;
          var H = 297;
          var y = 20;

          doc.setFontSize(18); doc.setTextColor(22, 50, 79);
          doc.text('KontaFin - Cuentas y Subcuentas', 14, y); y += 8;
          doc.setFontSize(11); doc.setTextColor(100);
          var neg = KF.negocioActivo ? KF.negocioActivo.nombre : 'Negocio';
          doc.text(neg + ' · Generado el ' + new Date().toLocaleString(), 14, y); y += 12;

          doc.setDrawColor(242, 169, 0); doc.setLineWidth(1);
          doc.line(14, y - 6, 196, y - 6);
          y += 4;

          doc.setFontSize(10); doc.setTextColor(0);

          filas.forEach(function (f) {
            if (y > H - 20) {
              doc.addPage(); y = 20;
            }
            var indentX = 14 + f.nivel * 4;
            var esGrupo = f.nivel === 0;
            if (esGrupo) {
              doc.setFontSize(11);
              doc.setTextColor(22, 50, 79);
            } else {
              doc.setFontSize(9);
              doc.setTextColor(0);
            }
            var nom = f.nombre;
            if (nom.length > 60) nom = nom.substring(0, 58) + '..';
            doc.text(nom, indentX, y);
            doc.text(KF.dinero(f.total), 196, y, { align: 'right' });
            y += esGrupo ? 7 : 5;
          });

          doc.setFontSize(9); doc.setTextColor(150);
          doc.text('Generado por KontaFin · OSTICOR', 105, 290, { align: 'center' });

          doc.save('KontaFin-Cuentas-' + KF.hoy() + '.pdf');
          KF.aviso('PDF generado', 'ok');
          return;
        } catch (e) { /* cae al fallback */ }
      }

      // Fallback: dialogo de impresion
      var html = '';
      html += '<h1>KontaFin - Cuentas y Subcuentas</h1>';
      html += '<div style="color:#777;font-size:12px;margin-bottom:16px;">' +
              KF.esc(KF.negocioActivo ? KF.negocioActivo.nombre : 'Negocio') +
              ' · ' + new Date().toLocaleString() + '</div>';
      html += '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
      filas.forEach(function (f) {
        var peso = f.nivel === 0 ? 'bold' : 'normal';
        var color = f.nivel === 0 ? '#16324f' : '#222';
        html += '<tr style="border-bottom:1px solid #eee;">';
        html += '<td style="padding:5px 8px;font-weight:' + peso + ';color:' + color + ';padding-left:' + (8 + f.nivel * 12) + 'px;">' + KF.esc(f.nombre) + '</td>';
        html += '<td style="text-align:right;padding:5px 8px;font-weight:' + peso + ';color:' + color + ';">' + KF.dinero(f.total) + '</td>';
        html += '</tr>';
      });
      html += '</table>';

      var iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
      document.body.appendChild(iframe);
      var d = iframe.contentWindow.document;
      d.open();
      d.write('<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial;padding:20px;color:#222;}h1{color:#16324f;border-bottom:3px solid #f2a900;padding-bottom:6px;}</style></head><body>' + html + '</body></html>');
      d.close();
      setTimeout(function () {
        try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) {}
        setTimeout(function () { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); }, 1500);
      }, 400);

      KF.aviso('Elige "Guardar como PDF" en el diálogo', 'info');
    }

    function aplanarArbol(arbol) {
      var filas = [];
      function recorrer(nodo, nivel) {
        filas.push({ nivel: nivel, nombre: nodo.nombre, total: nodo.total });
        (nodo.hijos || []).forEach(function (h) { recorrer(h, nivel + 1); });
      }
      arbol.forEach(function (n) { recorrer(n, 0); });
      return filas;
    }

    /* =====================================================
       EXPORTAR EXCEL
       ===================================================== */
    function exportarExcel(arbol) {
      if (!window.XLSX) {
        KF.aviso('Librería Excel no disponible', 'error');
        return;
      }
      try {
        var filas = aplanarArbol(arbol);
        var datos = [['Nivel', 'Cuenta', 'Monto']];
        filas.forEach(function (f) {
          datos.push([f.nivel, f.nombre, f.total]);
        });
        var ws = window.XLSX.utils.aoa_to_sheet(datos);
        ws['!cols'] = [{ wch: 6 }, { wch: 45 }, { wch: 18 }];
        var wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, 'Cuentas');
        window.XLSX.writeFile(wb, 'KontaFin-Cuentas-' + KF.hoy() + '.xlsx');
        KF.aviso('Excel generado', 'ok');
      } catch (e) {
        KF.aviso('Error Excel: ' + e.message, 'error');
      }
    }

    pintar();
  }
});