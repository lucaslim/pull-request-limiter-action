const core = require("@actions/core");
const github = require("@actions/github");

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

  const client = github.getOctokit(token);
  const { search } = await client.graphql(`
    query {
      search(query: "repo:${github.context.repo.owner}/${github.context.repo.repo} author:${currentPRAuthor} is:open is:pr draft:false archived:false -label:\"Branched PR\"", type: ISSUE) {
        issueCount
      }
    }
  `);

  const currentPRAuthorsPRsCount = search.issueCount;

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
