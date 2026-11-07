# Local Host Router

Chrome extension plus a local proxy that route chosen domains to local Docker ports, over HTTP and HTTPS, with no hosts file edit and no admin rights.
Type `https://taco.com` in Chrome and it loads whatever is listening on `localhost:8080`.

## How it works

```
Chrome ──PAC: host listed?── no ──→ DIRECT
              │ yes
              ▼
        mitmproxy :8081  (cert for the domain signed by your local CA)
          addon.py: domain → target, forwards plain HTTP, keeps Host header, adds X-Forwarded-Proto
              ▲
 Extension ──POST localhost:8099/rules── on every change in the popup
```

- `extension/`: popup UI for the rule list, builds a PAC script (`chrome.proxy`), and syncs rules to the proxy.
- `proxy/`: mitmproxy in Docker (`mitmweb`) with `addon.py`. The inspector UI at http://localhost:8082 (password `dev`) shows every request for listed domains.
- The container never needs TLS. The app sees `Host: <domain>` and `X-Forwarded-Proto: https`.

## Setup

```sh
# 1. proxy (creates proxy/data/ with the CA on first run)
cd proxy && docker compose up -d

# 2. trust the CA once (login keychain, prompts for your password, no admin needed), then restart Chrome
security add-trusted-cert -r trustRoot -k ~/Library/Keychains/login.keychain-db proxy/data/mitmproxy-ca-cert.pem

# 3. extension: chrome://extensions → Developer mode → Load unpacked → select extension/
```

Then open the extension popup, add a rule (host `www.apple.com` or `*.suite.test`, target `3000` or `host:port`), tick **Enabled**. The popup shows whether the proxy is online.

## Try it

```sh
cd sample && docker compose up -d     # nginx on :8080, echoes the Host header
```

Add `*.taco.com` → `8080`, open `https://taco.com`: `Host header: taco.com`.

```sh
node extension/test_pac.js            # PAC tests
```

## Notes and limits

- **Targets resolve inside the proxy container.** `localhost`/`127.0.0.1` are rewritten to `host.docker.internal`. Use compose service names for other containers, or run mitmproxy natively and set `LOCAL_ALIAS=localhost`.
- **Proxy down means listed domains fail** (Chrome shows a proxy error).
- **Trusted CA is powerful.** `proxy/data/` holds its private key, is gitignored, and the proxy ports are bound to 127.0.0.1 only. Keep it that way.
- **HSTS-preloaded domains work too** (apple.com, `.dev`), because Chrome trusts your CA for them.
- **Sync endpoint:** `:8099` sends no CORS headers and requires `Content-Type: application/json`, so web pages can't change your rules; the extension can.
- **One proxy owner.** Conflicts with other proxy or VPN extensions.
- Prefer `.test` or `.localhost` names for new projects.

## Layout

```
extension/   manifest.json, background.js, pac.js, popup.html, popup.js, test_pac.js
proxy/       docker-compose.yml, addon.py (data/ is generated, gitignored)
sample/      docker-compose.yml, nginx.conf, index.html
```
