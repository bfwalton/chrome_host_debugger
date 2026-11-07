"""Routes listed domains to local targets and serves a rule-sync endpoint on :8099."""
import fnmatch
import json
import os
import re
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from mitmproxy import http

RULES_FILE = "/home/mitmproxy/.mitmproxy/rules.json"
# Targets resolve inside the container, so localhost means the Docker host.
LOCAL_ALIAS = os.environ.get("LOCAL_ALIAS", "host.docker.internal")
HOST_RE = re.compile(r"^[a-z0-9*.-]+$", re.I)
TARGET_RE = re.compile(r"^(\d{1,5}|[a-z0-9.-]+:\d{1,5})$", re.I)

rules: dict[str, str] = {}
_started = False


def normalize(target: str) -> tuple[str, int]:
    if target.isdigit():
        target = f"localhost:{target}"
    host, _, port = target.rpartition(":")
    if host in ("localhost", "127.0.0.1"):
        host = LOCAL_ALIAS
    return host, int(port)


def resolve(host: str):
    for pattern, target in rules.items():
        if fnmatch.fnmatch(host, pattern) or (pattern.startswith("*.") and host == pattern[2:]):
            return normalize(target)
    return None


def request(flow: http.HTTPFlow) -> None:
    original_host = flow.request.pretty_host
    dest = resolve(original_host)
    if not dest:
        return
    was_https = flow.request.scheme == "https"
    flow.request.scheme = "http"  # upstream container needs no TLS
    flow.request.host, flow.request.port = dest
    flow.request.headers["Host"] = original_host  # app sees the domain you typed
    flow.request.headers["X-Forwarded-Proto"] = "https" if was_https else "http"


class SyncHandler(BaseHTTPRequestHandler):
    # No CORS headers on purpose: a web page can't POST JSON here (preflight fails),
    # but the extension can (host permissions bypass CORS).
    def _reply(self, code: int, body: dict | None = None):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(body or {}).encode())

    def do_GET(self):
        self._reply(200, {"rules": rules})

    def do_POST(self):
        if self.path != "/rules" or self.headers.get("Content-Type") != "application/json":
            return self._reply(400, {"error": "POST /rules as application/json"})
        try:
            incoming = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            clean = {r["host"].lower(): r["target"] for r in incoming}
            assert all(HOST_RE.match(h) and TARGET_RE.match(t) for h, t in clean.items())
        except Exception:
            return self._reply(400, {"error": "bad rules"})
        rules.clear()
        rules.update(clean)
        with open(RULES_FILE, "w") as handle:
            json.dump(rules, handle)
        self._reply(200, {"rules": rules})

    def log_message(self, *args):
        pass


def load(loader) -> None:
    global _started
    if _started:
        return
    _started = True
    if os.path.exists(RULES_FILE):
        rules.update(json.load(open(RULES_FILE)))
    server = ThreadingHTTPServer(("0.0.0.0", 8099), SyncHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
