"""Capturas del mensaje emergente con el científico (móvil, claro y oscuro, dos instantes de la animación)."""
import os, subprocess, sys, threading
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import correr
from http.server import ThreadingHTTPServer
srv = ThreadingHTTPServer(('127.0.0.1', 8792), correr.H)
threading.Thread(target=srv.serve_forever, daemon=True).start()
SAL = os.path.join(correr.RAIZ, 'pruebas', 'capturas'); os.makedirs(SAL, exist_ok=True)
perfil = os.path.join(correr.RAIZ, 'pruebas', '.perfil_capturas')
for tema, extra in [('claro', []), ('oscuro', ['--force-dark-mode', '--blink-settings=preferredColorScheme=0'])]:
    for ms in (400, 1700):
        out = os.path.join(SAL, f'emergente_{tema}_{ms}.png')
        subprocess.run(['google-chrome', '--headless=new', f'--user-data-dir={perfil}', '--hide-scrollbars', '--window-size=390,844', f'--virtual-time-budget={ms}', *extra,
                        f'--screenshot={out}', 'http://127.0.0.1:8792/pruebas/vista_emergente.html'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=60)
        print('ok' if os.path.exists(out) else 'falta', out)
srv.shutdown()
