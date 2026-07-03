# -*- coding: utf-8 -*-
"""Actualiza datos.js con resultados reales de football-data.org.

Lo ejecuta la GitHub Action cada dia. Necesita la variable de entorno
FOOTBALL_DATA_KEY (la clave gratuita de football-data.org, guardada
como "secret" en GitHub). Si una competicion no devuelve suficientes
partidos (por ejemplo, una liga en verano), se conservan sus datos
anteriores para que la web nunca se quede vacia.
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error
from datetime import date

API = "https://api.football-data.org/v4/competitions/{}/matches?status=FINISHED"

COMPETICIONES = {  # codigo -> (nombre, neutral, minimo de equipos)
    "WC":  ("Mundial 2026", True, 8),   # minimo de equipos con datos
    "PD":  ("LaLiga (España)", False, 14),
    "PL":  ("Premier League (Inglaterra)", False, 14),
    "SA":  ("Serie A (Italia)", False, 14),
    "BL1": ("Bundesliga (Alemania)", False, 12),
    "FL1": ("Ligue 1 (Francia)", False, 12),
}

NOTA_NEUTRAL = ("Campo neutral · Medias de todo el torneo · "
                "Probabilidades a 90 minutos (sin prórroga ni penaltis)")
NOTA_LIGA = "Medias por partido de la temporada en curso"


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
            equipos[nombre] = [round(gf, 2), round(max(gc, 0.3), 2)]
        else:
            if c[2] == 0 or c[5] == 0:
                continue
            equipos[nombre] = [
                round(c[0] / c[2], 2), round(max(c[1] / c[2], 0.3), 2),
                round(c[3] / c[5], 2), round(max(c[4] / c[5], 0.3), 2),
            ]
    return equipos


def main():
    clave = os.environ.get("FOOTBALL_DATA_KEY")
    if not clave:
        print("ERROR: falta la variable FOOTBALL_DATA_KEY")
        sys.exit(1)

    raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ruta_json = os.path.join(raiz, "datos.json")
    ruta_js = os.path.join(raiz, "datos.js")

    # Datos anteriores, por si alguna competicion viene vacia
    anteriores = {}
    if os.path.exists(ruta_json):
        with open(ruta_json, encoding="utf-8") as f:
            anteriores = json.load(f).get("competiciones", {})

    datos = {"actualizado": date.today().isoformat(), "competiciones": {}}

    for codigo, (nombre, neutral, minimo) in COMPETICIONES.items():
        equipos = {}
        try:
            respuesta = pedir(API.format(codigo), clave)
            partidos = respuesta.get("matches", [])
            equipos = agregar(partidos, neutral)
            print(f"{codigo}: {len(partidos)} partidos, {len(equipos)} equipos")
        except urllib.error.HTTPError as e:
            print(f"{codigo}: error HTTP {e.code}")
        except Exception as e:  # noqa: BLE001 - registramos y seguimos
            print(f"{codigo}: error {e}")

        if len(equipos) >= minimo:
            datos["competiciones"][nombre] = {
                "codigo": codigo,
                "neutral": neutral,
                "nota": NOTA_NEUTRAL if neutral else NOTA_LIGA,
                "equipos": dict(sorted(equipos.items())),
            }
        elif nombre in anteriores:
            print(f"{codigo}: pocos datos nuevos, se conservan los anteriores")
            datos["competiciones"][nombre] = anteriores[nombre]

        time.sleep(7)  # respeta el limite gratuito de 10 peticiones/minuto

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
