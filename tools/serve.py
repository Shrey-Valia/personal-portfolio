# Local dev server: plain static files, but never cached, so edits to ES
# modules show up on reload. (GitHub Pages serves the real site.)
import http.server, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
http.server.ThreadingHTTPServer(('', port), NoCache).serve_forever()
