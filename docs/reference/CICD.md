# CI/CD

GitHub Actions for build/test plus a manual serverless deployment script.

---

## CI Workflow

Location: `.github/workflows/ci.yml`

Typical steps:
- `npm ci`
- `npm run build`
- `npm run typecheck`
- `npm test`

---

## Deployment

Location: `scripts/deploy-serverless.sh`

```bash
export AWS_REGION=us-east-1
export PROJECT_PREFIX=marketbrewer
export CLAUDE_API_KEY=your-claude-key
export API_TOKEN=your-secure-token

./scripts/deploy-serverless.sh
```

This builds and deploys the API + worker lambdas and updates the stack.
