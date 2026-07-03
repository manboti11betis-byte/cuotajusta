# CuotaJusta

Analizador de apuestas de fútbol: introduces tu apuesta, la casa y la cuota,
y el modelo (distribución de Poisson sobre goles esperados) te devuelve la
probabilidad estimada de acierto y si la cuota tiene valor.

## Qué es cada archivo

- `index.html` — la web completa (diseño + modelo). No hace falta tocarla.
- `datos.js` — las medias de goles de cada equipo. Lo reescribe solo la
  GitHub Action cada día.
- `datos.json` — copia de los datos que usa el script para no perder
  información cuando una liga está de vacaciones.
- `scripts/actualizar_datos.py` — descarga los resultados reales de
  football-data.org y regenera `datos.js`.
- `.github/workflows/actualizar-datos.yml` — el "robot" de GitHub que ejecuta
  el script cada mañana a las 07:00 (hora española de verano).

## Puesta en marcha (resumen)

1. Sube todo el contenido de esta carpeta a un repositorio público de GitHub.
2. Activa GitHub Pages (Settings → Pages → rama `main`).
3. Crea una cuenta gratuita en football-data.org y copia tu API token.
4. En el repositorio: Settings → Secrets and variables → Actions →
   New repository secret → nombre `FOOTBALL_DATA_KEY`, valor: tu token.
5. Pestaña Actions → "Actualizar datos de la web" → Run workflow.

A partir de ahí la web se actualiza sola todos los días.

## Aviso

Herramienta educativa (+18). Ningún modelo garantiza aciertos y las casas de
apuestas incluyen siempre un margen a su favor. Juega con responsabilidad
(jugarbien.es).
