const $ = (id) => document.getElementById(id);
const HOST_RE = /^[a-z0-9*.-]+$/i;
const TARGET_RE = /^(\d{1,5}|[a-z0-9.-]+:\d{1,5})$/i;
let state = { enabled: true, rules: [] };

const save = () => chrome.storage.local.set(state);

function render() {
  $("enabled").checked = state.enabled;
  const box = $("rules");
  box.replaceChildren();
  state.rules.forEach((rule, i) => {
    const row = document.createElement("div");
    row.className = "row";
    const on = document.createElement("input");
    on.type = "checkbox";
    on.checked = rule.on;
    on.onchange = () => { rule.on = on.checked; save(); };
    const label = document.createElement("span");
    label.style.flex = "1";
    label.textContent = `${rule.host} → ${rule.target}`;
    const del = document.createElement("button");
    del.textContent = "✕";
    del.onclick = () => { state.rules.splice(i, 1); save(); render(); };
    row.append(on, label, del);
    box.append(row);
  });
}

$("enabled").onchange = () => { state.enabled = $("enabled").checked; save(); };

$("add").onclick = () => {
  const host = $("host").value.trim().toLowerCase();
  const target = $("target").value.trim();
  if (!HOST_RE.test(host)) return ($("err").textContent = "Invalid host");
  if (!TARGET_RE.test(target)) return ($("err").textContent = "Invalid target");
  $("err").textContent = "";
  state.rules.push({ host, target, on: true });
  $("host").value = $("target").value = "";
  save();
  render();
};

chrome.storage.local.get(["enabled", "rules"]).then((s) => {
  state = { enabled: s.enabled ?? true, rules: s.rules ?? [] };
  render();
});

// Proxy status dot: the rule endpoint answers GET when the proxy container is up.
fetch("http://localhost:8099/rules")
  .then(() => { $("status").textContent = "● proxy online"; $("status").style.color = "#1a7f37"; })
  .catch(() => { $("status").textContent = "● proxy offline (docker compose up in proxy/)"; $("status").style.color = "#c00"; });
