// Configuración del sitio. Es el único archivo que hace falta tocar para conectar datos y formularios.
window.CONFIG = {
  // Planilla de Google publicada como CSV (Archivo > Compartir > Publicar en la web > pestaña "Web" > CSV).
  // Si queda vacío, el sitio usa data/actividades.json.
  ACTIVIDADES_CSV: "",

  // Número de WhatsApp institucional que se usa cuando un polideportivo no tiene uno propio.
  // Formato internacional sin "+" ni espacios, por ejemplo "5493510000000".
  WHATSAPP_GENERAL: "",

  // Formularios de Google para la sección "Sumate".
  FORM_PROPONER: "",
  FORM_PEDIR: "",
  FORM_INSTITUCIONES: "",
  FORM_ACTUALIZAR: ""
};
