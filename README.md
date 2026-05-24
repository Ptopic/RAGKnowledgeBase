# RAGKnowledgeBase

## Deployment workflows

This repository now uses two GitHub Actions deployment workflows:

1. **Automatic deploy on merge to main**
   - Workflow: `.github/workflows/deploy-main.yml`
   - Trigger: `push` to `main`
   - Behavior: builds backend/frontend images and deploys to Coolify.

2. **Manual deploy from any branch/ref**
   - Workflow: `.github/workflows/deploy-manual.yml`
   - Trigger: `workflow_dispatch`
   - Input: `target_ref` (branch/tag/SHA, default `main`)
   - Behavior: checks out the selected ref, builds images, and deploys to Coolify.

### How to run manual deploy

- Go to **GitHub → Actions → Build & Deploy to Coolify (manual ref)**
- Click **Run workflow**
- Set `target_ref` to the branch you want to deploy (e.g. `feature/zr-267`)
- Run

### Concurrency protection

Both workflows use the same concurrency group (`coolify-prod-deploy`) so deploys to the same environment do not overlap.
