"""Serves the frontend from the same origin as the API — no separate frontend port.

Dev: returns an HTML shell whose `<script>` tags point at the Vite dev server
(`settings.web_base_url`) for `@vite/client` (HMR) and the app entrypoint. Only
those two script loads are cross-origin; every other frontend request (fetch
calls, client-side routing) resolves against this origin, same pattern as
django-vite.

Prod: serves the Vite-built `web/dist` directly — `/assets/*` are the hashed
JS/CSS bundles, and `index.html` is returned for any other non-API path so
React Router can handle client-side routes on direct navigation/refresh.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse, Response
from fastapi.staticfiles import StaticFiles

from app.config import settings

WEB_DIST_DIR = Path(__file__).resolve().parent.parent.parent / "web" / "dist"

_DEV_SHELL_TEMPLATE = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>shopper</title>
    <!-- Must mirror web/index.html: this shell replaces it in development, so
         a font added there is invisible on :8000 unless it is added here too. -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module">
      import RefreshRuntime from "{origin}/@react-refresh"
      RefreshRuntime.injectIntoGlobalHook(window)
      window.$RefreshReg$ = () => {{}}
      window.$RefreshSig$ = () => (type) => type
      window.__vite_plugin_react_preamble_installed__ = true
    </script>
    <script type="module" src="{origin}/@vite/client"></script>
    <script type="module" src="{origin}/src/main.tsx"></script>
  </body>
</html>
"""


def register_spa(app: FastAPI) -> None:
    is_dev = settings.app_env == "development"

    if not is_dev and (WEB_DIST_DIR / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=WEB_DIST_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str) -> Response:
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")

        if is_dev:
            return HTMLResponse(_DEV_SHELL_TEMPLATE.format(origin=settings.web_base_url))

        index = WEB_DIST_DIR / "index.html"
        if not index.is_file():
            return HTMLResponse(
                "Frontend not built — run `npm run build` in web/.", status_code=503
            )
        return FileResponse(index)
