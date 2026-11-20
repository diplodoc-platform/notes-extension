# Release automation

The standard release-please and npm workflows are prepared for this repository.
They have not been exercised as a stable release. A published, non-prerelease
GitHub release can trigger npm publication only if its tag is in `master` and
matches the stable package version. A manual stable publication also requires
`master` and an explicit `confirm_publish` selection. Manual prereleases require
explicit confirmation, use a validated non-`latest` dist-tag (default `transform5`),
and derive a sanitized version from the branch and GitHub run identifiers. A
feature-branch push alone does not publish.

## First stable release

The first stable release is `1.0.0`, configured with `initial-version`.
The manifest starts at `0.0.0` because this repository has no GitHub release
or release tag yet; npm-only prereleases are not a previous GitHub release.
Release Please updates the manifest when preparing the release PR. After that
release, normal Conventional Commit versioning resumes; a subsequent fix
produces `1.0.1`.

The bootstrap commit also carries the one-time `Release-As: 1.0.0` footer.
Preserve that footer in the final squash commit message; it is also included
in the feature PR body. It keeps the first
release correct even if Infra regenerates the manifest from the beta version
in `package.json`. The footer is consumed with the first release's commit range;
there is no persistent `release-as` override to remove for later releases.
Verify the release model after Infra scaffolding updates, and do not manually
replace the GitHub release baseline with an npm-only beta version.

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
