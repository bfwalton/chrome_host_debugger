// Run: node test_pac.js
const assert = require("assert");
const vm = require("vm");
const { buildPac } = require("./pac.js");

const shExpMatch = (s, p) => new RegExp("^" + p.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$").test(s);
const find = (rules, url) => {
  const ctx = { shExpMatch };
  vm.runInNewContext(buildPac(rules), ctx);
  return ctx.FindProxyForURL(url, new URL(url).hostname);
};

const rules = [
  { host: "www.apple.com", target: "3000", on: true },
  { host: "*.suite.test", target: "8080", on: true },
  { host: "off.test", target: "1", on: false },
];
const PROXY = "PROXY 127.0.0.1:8081";
assert.equal(find(rules, "http://www.apple.com/x"), PROXY);
assert.equal(find(rules, "https://www.apple.com/x"), PROXY);
assert.equal(find(rules, "https://a.suite.test/"), PROXY);
assert.equal(find(rules, "http://suite.test/"), PROXY);
assert.equal(find(rules, "http://off.test/"), "DIRECT");
assert.equal(find(rules, "https://example.com/"), "DIRECT");
console.log("pac ok");
