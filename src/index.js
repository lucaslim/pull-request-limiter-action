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
  const prsResponse = await client.rest.pulls.list({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    state: "open",
    sort: "created",
    direction: "desc",
  });
  const prs = prsResponse.data;

  console.log("github context>>", github.context);
  console.log("currentPR>>", currentPR);

  const currentPRAuthorsLatestPR = prs[0];
  const currentPRAuthorsPRsCount = prs
    .filter((pr) => !pr.draft) // ignore drafts
    .map((pr) => pr.user.login)
    .filter((a) => a === currentPRAuthor).length;

  console.log("currentPRAuthorsLatestPR>>", currentPRAuthorsLatestPR);
  console.log("prs>>", prs);

  core.info(
    `PR author ${currentPRAuthor} currently has ${currentPRAuthorsPRsCount} open PRs.`
  );

  if (currentPR.id !== currentPRAuthorsLatestPR.id) {
    // this could happen if the query is returned from a old cache on github
    core.info(`This is not the latest PR of ${currentPRAuthor}.`);

    // for this edge case we just add one to the count, assuming that the first pr should exust
    currentPRAuthorsPRsCount += 1;
  }

  if (currentPRAuthorsPRsCount > limit) {
    core.setFailed(
      `PR author ${currentPRAuthor} currently has ${currentPRAuthorsPRsCount} open PRs but the limit is ${limit}!`
    );

    if (body) {
      await client.rest.issues.createComment({
        ...github.context.repo,
        issue_number: currentPR.number,
        body,
      });
    }

    if (autoClose) {
      await client.rest.pulls.update({
        ...github.context.repo,
        pull_number: currentPR.number,
        state: "closed",
      });
    }
  }
}

main().catch((err) => core.setFailed(err.message));
