# GitHub Actions Workflows

This project uses GitHub Actions for automated CI/CD. All workflow files are located in `.github/workflows/`.

## Workflows Overview

### CI Workflow (`ci.yml`)

**Trigger**: Push to `main`/`develop`, or pull requests

**Jobs**:
1. **Lint** - ESLint validation
2. **Typecheck** - TypeScript type validation
3. **Build** - Nuxt production build

**Outputs**:
- Build artifacts uploaded for reference (5-day retention)

**Status**: Check PR comments or Actions tab

### Release Workflow (`release.yml`)

**Trigger**: Version tag pushed (e.g., `v1.0.0`) or manual dispatch

**Jobs**:
1. **Build** - Full validation + build
   - Linting
   - Type checking
   - Nuxt build
2. **Create Release** - GitHub release management
   - Uploads build artifacts
   - Auto-generates release notes
   - Marks as prerelease if tag contains: `alpha`, `beta`, `rc`

**Outputs**:
- GitHub Release with artifacts
- Build available for download

## Triggering Workflows

### CI Workflow
- Automatic on push to main/develop
- Automatic on pull requests
- No manual trigger needed

### Release Workflow

#### Option 1: Git Tag (Recommended)
```bash
git tag v1.0.0
git push origin v1.0.0
```

#### Option 2: Manual Trigger
1. Go to GitHub Actions tab
2. Select "Release" workflow
3. Click "Run workflow"
4. Enter version number
5. Click "Run workflow"

#### Option 3: Create Release on GitHub

1. Go to Releases
2. Click "Draft a new release"
3. Click "Choose a tag"
4. Create new tag (e.g., `v1.0.0`)
5. Click "Generate release notes"
6. Click "Publish release"

This automatically triggers the workflow.

## Workflow Files

### `.github/workflows/ci.yml`
- Main CI pipeline
- Runs checks on all commits and PRs
- ~2-3 minutes execution time
- Updates PR with status

### `.github/workflows/release.yml`
- Automated release pipeline
- Runs on version tags
- Creates GitHub releases
- Uploads build artifacts
- ~2-3 minutes execution time

## Status Checks

### View Results
- **Pull Requests**: Checks appear as comments/badges on the PR
- **Push to main/develop**: Check Actions tab
- **Releases**: Automatic release creation in GitHub

### Debugging Failures

1. Click on the failed workflow run
2. Expand the failed job
3. Review the logs
4. Fix local issues
5. Commit and push again (or push a new tag for releases)

## Environment & Tools

- **Node.js**: 22 (configurable in workflow)
- **pnpm**: 10.33.0 (from package.json)
- **Runner**: Ubuntu Latest

## Performance Tips

- Workflows use action caching for faster dependency installation
- First run takes ~3-5 minutes
- Subsequent runs with same lock file: ~1-2 minutes
- Use `--frozen-lockfile` to prevent dependency changes

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Lint fails | Run `pnpm lint --fix` locally |
| Type errors | Run `pnpm typecheck` locally |
| Build fails | Run `pnpm build` locally |
| Release not created | Check tag format: `v` prefix required |
| Artifacts not in release | Ensure build step runs successfully |
| Wrong prerelease status | Tag must contain `alpha`, `beta`, or `rc` |

## Secrets & Permissions

No secrets needed for basic CI/CD. The workflows use:
- Default `GITHUB_TOKEN` for release creation
- Public build artifacts

For advanced integrations (npm publish, etc.), additional secrets can be configured.

## Next Steps

- See [RELEASE.md](./RELEASE.md) for detailed release process
- See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines
- Modify workflows in `.github/workflows/` as needed
