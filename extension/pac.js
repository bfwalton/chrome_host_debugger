// Builds a PAC script from rules: [{host, target, on}]. host may use * wildcards.
// target is "3000" or "127.0.0.1:3000". Only http: is proxied; https goes DIRECT (ponytail: no HTTPS yet).
function buildPac(rules) {
  const branches = rules
    .filter((r) => r.on && r.host && r.target)
    .map((r) => {
      const target = /^\d+$/.test(r.target) ? `127.0.0.1:${r.target}` : r.target;
      // "*.x" also matches bare "x"
      const apex = r.host.startsWith("*.") ? ` || host === ${JSON.stringify(r.host.slice(2))}` : "";
      return `if (shExpMatch(host, ${JSON.stringify(r.host)})${apex}) return ${JSON.stringify("PROXY " + target)};`;
    });
  return `function FindProxyForURL(url, host) {
  if (url.substring(0, 5) !== "http:") return "DIRECT";
  ${branches.join("\n  ")}
  return "DIRECT";
}`;
}
// DNR rules redirecting https -> http for active hosts (main_frame must be listed explicitly or it is skipped).
const ALL_TYPES = ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "media", "websocket", "other"];
function hostRegex(host) {
  const esc = (t) => t.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/:?#]*");
  const apex = host.startsWith("*.");
  return (apex ? "(?:[^/:?#]*\\.)?" + esc(host.slice(2)) : esc(host));
}
function buildDnrRules(rules) {
  return rules
    .filter((r) => r.on && r.host && r.target)
    .map((r, i) => ({
      id: i + 1,
      priority: 1,
      action: { type: "redirect", redirect: { transform: { scheme: "http", port: "" } } },
      condition: { regexFilter: "^https://" + hostRegex(r.host) + "(?:[:/?#]|$)", resourceTypes: ALL_TYPES },
    }));
}
if (typeof module !== "undefined") module.exports = { buildPac, buildDnrRules };
