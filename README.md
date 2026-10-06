# pull-request-limiter

## Releasing

Run the `Release` workflow from `main` (Actions tab, "Run workflow") with a `version` such as `1.2.3`. It tests, lints and builds, then commits the bundle on a release commit that is on no branch, tags it `1.2.3`, moves the major tag `v1`, and creates a GitHub release.

Pin consumers to the release commit SHA, not a branch or the moving tag.
