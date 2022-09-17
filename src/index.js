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
      search(query: "repo:${github.context.repo.owner}/${github.context.repo.repo} author:${currentPRAuthor} is:open is:pr draft:false archived:false", type: ISSUE) {
        issueCount
      }
    }
  `);

  const currentPRAuthorsPRsCount = search.issueCount;

  core.info(
    `PR author ${currentPRAuthor} currently has ${currentPRAuthorsPRsCount} open PRs.`
  );

  if (search.issueCount - 1 > limit) {
    core.setFailed(
      `PR author ${currentPRAuthor} currently has ${currentPRAuthorsPRsCount} open PRs but the limit is ${limit}!`
    );

    if (body) {
      await client.graphql(`
        mutation {
          addComment(input: { body: "${body}", subjectId: ${currentPR.number} }) {
            clientMutationId
          }
        }
      `);
    }

    if (autoClose) {
      await client.graphql(`
        mutation {
          closePullRequest(input: { pullRequestId: ${currentPR.number} })
        }
      `);
    }
  }
}

main().catch((err) => core.setFailed(err.message));
