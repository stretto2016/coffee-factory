# 로컬 미리보기용 서버. vercel.json 의 rewrites 처럼 /brand, /beans 등을 index.html 로 돌려준다.
import http.server
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(ROOT, 'vercel.json'), encoding='utf-8') as f:
    REWRITES = {r['source']: r['destination'] for r in json.load(f)['rewrites']}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        path, sep, query = self.path.partition('?')
        if path in REWRITES:
            self.path = REWRITES[path] + sep + query
        super().do_GET()


if __name__ == '__main__':
    http.server.ThreadingHTTPServer(('127.0.0.1', 8124), Handler).serve_forever()
