# Release automation

The standard release-please and npm workflows are prepared for this repository.
They have not been exercised as a stable release. A published, non-prerelease
GitHub release can trigger npm publication only if its tag is in `master` and
matches the stable package version. A manual stable publication also requires
`master` and an explicit `confirm_publish` selection. Manual prereleases require
explicit confirmation, use a validated non-`latest` dist-tag (default `transform5`),
and derive a sanitized version from the branch and GitHub run identifiers. A
feature-branch push alone does not publish.

Publication with npm provenance requires a public source repository. This
repository is currently private, so the workflow deliberately fails with an
explanation before publishing. See [npm's provenance requirements](https://docs.npmjs.com/generating-provenance-statements/)
and [trusted publishing limitations](https://docs.npmjs.com/trusted-publishers/).
Repository visibility, npm authentication and publication require separate
owner decisions; this configuration does not change any of them.

The accepted manual prerelease is independent of these workflows. Verify a
future stable release and its required GitHub/npm permissions before relying on
the automation. Deprecation also requires explicit confirmation.

## Private repository dependency review

The owner confirmed that GitHub Code Security is unavailable for now and plans
to make the repository public after its infrastructure is prepared. Until then,
private PRs skip the strict GitHub dependency and license review and show a
separate notice: no such review was performed. Other quality checks and the
existing npm audit continue, but they do not replace the skipped review. After
public visibility is enabled by the owner, rerun the strict Dependency Review
on the PR before relying on the result. The workflow leaves its vulnerability
and license thresholds unchanged and enables the strict job automatically for
public repositories. No visibility or security settings are changed here.
