# Branch Protection Policy

Apply this policy to `develop` and `main` in GitHub branch settings.

## Rules

- Require pull request before merging
- Require at least 1 approving review
- Dismiss stale pull request approvals when new commits are pushed
- Require conversation resolution before merging
- Require status checks to pass before merging
- Do not allow force pushes to protected branches
- Do not allow deletions of protected branches

## Required Status Checks

From workflow `CI`:

- `Build & Quality`
- `Feature Validation (Runtime + DTO)`
- `SCA (npm audit)`
- `Secret Scan (Gitleaks)`
- `Container Security (Trivy)`
- `Dependency Review (PR)`

From workflow `CodeQL`:

- `Analyze (CodeQL)`

## Merge Rule

Feature branches can only be merged into `develop` when all required checks are green.
