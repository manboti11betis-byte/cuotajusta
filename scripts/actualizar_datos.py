# -*- coding: utf-8 -*-
"""Actualiza datos.js con resultados y plantillas reales de football-data.org.

Lo ejecuta la GitHub Action cada dia. Necesita la variable de entorno
FOOTBALL_DATA_KEY (la clave gratuita de football-data.org, guardada como
"secret" en GitHub). Para cada competicion descarga dos cosas:

  1. Los partidos terminados -> medias de goles de cada equipo.
  2. Las plantillas de todos los equipos -> mercados de jugadores.

Si una competicion no devuelve suficientes datos (por ejemplo, una liga en
verano), se conservan los datos anteriores para que la web nunca quede vacia.
"""
import json
import os
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from datetime import date, timedelta

API_PARTIDOS = "https://api.football-data.org/v4/competitions/{}/matches?status=FINISHED"
API_EQUIPOS = "https://api.football-data.org/v4/competitions/{}/teams"
API_PROXIMOS = ("https://api.football-data.org/v4/competitions/{}/matches"
                "?dateFrom={}&dateTo={}")

COMPETICIONES = {  # codigo -> (nombre, neutral, minimo de equipos)
    "WC":  ("Mundial 2026", True, 8),
    "PD":  ("LaLiga (España)", False, 14),
    "PL":  ("Premier League (Inglaterra)", False, 14),
    "SA":  ("Serie A (Italia)", False, 14),
    "BL1": ("Bundesliga (Alemania)", False, 12),
    "FL1": ("Ligue 1 (Francia)", False, 12),
}

NOTA_NEUTRAL = ("Campo neutral · Medias de todo el torneo · "
                "Probabilidades a 90 minutos (sin prórroga ni penaltis)")
NOTA_LIGA = "Medias por partido de la temporada en curso"

# Jugadores estrella: reciben un extra en los mercados de gol y faltas
ESTRELLAS = [
    "mbappe", "haaland", "kane", "messi", "lamine yamal", "vinicius",
    "salah", "cristiano ronaldo", "lewandowski", "bellingham", "musiala",
    "wirtz", "kudus", "luis diaz", "isak", "gyokeres", "de bruyne",
    "lautaro", "julian alvarez", "raul jimenez", "pedri", "nico williams",
    "raphinha", "saka", "palmer", "odegaard", "griezmann", "dembele",
    "olise", "doku", "pulisic", "gakpo", "xavi simons", "kvaratskhelia",
    "osimhen", "mane", "en-nesyri", "hakimi", "modric", "gvardiol",
    "foden", "rodrygo", "openda", "leao", "bruno fernandes", "amoura",
    "marmoush", "jonathan david", "enciso", "mahrez", "semenyo",
]

ORDEN_POS = {"DEL": 0, "MED": 1, "DEF": 2, "POR": 3}


def normalizar(texto):
    plano = unicodedata.normalize("NFKD", texto or "")
    return "".join(c for c in plano if not unicodedata.combining(c)).lower()


def es_estrella(nombre):
    nombre_plano = normalizar(nombre)
    return any(estrella in nombre_plano for estrella in ESTRELLAS)


def posicion_corta(posicion):
    plano = normalizar(posicion)
    if "keeper" in plano or "porter" in plano:
        return "POR"
    if "back" in plano or "defen" in plano:
        return "DEF"
    if "midfield" in plano or "medio" in plano:
        return "MED"
    return "DEL"


def pedir(url, clave):
    peticion = urllib.request.Request(url, headers={"X-Auth-Token": clave})
    with urllib.request.urlopen(peticion, timeout=30) as respuesta:
        return json.loads(respuesta.read().decode("utf-8"))


def agregar(partidos, neutral):
    """Convierte una lista de partidos en medias de goles por equipo."""
    acumulado = {}  # nombre -> [gf_casa, gc_casa, n_casa, gf_fuera, gc_fuera, n_fuera]

    def caja(nombre):
        if nombre not in acumulado:
            acumulado[nombre] = [0, 0, 0, 0, 0, 0]
        return acumulado[nombre]

    for p in partidos:
        marcador = (p.get("score") or {}).get("fullTime") or {}
        gl, gv = marcador.get("home"), marcador.get("away")
        if gl is None or gv is None:
            continue
        local = ((p.get("homeTeam") or {}).get("shortName")
                 or (p.get("homeTeam") or {}).get("name"))
        visitante = ((p.get("awayTeam") or {}).get("shortName")
                     or (p.get("awayTeam") or {}).get("name"))
        if not local or not visitante:
            continue
        cl, cv = caja(local), caja(visitante)
        cl[0] += gl; cl[1] += gv; cl[2] += 1
        cv[3] += gv; cv[4] += gl; cv[5] += 1

    equipos = {}
    for nombre, c in acumulado.items():
        if neutral:
            total = c[2] + c[5]
            if total == 0:
                continue
            gf = (c[0] + c[3]) / total
            gc = (c[1] + c[4]) / total
            equipos[nombre] = [round(max(gf, 0.1), 2), round(max(gc, 0.3), 2)]
        else:
            if c[2] == 0 or c[5] == 0:
                continue
            equipos[nombre] = [
                round(max(c[0] / c[2], 0.1), 2), round(max(c[1] / c[2], 0.3), 2),
                round(max(c[3] / c[5], 0.1), 2), round(max(c[4] / c[5], 0.3), 2),
            ]
    return equipos


def extraer_equipos_info(respuesta_equipos):
    """De la respuesta de /teams saca plantillas y escudos de cada equipo."""
    plantillas, escudos = {}, {}
    for equipo in respuesta_equipos.get("teams", []):
        nombre_equipo = equipo.get("shortName") or equipo.get("name")
        if equipo.get("crest"):
            escudos[nombre_equipo] = equipo["crest"]
        plantel = equipo.get("squad") or []
        jugadores = []
        for j in plantel:
            nombre = j.get("name")
            if not nombre:
                continue
            pos = posicion_corta(j.get("position") or "")
            jugadores.append([nombre, pos, 1 if es_estrella(nombre) else 0])
        if jugadores:
            jugadores.sort(key=lambda x: (ORDEN_POS.get(x[1], 9), x[0]))
            plantillas[nombre_equipo] = jugadores
    return plantillas, escudos


def extraer_partidos(respuesta):
    """De la respuesta de /matches saca los partidos aun por jugar."""
    partidos = []
    for p in respuesta.get("matches", []):
        if p.get("status") not in ("SCHEDULED", "TIMED"):
            continue
        local = ((p.get("homeTeam") or {}).get("shortName")
                 or (p.get("homeTeam") or {}).get("name"))
        visitante = ((p.get("awayTeam") or {}).get("shortName")
                     or (p.get("awayTeam") or {}).get("name"))
        fecha = p.get("utcDate")
        if local and visitante and fecha:
            partidos.append([local, visitante, fecha])
    partidos.sort(key=lambda x: x[2])
    return partidos[:40]


def main():
    clave = os.environ.get("FOOTBALL_DATA_KEY")
    if not clave:
        print("ERROR: falta la variable FOOTBALL_DATA_KEY")
        sys.exit(1)

    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ruta_json = os.path.join(raiz, "datos.json")
    ruta_js = os.path.join(raiz, "datos.js")

    anteriores = {}
    if os.path.exists(ruta_json):
        try:
            with open(ruta_json, encoding="utf-8") as f:
                anteriores = json.load(f).get("competiciones", {})
        except (json.JSONDecodeError, OSError) as e:
            # Si datos.json se corrompiera alguna vez, sin este try/except el robot
            # se quedaria roto para siempre (fallaria tambien manana, y pasado...).
            # Mejor seguir sin datos anteriores que morir en bucle cada dia.
            print(f"AVISO: no se pudo leer datos.json anterior ({e}); se sigue sin el")

    datos = {"actualizado": date.today().isoformat(), "competiciones": {}}

    for codigo, (nombre, neutral, minimo) in COMPETICIONES.items():
        equipos, plantillas, escudos = {}, {}, {}
        partidos = None

        try:
            respuesta = pedir(API_PARTIDOS.format(codigo), clave)
            equipos = agregar(respuesta.get("matches", []), neutral)
            print(f"{codigo}: {len(equipos)} equipos con medias de goles")
        except urllib.error.HTTPError as e:
            print(f"{codigo} partidos: error HTTP {e.code}")
        except Exception as e:  # noqa: BLE001
            print(f"{codigo} partidos: error {e}")
        time.sleep(7)  # limite gratuito: 10 peticiones por minuto

        try:
            respuesta = pedir(API_EQUIPOS.format(codigo), clave)
            plantillas, escudos = extraer_equipos_info(respuesta)
            print(f"{codigo}: plantillas de {len(plantillas)} equipos, "
                  f"{len(escudos)} escudos")
        except urllib.error.HTTPError as e:
            print(f"{codigo} plantillas: error HTTP {e.code}")
        except Exception as e:  # noqa: BLE001
            print(f"{codigo} plantillas: error {e}")
        time.sleep(7)

        try:
            hoy = date.today()
            # 14 dias: coincide con la ventana que usa motor.js (partidosSemana) en la
            # web. Antes eran 7 dias, lo que dejaba la portada vacia mas a menudo de lo
            # necesario (ej. entre jornadas o si el robot fallaba un dia).
            tope = hoy + timedelta(days=14)
            respuesta = pedir(
                API_PROXIMOS.format(codigo, hoy.isoformat(), tope.isoformat()),
                clave)
            partidos = extraer_partidos(respuesta)
            print(f"{codigo}: {len(partidos)} partidos en los próximos 14 días")
        except urllib.error.HTTPError as e:
            print(f"{codigo} partidos próximos: error HTTP {e.code}")
        except Exception as e:  # noqa: BLE001
            print(f"{codigo} partidos próximos: error {e}")
        time.sleep(7)

        previo = anteriores.get(nombre, {})

        if len(equipos) >= minimo:
            entrada = {
                "codigo": codigo,
                "neutral": neutral,
                "nota": NOTA_NEUTRAL if neutral else NOTA_LIGA,
                "equipos": dict(sorted(equipos.items())),
            }
        elif previo:
            print(f"{codigo}: pocos datos nuevos, se conservan los anteriores")
            entrada = dict(previo)
        else:
            continue

        if plantillas:
            entrada["plantillas"] = plantillas
        elif previo.get("plantillas"):
            entrada["plantillas"] = previo["plantillas"]

        if escudos:
            entrada["escudos"] = escudos
        elif previo.get("escudos"):
            entrada["escudos"] = previo["escudos"]

        if partidos is not None:
            entrada["partidos"] = partidos
        elif previo.get("partidos"):
            entrada["partidos"] = previo["partidos"]

        datos["competiciones"][nombre] = entrada

    if not datos["competiciones"]:
        print("Sin datos de ninguna competicion; no se escribe nada")
        sys.exit(1)

    contenido = json.dumps(datos, ensure_ascii=False, indent=1)
    with open(ruta_json, "w", encoding="utf-8") as f:
        f.write(contenido)
    with open(ruta_js, "w", encoding="utf-8") as f:
        f.write("// Este archivo lo actualiza automaticamente la GitHub Action.\n")
        f.write("window.DATOS_LIGAS = " + contenido + ";\n")
    print("datos.js actualizado:", datos["actualizado"])


if __name__ == "__main__":
    main()
