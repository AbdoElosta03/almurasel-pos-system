"""Serve the built frontend and the API from one local production process."""

from pathlib import Path

from fastapi import HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.main import app


DIST = Path(__file__).resolve().parents[1] / "frontend" / "dist"
INDEX = DIST / "index.html"
if not INDEX.is_file():
    raise RuntimeError("Frontend build missing. Run npm run build in frontend first.")

app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="frontend-assets")


@app.api_route("/", methods=["GET", "HEAD"], include_in_schema=False)
@app.api_route("/{path:path}", methods=["GET", "HEAD"], include_in_schema=False)
def frontend(path: str = ""):
    # Vite copies public files (manifest, icons, product images) to the dist root.
    requested = (DIST / path).resolve()
    if requested.is_relative_to(DIST.resolve()) and requested.is_file():
        return FileResponse(requested)
    # Never turn missing API endpoints or static files into the login page.
    if path == "api" or path.startswith("api/") or "." in Path(path).name:
        raise HTTPException(status_code=404)
    return FileResponse(INDEX)
