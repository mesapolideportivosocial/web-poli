# Web de los Polideportivos Sociales

Sitio público de los 83 Polideportivos Sociales de la Municipalidad de Córdoba: un mapa con todos los polideportivos, un buscador de actividades por edad, día y turno, y una ficha por polideportivo con su propia dirección (`/#/p/<id>`), pensada para el código QR de la entrada.

Es un sitio estático: no tiene servidor ni base de datos. Se publica con GitHub Pages.

## Cómo está armado

```
index.html                 estructura de la página
assets/styles.css          estilos (manual de marca: Maven Pro, navy, granate, franjas)
assets/app.js              lógica: carga de datos, mapa, buscador, fichas
assets/config.js           ÚNICO archivo de configuración (planilla, WhatsApp, formularios)
data/polideportivos.json   los 83 polideportivos: nombre, dirección, ubicación
data/actividades.json      actividades de ejemplo (se reemplaza por la planilla)
```

El mapa usa [Leaflet](https://leafletjs.com) con la base de OpenStreetMap/CARTO. No requiere clave de Google ni tiene costo.

## Cómo se actualizan las actividades

Las actividades **no se editan en el código**. La idea es que salgan de una planilla de Google:

1. Crear una pestaña "Web" en la planilla de respuestas del relevamiento con estas columnas (la primera fila son los encabezados, en este orden o en cualquier orden):

   | poli | actividad | categoria | horarios | edades | costo | dicta | publicar |
   |---|---|---|---|---|---|---|---|
   | marcos-sastre | Fútbol femenino | Deporte | Mar tarde; Jue tarde | 11-13; 14-16 | Gratuita | Club X | Sí |

   - `poli`: el `id` del polideportivo, tal como figura en `data/polideportivos.json` (por ejemplo `villa-el-libertador`).
   - `horarios`: día (`Lun`, `Mar`, `Mié`, `Jue`, `Vie`, `Sáb`, `Dom`) y turno (`mañana`, `tarde`, `noche`), separados por `;`.
   - `edades`: franjas del formulario, separadas por `;`: `hasta-6`, `7-10`, `11-13`, `14-16`, `17-29`, `30-59`, `60+`.
   - `costo`: `Gratuita`, `Con aporte` o `Consultar`.
   - `publicar`: solo se muestran las filas con `Sí`. El equipo revisa antes de publicar.

2. En la planilla: **Archivo → Compartir → Publicar en la web**, elegir la pestaña "Web" y formato **CSV**. Copiar el enlace.
3. Pegar ese enlace en `assets/config.js`, en `ACTIVIDADES_CSV`.

Desde ese momento, cualquier cambio en la planilla aparece en la web al recargar, sin tocar código.

## Datos de cada polideportivo

En `data/polideportivos.json` se pueden completar, por polideportivo:

- `horario_apertura`: texto libre, por ejemplo "Lunes a sábado, de 9 a 21".
- `instalaciones`: lista, por ejemplo `["Playón", "SUM", "Baños"]`.
- `proxima_mesa`: fecha de la próxima mesa territorial.
- `whatsapp`: número **institucional** del polideportivo, sin `+` ni espacios. Si queda vacío, se usa `WHATSAPP_GENERAL` de `config.js`.

> No se cargan en este repositorio nombres ni teléfonos personales de coordinadores: el repositorio y el sitio son públicos. Publicar un teléfono personal requiere el consentimiento de la persona.

## Formularios

En `assets/config.js` se cargan los enlaces de los formularios de Google para proponer una actividad, pedir una actividad, acuerdos de uso para instituciones y "avisanos si algo cambió". Mientras estén vacíos, el sitio los muestra como "próximamente".

## Publicación

GitHub Pages, desde la rama `main`, carpeta raíz: **Settings → Pages → Deploy from a branch → main / (root)**.
