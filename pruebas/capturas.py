"""Capturas de las cinco pantallas en móvil (390 px) y escritorio (1280 px), con una investigación de demostración.
    python3 pruebas/capturas.py      → pruebas/capturas/*.png"""
import os, subprocess, sys, threading, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import correr
from http.server import ThreadingHTTPServer

RAIZ = correr.RAIZ
SAL = os.path.join(RAIZ, 'pruebas', 'capturas')
os.makedirs(SAL, exist_ok=True)
srv = ThreadingHTTPServer(('127.0.0.1', 8791), correr.H)
threading.Thread(target=srv.serve_forever, daemon=True).start()
perfil = os.path.join(RAIZ, 'pruebas', '.perfil_capturas')
base = ['google-chrome', '--headless=new', f'--user-data-dir={perfil}', '--no-first-run', '--hide-scrollbars', '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1']
p = subprocess.Popen(base + ['http://127.0.0.1:8791/pruebas/preparar.html'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
t0 = time.time()
while not correr.resultado and time.time() - t0 < 60:
    time.sleep(0.2)
time.sleep(2.5)   # que Chrome vuelque localStorage a disco antes de cerrarlo
p.terminate(); p.wait()
oscuro = '--oscuro' in sys.argv
for nombre, (w, h) in {'movil': (390, 1900), 'escritorio': (1280, 1500)}.items():
    for pant in ['inicio', 'laboratorio', 'instrumentos', 'investigacion', 'informe']:
        out = os.path.join(SAL, f'{pant}_{nombre}{"_oscuro" if oscuro else ""}.png')
        subprocess.run(base + [f'--window-size={w},{h}', '--virtual-time-budget=3000', *(['--force-dark-mode', '--blink-settings=preferredColorScheme=0'] if oscuro else []),
                              f'--screenshot={out}', f'http://127.0.0.1:8791/index.html#{pant}'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=60)
        print('ok' if os.path.exists(out) else 'falta', out)
srv.shutdown()
