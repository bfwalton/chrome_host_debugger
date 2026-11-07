importScripts("pac.js");

async function apply() {
  const { enabled = true, rules = [] } = await chrome.storage.local.get(["enabled", "rules"]);
  const active = enabled && rules.some((r) => r.on && r.host && r.target);
  const old = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: old.map((r) => r.id),
    addRules: active ? buildDnrRules(rules) : [],
  });
  if (!active) {
    await chrome.proxy.settings.clear({ scope: "regular" });
    return;
  }
  await chrome.proxy.settings.set({
    value: { mode: "pac_script", pacScript: { data: buildPac(rules) } },
    scope: "regular",
  });
}

chrome.storage.onChanged.addListener(apply);
chrome.runtime.onInstalled.addListener(apply);
chrome.runtime.onStartup.addListener(apply);
