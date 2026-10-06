# pull-request-limiter

## Releasing

Every merge to `main` that changes shipped code (`src/`, `action.yml`, `package.json`, `yarn.lock`) releases the next patch automatically. The `Release` workflow tests, lints and builds, then commits the bundle on a release commit that is on no branch and tags it `X.Y.Z` (lightweight tag), moves the major tag `vX`, and creates a GitHub release. If the built bundle and `action.yml` are identical to the latest release (for example a devDependency-only merge), it skips.

For a minor or major bump, run the workflow manually (Actions tab, "Run workflow") with a `version` greater than the latest release. A manual run queued while a push-triggered release is pending can be superseded by the `release` concurrency group, so check the releases list after dispatching.

Pin consumers to the release commit SHA, with the version as a comment so Renovate tracks the tags:

```yaml
uses: lucaslim/pull-request-limiter-action@<sha> # X.Y.Z
```

Get the SHA with `git rev-parse X.Y.Z^{commit}`. `vX` moves with each release.
