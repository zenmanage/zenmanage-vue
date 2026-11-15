# Publishing Next Steps

This document describes the release flow for the Zenmanage Vue SDK.

## Prerequisites

- `NPM_TOKEN` configured in GitHub repository secrets
- `GITHUB_TOKEN` available in workflow context
- Main branch protected with required CI checks

## Local Validation Before Release

```bash
npm install
npm run validate
```

## Versioning with Changesets

Create a changeset for user-facing package changes:

```bash
npm run changeset
```

Commit the generated `.changeset/*.md` file in your PR.

## Automated Release Flow

- Pushes to `main` trigger `.github/workflows/release.yml`
- Workflow runs full validation
- Changesets action either:
  - Opens/updates a version PR, or
  - Publishes to npm when version changes are ready

## Manual Publish Fallback

If automation is unavailable:

```bash
npm run validate
npm version <patch|minor|major>
npm publish --access public
```
