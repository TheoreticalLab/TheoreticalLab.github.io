"""Capturas del examen virtual en tamaño móvil (Chrome sin pantalla; biblioteca estándar de Python).

    python3 examen/pruebas/capturas.py      → pruebas/capturas/examen_*.png"""
import os, subprocess, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SAL = os.path.join(RAIZ, 'pruebas', 'capturas')


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=RAIZ, **k)

    def log_message(self, *a):
        pass


def main():
    os.makedirs(SAL, exist_ok=True)
    srv = ThreadingHTTPServer(('127.0.0.1', 0), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{srv.server_address[1]}/examen/'
    paginas = [(m, f'pruebas/preparar.html?modo={m}') for m in ('entrada', 'examen', 'bloqueo', 'entregado')] + [('docente', 'docente.html')]
    for nombre, ruta in paginas:
        out = os.path.join(SAL, f'examen_{nombre}.png')
        subprocess.run(['google-chrome', '--headless=new', '--no-first-run', f'--user-data-dir={os.path.join(RAIZ, "pruebas", ".perfil_chrome")}',
                        '--window-size=400,860', '--virtual-time-budget=5000', f'--screenshot={out}', base + ruta],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=60)
        print('ok' if os.path.exists(out) else 'FALTA', out)
    srv.shutdown()


if __name__ == '__main__':
    main()
