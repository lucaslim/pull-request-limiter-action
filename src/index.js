const core = require("@actions/core");
const github = require("@actions/github");
const {
  buildSearchQuery,
  countOpenPullRequests,
  isHotfixBranch,
} = require("./limit");

async function main() {
  if (github.context.eventName !== "pull_request") {
    throw `This action should only run when the event is a pull request but it is a ${github.context.eventName}`;
  }

  const token = core.getInput("token", { required: true });
  const limit = core.getInput("limit") || 10;
  const body = core.getInput("body");
  const autoClose = core.getBooleanInput("auto_close") || false;

  const event = github.context.payload;
  const headRef = event.pull_request.head.ref.toLowerCase(); // source
  const baseRef = event.pull_request.base.ref.toLowerCase(); // target

  const currentPR = event.pull_request;
  const currentPRAuthor = currentPR.user.login;

  core.info(`Checking pull request #${event.number}: ${headRef} -> ${baseRef}`);

  if (isHotfixBranch(baseRef)) {
    core.info(`Skipping limit check for hotfix branch ${baseRef}.`);
    return;
  }

  const client = github.getOctokit(token);
  const query = `
    query($searchQuery: String!) {
      search(query: $searchQuery, type: ISSUE, first: 100) {
        nodes {
          ... on PullRequest {
            baseRefName
          }
        }
      }
    }
  `;
  const searchQuery = buildSearchQuery({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    author: currentPRAuthor,
  });

  core.info(searchQuery);

  const { search } = await client.graphql(query, { searchQuery });

  const currentPRAuthorsPRsCount = countOpenPullRequests(search.nodes);

  core.info(
    `PR author ${currentPRAuthor} currently has ${currentPRAuthorsPRsCount} open PRs.`
  );

  if (currentPRAuthorsPRsCount > limit) {
    core.setFailed(
      `PR author ${currentPRAuthor} currently has ${currentPRAuthorsPRsCount} open PRs but the limit is ${limit}!`
    );

    if (body) {
      const commentMutation = `
        mutation($body: String!, $id: ID!) {
          addComment(input: { body: $body, subjectId: $id }) {
            clientMutationId
          }
        }
      `;

      await client.graphql(commentMutation, {
        body,
        id: currentPR.node_id,
      });
    }

    if (autoClose) {
      const closePullRequestMutation = `
        mutation($id: ID!) {
          closePullRequest(input: { pullRequestId: $id }) {
            pullRequest {
              url
            } 
          }
        }
      `;

      await client.graphql(closePullRequestMutation, {
        id: currentPR.node_id,
      });
    }
  }
}

main().catch((err) => core.setFailed(err.message));
