name: Actualizar datos de la web

on:
  schedule:
    - cron: "0 5 * * *"   # todos los dias a las 05:00 UTC (07:00 en Espana en verano)
  workflow_dispatch:        # permite lanzarlo a mano desde la pestana Actions

permissions:
  contents: write

jobs:
  actualizar:
    runs-on: ubuntu-latest
    steps:
      - name: Descargar el repositorio
        uses: actions/checkout@v4

      - name: Preparar Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Descargar resultados y regenerar datos.js
        env:
          FOOTBALL_DATA_KEY: ${{ secrets.FOOTBALL_DATA_KEY }}
        run: python scripts/actualizar_datos.py

      - name: Publicar los datos nuevos
        run: |
          git config user.name "cuotajusta-bot"
          git config user.email "actions@users.noreply.github.com"
          git add datos.js datos.json
          if git diff --cached --quiet; then
            echo "Sin cambios que publicar"
          else
            git commit -m "Datos actualizados automaticamente"
            git push
          fi
