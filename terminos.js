/* =====================================================
   Terminos y Condiciones
   Define KF.abrirTerminos() para abrir el modal con los
   terminos. Reutilizable desde cualquier modulo.
   ===================================================== */

KF.abrirTerminos = function () {

  var html = '';
  html += '<div style="font-size:13px;line-height:1.6;color:var(--gris-texto);">';

  html += '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#7b8a9a;">Última actualización</div>';
  html += '<div style="font-size:12px;color:#7b8a9a;margin-bottom:14px;">' + new Date().toLocaleDateString() + '</div>';

  html += '<h3 style="color:var(--azul-medio);font-size:14px;margin:14px 0 6px 0;">1. Aceptación</h3>';
  html += '<p>Al instalar, abrir o utilizar <b>KontaFin</b> (en lo adelante "la Aplicación"), usted acepta estos Términos y Condiciones en su totalidad. Si no está de acuerdo, no utilice la Aplicación.</p>';

  html += '<h3 style="color:var(--azul-medio);font-size:14px;margin:14px 0 6px 0;">2. Titularidad y licencia</h3>';
  html += '<p>La Aplicación KontaFin es desarrollada y comercializada por <b>Osmani Tito Corrioso</b> (en lo adelante "el Desarrollador"), bajo la marca <b>OSTICOR</b>. Todos los derechos reservados.</p>';
  html += '<p>El uso de la Aplicación está sujeto a una licencia de uso personal, no transferible y no exclusiva, concedida únicamente al usuario autorizado.</p>';

  html += '<h3 style="color:var(--azul-medio);font-size:14px;margin:14px 0 6px 0;">3. Prohibición de uso y distribución sin autorización</h3>';
  html += '<p>Queda terminantemente prohibido:</p>';
  html += '<ul style="padding-left:18px;margin:6px 0;">';
  html += '<li>Utilizar la Aplicación <b>sin la licencia y la debida autorización del Desarrollador</b>.</li>';
  html += '<li>Copiar, compartir, distribuir, revender, alquilar, sublicenciar o ceder la Aplicación (o su APK) a terceros por cualquier medio.</li>';
  html += '<li>Modificar, descompilar, aplicar ingeniería inversa o crear obras derivadas de la Aplicación.</li>';
  html += '<li>Eliminar o alterar avisos de autoría, marca o copyright.</li>';
  html += '</ul>';
  html += '<p>El incumplimiento de estas prohibiciones faculta al Desarrollador a revocar la licencia y a ejercer las acciones legales que correspondan.</p>';

  html += '<h3 style="color:var(--azul-medio);font-size:14px;margin:14px 0 6px 0;">4. Datos del usuario</h3>';
  html += '<p>La Aplicación funciona de forma local en su dispositivo. Los datos que usted introduce se almacenan únicamente en el almacenamiento interno del dispositivo. El Desarrollador no accede a ellos, salvo que usted exporte o comparta voluntariamente un respaldo.</p>';

  html += '<h3 style="color:var(--azul-medio);font-size:14px;margin:14px 0 6px 0;">5. Responsabilidad</h3>';
  html += '<p>La Aplicación se ofrece "tal cual". El Desarrollador no garantiza resultados comerciales específicos. Usted es responsable del uso correcto de los datos, precios, cálculos y decisiones de negocio.</p>';

  html += '<h3 style="color:var(--azul-medio);font-size:14px;margin:14px 0 6px 0;">6. Actualizaciones y modificaciones</h3>';
  html += '<p>El Desarrollador puede publicar actualizaciones, modificar funcionalidades o cambiar estos términos. El uso continuado de la Aplicación después de un cambio implica la aceptación de los nuevos términos.</p>';

  html += '<h3 style="color:var(--azul-medio);font-size:14px;margin:14px 0 6px 0;">7. Contacto</h3>';
  html += '<p>Para soporte, licencias o autorizaciones, escriba a: ';
  html += '<a href="mailto:osmanitito94@zoho.com" style="color:var(--dorado);font-weight:600;text-decoration:none;">osmanitito94@zoho.com</a></p>';

  html += '<div style="text-align:center;color:#7b8a9a;font-size:11px;margin-top:20px;border-top:1px solid var(--gris-borde);padding-top:10px;">';
  html += '© OSTICOR ' + new Date().getFullYear();
  html += '</div>';

  html += '</div>';

  // Modal normal: se cierra con X, Cancelar o tocar fuera.
  KF.abrirModal({
    titulo: 'Términos y Condiciones',
    contenido: html,
    textoCancelar: 'Aceptar',
    alGuardar: null
  });
};
