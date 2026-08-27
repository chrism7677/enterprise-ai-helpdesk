# Enterprise AI Helpdesk Deployment Guide

## Purpose

This document defines the deployment conventions and production runbook for the Enterprise AI Helpdesk portfolio application. It is intentionally written without secret values or account-specific infrastructure identifiers so it can remain in the public repository.

The current production target is a live portfolio/demo environment hosted on the same AWS EC2 instance as the Senior Check-in application.

## Deployment Principles

- `main` is the active development branch and must never deploy directly to production.
- Continuous integration may run on normal pushes and pull requests.
- Production deployment is allowed only from Git tags matching `demo-*`.
- The AWS IAM trust policy independently enforces the `demo-*` tag restriction for the GitHub deployment role.
- Production must deploy the exact release tag that triggered the workflow; `deploy.sh` must not run `git pull origin main`.
- Application secrets stay outside Git and outside container images.
- PostgreSQL is not exposed publicly.
- FastAPI and the React web container bind only to the EC2 loopback interface; host Nginx is the public HTTP/HTTPS entry point.
- The production database volume must survive ordinary application redeployments.

## Production Topology

Public URL:

```text
https://helpdesk.cmiller.dev
```

Routing:

```text
Internet
   |
   v
Host Nginx :80/:443
   |
   +---- /* -------> React/Nginx container on 127.0.0.1:8081
   |
   +---- /api/* ---> FastAPI container on 127.0.0.1:8000
                         |
                         +---- PostgreSQL/pgvector on Docker network :5432
```

The `/api/` prefix exists only at the public reverse-proxy boundary. Nginx should proxy `/api/tickets` to FastAPI as `/tickets`, `/api/users/me` as `/users/me`, and so on.

Recommended production frontend setting:

```env
VITE_API_BASE_URL=/api
```

## Environments

### Local development

The existing root `docker-compose.yml` remains the local-development database configuration. Local development may continue to run:

- PostgreSQL/pgvector through Docker Compose.
- FastAPI directly from the backend development environment.
- React through the Vite development server.

The local API base URL remains:

```env
VITE_API_BASE_URL=http://localhost:8000
```

### Production

Stage B will add a separate production Compose definition:

```text
compose.prod.yaml
```

It should contain three Helpdesk services:

- `frontend` — production React build served by Nginx.
- `backend` — FastAPI/Uvicorn production service.
- `db` — PostgreSQL with pgvector.

Do not replace the existing development Compose file with the production definition.

## Planned Production Repository Files

Stage B should create or finalize the following deployment files:

```text
.github/workflows/ci.yml
.github/workflows/deploy.yml
backend/Dockerfile
backend/.dockerignore
frontend/Dockerfile
frontend/.dockerignore
compose.prod.yaml
deploy.sh
deploy/nginx/helpdesk.conf
```

A Python dependency manifest required to build the backend image must also exist, using the dependency-management approach selected for the project.

## Docker Requirements

### Frontend

Use a multi-stage image:

1. Node build stage installs dependencies and runs the production Vite build.
2. Nginx runtime stage serves only the compiled static assets.

The container Nginx configuration must support React Router history fallback, for example by resolving unknown application paths to `index.html`.

The host should publish the frontend only on loopback:

```text
127.0.0.1:8081
```

### Backend

Run FastAPI with a production Uvicorn command such as:

```text
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Do not use `--reload` in production.

The host should publish the backend only on loopback:

```text
127.0.0.1:8000
```

### Database

PostgreSQL/pgvector should be reachable only from the Docker Compose network. Do not publish port `5432` on the EC2 host in production.

Use a named Docker volume for database persistence. Normal deployment commands must never delete the production volume; in particular, do not use `docker compose down -v` as part of deployment.

The portfolio database is a demo environment and should contain no sensitive or real user data.

## Production Environment Configuration

Production values live only on EC2 in a Git-ignored environment file with restrictive permissions. A recommended convention is:

```text
<APP_DIR>/.env.production
```

Recommended permissions:

```bash
chmod 600 .env.production
```

The exact Compose integration will be implemented during Stage B, for example with:

```bash
docker compose --env-file .env.production -f compose.prod.yaml ...
```

### Backend/runtime configuration

Phase 1 requires configuration equivalent to:

```text
DATABASE_URL
ENTRA_TENANT_ID
ENTRA_API_CLIENT_ID
ENTRA_REQUIRED_SCOPE
```

The database URL contains database credentials and is secret.

The Entra tenant ID, application/client ID, and scope identifier are configuration identifiers rather than passwords, but production values should still be managed consistently through the environment file.

Future AI phases are expected to add:

```text
OPENAI_API_KEY
```

`OPENAI_API_KEY` is a secret and must never be committed, embedded into the frontend, or copied into a public image.

### Frontend build configuration

The production frontend build requires values equivalent to:

```text
VITE_API_BASE_URL=/api
VITE_ENTRA_CLIENT_ID
VITE_ENTRA_TENANT_ID
VITE_ENTRA_API_SCOPE
```

`VITE_*` values are browser-visible configuration and must never contain secrets.

## Microsoft Entra ID

The production SPA redirect URI is:

```text
https://helpdesk.cmiller.dev
```

No `www.helpdesk.cmiller.dev` hostname is used.

The live demo uses dedicated disposable demo identities mapped to application users/roles in PostgreSQL. Demo identities must have no administrative tenant privileges, must not be reused for other services, and must never contain real user data.

## DNS and TLS

Cloudflare provides DNS for `cmiller.dev` and the Helpdesk hostname:

```text
helpdesk.cmiller.dev
```

The Helpdesk DNS record points to the EC2 public endpoint.

The public host Nginx configuration should use only:

```nginx
server_name helpdesk.cmiller.dev;
```

A `www.helpdesk.cmiller.dev` record is intentionally not used.

TLS is managed with Certbot/Let's Encrypt on the EC2 host.

Before changing existing certificates or Nginx configuration:

```bash
sudo certbot certificates
sudo nginx -t
```

Back up the current Nginx site configuration before restructuring it.

After the Helpdesk Nginx server block exists and DNS resolves correctly, the Helpdesk certificate can be installed with:

```bash
sudo certbot --nginx -d helpdesk.cmiller.dev
```

For `senior.cmiller.dev`, use only the non-`www` hostname after the old `www.senior.cmiller.dev` DNS entry is removed:

```bash
sudo certbot --nginx -d senior.cmiller.dev
```

For the root portfolio site, preserve `www.cmiller.dev` only if its DNS record is intentionally retained. If both apex hostnames are supported, request both names together:

```bash
sudo certbot --nginx -d cmiller.dev -d www.cmiller.dev
```

Do not remove names from an existing certificate blindly. Inspect `sudo certbot certificates` first and use an explicit `--cert-name` operation if an existing certificate's domain set needs to be replaced.

After every Nginx change:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Host Nginx Routing

The production Helpdesk virtual host should implement the following behavior:

```text
https://helpdesk.cmiller.dev/api/* -> http://127.0.0.1:8000/*
https://helpdesk.cmiller.dev/*     -> http://127.0.0.1:8081/*
```

The API proxy must strip the external `/api` prefix because FastAPI routes are defined without it.

Only ports 80 and 443 should be required publicly for normal application use. Ports 8000, 8081, and 5432 must not be internet-facing.

## EC2 Host

Current portfolio host characteristics:

```text
Instance family: t3.micro
Memory: 1 GiB
Swap: 2 GiB
Swap policy: low swappiness configured
```

The instance also hosts the Senior Check-in portfolio application.

Useful resource checks:

```bash
free -h
swapon --show
docker stats
df -h
```

The 2 GiB swap file is a safety margin for a low-traffic portfolio/demo workload, not a replacement for RAM. If routine demo traffic causes sustained swap activity or container instability, increase EC2 memory rather than relying on heavier swapping.

## Git Access From EC2

While the repository is private, EC2 uses a repository-specific read-only GitHub Deploy Key.

Private key location:

```text
/home/ubuntu/.ssh/helpdesk_deploy_key
```

The private key remains only on EC2. Only the matching public key is registered in GitHub.

Because the host also deploys other repositories with their own keys, avoid a single global `Host github.com` identity that can interfere with another repository. Prefer an SSH host alias, for example:

```sshconfig
Host github-helpdesk
    HostName github.com
    User git
    IdentityFile /home/ubuntu/.ssh/helpdesk_deploy_key
    IdentitiesOnly yes
```

Then clone with the alias:

```bash
git clone git@github-helpdesk:chrism7677/enterprise-ai-helpdesk.git
```

Verify the effective SSH configuration before cloning if `~/.ssh/config` already contains GitHub entries for another application.

## EC2 Repository Location

GitHub Actions stores the application directory in the repository variable:

```text
APP_DIR
```

The current deployment convention is:

```text
/home/ubuntu/Projects/Helpdesk/enterprise-ai-helpdesk
```

Public documentation should refer to `APP_DIR` rather than publishing infrastructure-specific identifiers unnecessarily.

## GitHub Repository Variables

The deployment workflow uses repository **variables**, not long-lived AWS credentials:

```text
AWS_REGION
EC2_INSTANCE_ID
APP_DIR
AWS_ROLE_ARN
```

These values are configuration identifiers, not passwords.

Do not add static AWS credentials such as:

```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```

GitHub authenticates to AWS with OIDC.

## GitHub Actions Release Model

### Continuous integration

Normal branch development should run tests without AWS deployment permission.

Recommended events:

```text
push
pull_request
```

At minimum, CI should run the backend test suite and frontend test/build checks appropriate to the repository.

CI jobs do not need:

```yaml
permissions:
  id-token: write
```

unless they actually request an OIDC token.

### Production deployment

Production deployment is triggered only by release tags matching:

```text
demo-*
```

Examples:

```text
demo-phase-1-v1
demo-phase-2-v1
```

The deployment workflow requires:

```yaml
permissions:
  id-token: write
  contents: read
```

The AWS role trust relationship independently restricts OIDC assumption to `demo-*` tags for this exact repository.

## AWS IAM Roles

Two different AWS roles participate in deployment and runtime management.

### GitHub deployment role

Role name:

```text
GitHubActionsHelpdeskDeployRole
```

Purpose:

- Trusted by GitHub Actions through the GitHub OIDC identity provider.
- Trust limited to this repository's immutable GitHub owner/repository IDs.
- Trust limited to refs matching `refs/tags/demo-*`.
- Allowed to invoke the required SSM Run Command operation against the intended EC2 instance.

The trust relationship answers:

> Which GitHub workflow identity may assume this role?

A separate permissions policy answers:

> What AWS actions may the assumed role perform?

The role therefore needs a least-privilege permissions policy for the deployment workflow. At minimum, the workflow design requires permission to send `AWS-RunShellScript` to the target instance and read command execution status/output used by the AWS CLI waiter and `get-command-invocation` step.

Do not assume that creating the OIDC trust relationship automatically grants SSM permissions.

### EC2/SSM instance role

The EC2 instance must remain registered as a Systems Manager managed node. Its instance profile supplies the permissions required by the SSM Agent to communicate with Systems Manager.

This role is separate from `GitHubActionsHelpdeskDeployRole`.

## GitHub OIDC Trust Boundary

The Helpdesk repository uses GitHub's immutable OIDC subject format. The AWS trust condition is scoped to:

```text
repository: enterprise-ai-helpdesk
release refs: refs/tags/demo-*
```

The production workflow must not use a GitHub Actions environment unless the AWS trust policy is intentionally changed to match the environment-based OIDC subject format.

## SSM Deployment Flow

Production deployment follows this sequence:

```text
Git tag demo-*
      |
      v
GitHub Actions tests
      |
      v
GitHub OIDC token
      |
      v
AWS STS assumes GitHubActionsHelpdeskDeployRole
      |
      v
SSM SendCommand
      |
      v
EC2 SSM Agent
      |
      v
deploy.sh APP_DIR + DEPLOY_REF
      |
      v
Docker Compose production deployment
```

The workflow should pass both:

```text
APP_DIR
DEPLOY_REF=${github.ref_name}
```

to the EC2 deployment command.

## `deploy.sh` Requirements

The production deploy script should:

1. Exit on errors.
2. Change to `APP_DIR`.
3. Fetch tags from GitHub.
4. Validate that `DEPLOY_REF` starts with `demo-`.
5. Checkout the exact release tag in detached-HEAD state.
6. Build/update production containers using `compose.prod.yaml` and `.env.production`.
7. Run Alembic migrations against the production database.
8. Start/update services without deleting the database volume.
9. Verify service/container health.
10. Prune only safe unused image/build artifacts if desired.

Conceptually:

```bash
git fetch --tags --force origin
git checkout --detach "$DEPLOY_REF"
```

The script must not deploy with:

```bash
git pull origin main
```

because production is pinned to an immutable release tag while `main` continues development.

## Database Migrations

Alembic migrations are part of deployment.

The production deployment must apply pending migrations before the new application version is considered healthy. Migration commands must run against the production database service and use the same runtime database configuration as FastAPI.

For later phases, database migration compatibility should be considered before making a release tag.

## First-Time EC2 Setup

The first deployment requires one-time host preparation before GitHub Actions can own normal releases:

1. Confirm Docker and Docker Compose are installed.
2. Confirm the SSM Agent is healthy and the instance appears as a managed node.
3. Confirm the 2 GiB swap file remains active.
4. Confirm the Helpdesk read-only GitHub deploy key.
5. Verify the multi-repository SSH configuration.
6. Create the parent `APP_DIR` directories.
7. Clone the Helpdesk repository into `APP_DIR`.
8. Create `.env.production` on EC2 with restrictive permissions.
9. Add the Helpdesk host Nginx configuration.
10. Validate DNS for `helpdesk.cmiller.dev`.
11. Install/verify the Helpdesk TLS certificate.
12. Confirm the Entra production redirect URI.
13. Confirm the GitHub deployment IAM role has both the OIDC trust relationship and SSM permissions policy.
14. Confirm GitHub repository variables.
15. Perform an initial tagged deployment.

## Release Procedure

For a production release:

1. Ensure `main` is in the desired releasable state.
2. Run backend and frontend tests locally as appropriate.
3. Push the releasable commit.
4. Confirm CI succeeds.
5. Create an annotated release tag matching `demo-*`.
6. Push the tag.
7. GitHub Actions authenticates to AWS through OIDC.
8. GitHub Actions sends an SSM command to EC2.
9. EC2 checks out the exact tag and deploys the production Compose stack.
10. Verify the live application in a clean/private browser session.

Example release tag:

```bash
git tag -a demo-phase-1-v1 -m "Phase 1 live demo release"
git push origin demo-phase-1-v1
```

## Verification Checklist

After deployment, verify:

- `https://helpdesk.cmiller.dev` loads over HTTPS.
- Direct navigation to React routes works and does not return Nginx 404 errors.
- The signed-out home page shows demo access instructions.
- Entra sign-in redirects back to `https://helpdesk.cmiller.dev`.
- Employee demo user reaches only employee routes.
- IT demo user reaches only IT routes.
- Unmapped authenticated users receive access denied behavior.
- `/api/health` reaches the FastAPI `/health` endpoint.
- Ticket creation works.
- Employee ticket list/details work.
- IT unassigned queue works.
- Claim, work-note, and resolve workflows work.
- PostgreSQL is not externally exposed.
- Ports 8000 and 8081 are not publicly reachable.
- Senior Check-in still works after Helpdesk deployment.
- `free -h` and `docker stats` show acceptable resource usage.

## Rollback Strategy

Release tags make rollback deterministic.

A rollback should redeploy a previously known-good `demo-*` tag rather than resetting `main` or editing production files manually.

If schema migrations are not backward compatible, evaluate database rollback separately before redeploying an older application tag.

## Logs and Troubleshooting

Useful host checks include:

```bash
sudo nginx -t
sudo systemctl status nginx
sudo journalctl -u nginx --since "30 minutes ago"
docker compose --env-file .env.production -f compose.prod.yaml ps
docker compose --env-file .env.production -f compose.prod.yaml logs --tail=200
free -h
df -h
```

Nginx access/error logs remain available on the host through the configured Nginx logging paths.

GitHub Actions should print the SSM command ID and retrieve the command invocation result so deployment failures are visible from the workflow run.

## Public Repository Safety

The repository may contain documentation for architecture and operations, but must never contain:

- `.env.production` or any real `.env` file.
- Database passwords.
- OpenAI API keys.
- AWS access keys or secret keys.
- SSH private keys.
- Entra client secrets.
- Access/refresh tokens.
- Session secrets.

Public identifiers such as domain names, Entra application/client IDs, tenant IDs, AWS regions, and role names are not authentication secrets, but infrastructure-specific IDs should be omitted from documentation unless publishing them serves a clear purpose.

Run secret scanning before changing repository visibility and periodically thereafter.
