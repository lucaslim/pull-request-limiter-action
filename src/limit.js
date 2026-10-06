const HOTFIX_BRANCH = /^hotfix\/\d+\.\d+\.\d+$/;

function isHotfixBranch(ref) {
  return HOTFIX_BRANCH.test(ref);
}

function buildSearchQuery({ owner, repo, author }) {
  return `repo:${owner}/${repo} author:${author} is:open is:pr draft:false archived:false -label:branched-pr,blocked/limit-reached`;
}

// GitHub search has no wildcard for `base:`, so hotfix PRs are filtered here.
function countOpenPullRequests(nodes) {
  return nodes.filter((node) => !isHotfixBranch(node.baseRefName)).length;
}

module.exports = { buildSearchQuery, countOpenPullRequests, isHotfixBranch };
