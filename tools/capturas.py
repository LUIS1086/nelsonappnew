#!/usr/bin/env python3
"""Nelson App Pro · tools/capturas.py
Toma capturas de las pantallas principales (móvil 390×844 y escritorio 1280×900) para comparar
antes/después de cambiar CSS, y avisa de errores de JavaScript.

Requisitos (una sola vez):  pip install playwright && playwright install chromium
Uso:   python3 tools/capturas.py capturas/antes      (guarda PNG en esa carpeta)
       …haz tus cambios y corre node tools/build-css.js…
       python3 tools/capturas.py capturas/despues
Compara las dos carpetas a ojo o con cualquier visor de diferencias de imágenes."""
import sys, os, threading, http.server, socketserver, functools
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'capturas')
PORT = 8799
os.makedirs(OUT, exist_ok=True)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a,**k): pass
socketserver.TCPServer.allow_reuse_address=True
srv = socketserver.TCPServer(("127.0.0.1", PORT), functools.partial(Q, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
from playwright.sync_api import sync_playwright
MODALS = ["openCajaModal","openStatsModal","openExportPanel","openGarantiasModal","openProveedoresModal"]
HIDE = "document.querySelectorAll('[id^=modal-]').forEach(m=>m.classList.add('hidden'))"
with sync_playwright() as p:
    b = p.chromium.launch()
    for tag, w, h in [("m",390,844),("d",1280,900)]:
        ctx = b.new_context(viewport={"width":w,"height":h}, service_workers="block", locale="es-CO")
        ctx.add_init_script("localStorage.setItem('tourCompleted','1');localStorage.setItem('tutorialShown','true');")
        ctx.route("**/fonts.g*apis.com/**", lambda r: r.abort()); ctx.route("**/fonts.gstatic.com/**", lambda r: r.abort())
        pg = ctx.new_page(); errs=[]
        pg.on("pageerror", lambda e: errs.append(str(e)[:140]))
        pg.goto(f"http://127.0.0.1:{PORT}/index.html"); pg.wait_for_timeout(3000)
        pg.evaluate("_unlockAppFromAuth()"); pg.wait_for_timeout(2500)
        for t in ["taller","ordenes","ventas","admin"]:
            pg.evaluate(f"tab('{t}')"); pg.wait_for_timeout(700)
            pg.screenshot(path=f"{OUT}/index-{tag}-{t}.png")
        pg.evaluate("document.getElementById('modal-config').classList.remove('hidden')"); pg.wait_for_timeout(800)
        pg.screenshot(path=f"{OUT}/modal-{tag}-config.png"); pg.evaluate(HIDE)
        for fn in MODALS:
            try:
                pg.evaluate("tab('admin')"); pg.evaluate(f"{fn}()"); pg.wait_for_timeout(800)
                pg.screenshot(path=f"{OUT}/modal-{tag}-{fn}.png"); pg.evaluate(HIDE)
            except Exception as e: errs.append(fn+" "+str(e)[:70])
        pg2 = ctx.new_page(); pg2.on("pageerror", lambda e: errs.append("dash "+str(e)[:140]))
        pg2.goto(f"http://127.0.0.1:{PORT}/dashboard.html"); pg2.wait_for_timeout(3500)
        pg2.screenshot(path=f"{OUT}/dash-{tag}.png")
        print(tag, "errores:", errs); ctx.close()
    b.close()
srv.shutdown()
