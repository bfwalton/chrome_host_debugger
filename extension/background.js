importScripts("pac.js");

const RULES_URL = "http://localhost:8099/rules";

async function apply() {
  const { enabled = true, rules = [] } = await chrome.storage.local.get(["enabled", "rules"]);
  const active = enabled ? rules.filter((r) => r.on && r.host && r.target) : [];

  // Push rules to the proxy; it persists them, so a missed sync only matters while it is down.
  fetch(RULES_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(active.map(({ host, target }) => ({ host, target }))),
  }).catch(() => {});

  if (!active.length) {
    await chrome.proxy.settings.clear({ scope: "regular" });
    return;
  }
  await chrome.proxy.settings.set({
    value: { mode: "pac_script", pacScript: { data: buildPac(active) } },
    scope: "regular",
  });
}

chrome.storage.onChanged.addListener(apply);
chrome.runtime.onInstalled.addListener(apply);
chrome.runtime.onStartup.addListener(apply);
