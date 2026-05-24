# RAGKnowledgeBase

## Deployment workflows

This repository now uses two GitHub Actions deployment workflows:

1. **Automatic deploy on merge to main**
   - Workflow: `.github/workflows/deploy-main.yml`
   - Trigger: `push` to `main`
   - Behavior: builds backend/frontend images and deploys to Coolify.

2. **Manual deploy from selected branch**
   - Workflow: `.github/workflows/deploy-manual.yml`
   - Trigger: `workflow_dispatch`
   - Behavior: deploys the same branch you selected in the top workflow branch picker (no second ref input).

### How to run manual deploy

- Go to **GitHub → Actions → Build & Deploy to Coolify (manual ref)**
- Click **Run workflow**
- Pick the branch in the top branch selector
- Run

### Concurrency protection

Both workflows use the same concurrency group (`coolify-prod-deploy`) so deploys to the same environment do not overlap.
