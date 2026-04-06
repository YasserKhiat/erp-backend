# Security Policy

## Supported Branches

- `main`
- `develop`

## Reporting a Vulnerability

Please do not open a public issue for credential leaks, auth bypasses, or injection vulnerabilities.
Report security issues privately to the repository owner and include:

- vulnerability type
- affected file/endpoint
- reproduction steps
- impact assessment
- suggested remediation

## Secret Management Rules

- Never commit `.env`
- Keep `.env.example` placeholder-only
- Rotate exposed credentials immediately
- Use GitHub Secrets for pipeline/runtime secrets

## CI Security Gates

Merges to protected branches require green security checks:

- npm audit (high/critical)
- Gitleaks secret scan
- CodeQL SAST
- Trivy container scan (critical)
