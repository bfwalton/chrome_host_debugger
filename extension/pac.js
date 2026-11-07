// Builds a PAC script: listed hosts (http and https) go to the local mitmproxy, everything else DIRECT.
// rules: [{host, target, on}]. host may use * wildcards; "*.x" also matches bare "x".
const PROXY = "PROXY 127.0.0.1:8081";
function buildPac(rules) {
  const branches = rules
    .filter((r) => r.on && r.host && r.target)
    .map((r) => {
      const apex = r.host.startsWith("*.") ? ` || host === ${JSON.stringify(r.host.slice(2))}` : "";
      return `if (shExpMatch(host, ${JSON.stringify(r.host)})${apex}) return ${JSON.stringify(PROXY)};`;
    });
  return `function FindProxyForURL(url, host) {
  ${branches.join("\n  ")}
  return "DIRECT";
}`;
}
if (typeof module !== "undefined") module.exports = { buildPac };
