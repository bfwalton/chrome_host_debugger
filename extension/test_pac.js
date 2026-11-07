// Run: node test_pac.js
const assert = require("assert");
const vm = require("vm");
const { buildPac, buildDnrRules } = require("./pac.js");

const shExpMatch = (s, p) => new RegExp("^" + p.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$").test(s);
const find = (rules, url) => {
  const ctx = { shExpMatch };
  vm.runInNewContext(buildPac(rules), ctx);
  return ctx.FindProxyForURL(url, new URL(url).hostname);
};

const rules = [
  { host: "www.apple.com", target: "3000", on: true },
  { host: "*.suite.test", target: "10.0.0.5:8080", on: true },
  { host: "off.test", target: "1", on: false },
];
assert.equal(find(rules, "http://www.apple.com/x"), "PROXY 127.0.0.1:3000");
assert.equal(find(rules, "http://a.suite.test/"), "PROXY 10.0.0.5:8080");
assert.equal(find(rules, "http://suite.test/"), "PROXY 10.0.0.5:8080");
assert.equal(find(rules, "https://www.apple.com/"), "DIRECT");
assert.equal(find(rules, "http://off.test/"), "DIRECT");
assert.equal(find(rules, "http://example.com/"), "DIRECT");
console.log("pac ok");

const dnr = buildDnrRules(rules);
assert.equal(dnr.length, 2);
const hits = (i, url) => new RegExp(dnr[i].condition.regexFilter).test(url);
assert(hits(0, "https://www.apple.com/x"));
assert(hits(0, "https://www.apple.com"));
assert(hits(0, "https://www.apple.com:443/x"));
assert(!hits(0, "https://wwwxapple.com/"));
assert(!hits(0, "https://www.apple.com.evil.io/"));
assert(!hits(0, "http://www.apple.com/"));
assert(hits(1, "https://suite.test/"));
assert(hits(1, "https://a.b.suite.test/x"));
assert(!hits(1, "https://notsuite.test/"));
console.log("dnr ok");
