# Deployment (EC2-First)

Minimal steps to set up the EC2 instance safely and cost-effectively.

## Instance Setup
- Launch EC2 (Ubuntu 22.04 LTS), instance type: t3.small (CPU-only).
- Security Group: allow inbound `3001` (API) and `22` (SSH) from trusted IPs. Open `3000` only if dashboard is hosted on EC2.
- Storage: 30GB gp3.

## Install Dependencies
```bash
sudo apt update && sudo apt install -y nodejs npm sqlite3 git
# Optional: Ollama (confirm before installing)
curl -fsSL https://ollama.com/install.sh | sh
```

## Clone Repo
```bash
git clone https://github.com/dmv7zero3/marketbrewer-seo-platform.git
cd marketbrewer-seo-platform
```

## Environment
- Create `.env` files in `packages/server`, `packages/worker`, `packages/dashboard` based on `.env.example`.
- Required vars: `API_TOKEN`, `API_URL`, `REACT_APP_API_URL`, etc.

## Start Services
Prefer systemd for simplicity and ulimit control.
- `systemd/seo-api.service` (ExecStart: server start)
- `systemd/seo-worker.service` (ExecStart: worker start)
- Set `LimitNOFILE=8192` to prevent SQLite open file issues.

## Cost Controls
- Install `scripts/auto-shutdown.sh`; add cron entry to stop nightly.
- Configure CloudWatch alarms for estimated charges and idle CPU.
- Use CPU-only models; enable GPU only with explicit approval.

## Verification
- API: `curl http://<ec2-ip>:3001/health`
- Worker: logs show claiming and completion events.
- Output: check `output/{business_id}/manifest.json` and `pages/` contents.
