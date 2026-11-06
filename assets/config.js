// Configuración del sitio. Es el único archivo que hace falta tocar para conectar datos y formularios.
window.CONFIG = {
  // Clave de MapTiler para el fondo del mapa (cloud.maptiler.com > API keys).
  // Restringila al dominio del sitio en "Allowed HTTP origins". Si queda vacía, se usa OpenStreetMap.
  MAPTILER_KEY: "",

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
