# Security policy

## Reporting a vulnerability

Use **Security → Report a vulnerability** on GitHub. Please do not open a public
issue for a suspected flaw in the security-relevant code.

## What this tool handles

This tool reads files and reports patterns. It never executes what it finds.

- findings contain short excerpts; treat them as untrusted
- `--sanitise` strips HTML comments and invisible characters — review the output before using it

## Supported versions

| Version | Supported |
|---|---|
| 0.1.x | ✅ |
