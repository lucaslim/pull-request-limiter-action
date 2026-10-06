const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildSearchQuery,
  countOpenPullRequests,
  isHotfixBranch,
} = require("../src/limit");

test("search only matches open, non-draft PRs by the author", () => {
  const query = buildSearchQuery({
    owner: "acme",
    repo: "app",
    author: "octocat",
  });

  assert.match(query, /repo:acme\/app /);
  assert.match(query, /author:octocat /);
  assert.match(query, / is:open /);
  assert.match(query, / is:pr /);
  assert.match(query, / draft:false /);
  assert.match(query, /-label:branched-pr,blocked\/limit-reached/);
});

test("hotfix/X.Y.Z base branches are recognised", () => {
  assert.equal(isHotfixBranch("hotfix/11.7.1"), true);
  assert.equal(isHotfixBranch("hotfix/1.0.0"), true);
});

test("other base branches are not hotfix branches", () => {
  assert.equal(isHotfixBranch("main"), false);
  assert.equal(isHotfixBranch("hotfix/11.7"), false);
  assert.equal(isHotfixBranch("hotfix/11.7.1-rc"), false);
  assert.equal(isHotfixBranch("feature/hotfix/11.7.1"), false);
});

test("PRs targeting hotfix branches are not counted", () => {
  const nodes = [
    { baseRefName: "main" },
    { baseRefName: "hotfix/11.7.1" },
    { baseRefName: "develop" },
    { baseRefName: "hotfix/11.8.0" },
  ];

  assert.equal(countOpenPullRequests(nodes), 2);
});
