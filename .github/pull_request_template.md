## Summary

Describe what this PR changes and why.

## Feature Validation Checklist

- [ ] I ran local quality checks (`npm run lint` and `npm run build`)
- [ ] I started the backend locally and tested endpoints manually
- [ ] DTO validation was verified for invalid input paths
- [ ] No runtime errors were observed during manual testing
- [ ] Business logic behavior matches the feature requirements

## Security Checklist

- [ ] No secrets were committed (`.env` remains ignored)
- [ ] `.env.example` still contains placeholders only
- [ ] Endpoint authorization/guards are correct for protected routes
- [ ] Security checks are expected to pass (SCA, Gitleaks, CodeQL, Trivy)

## CI Evidence

- [ ] CI workflow is green on this branch
- [ ] CodeQL workflow is green on this branch
- [ ] Any failed checks were fixed and re-run before requesting merge
