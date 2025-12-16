# EC2 GPU Workers (Optional)

Launch GPU-powered spot instances for faster generation.

---

## Cost Estimates

| Instance | GPU | Spot Price | 3000 Pages | Time |
|----------|-----|------------|------------|------|
| g4dn.xlarge | T4 (16GB) | ~$0.15-0.20/hr | ~$1.50 | ~8 hrs |
| g5.xlarge | A10G (24GB) | ~$0.25-0.35/hr | ~$1.75 | ~5 hrs |

**Recommended:** g4dn.xlarge for best cost/performance.

---

## When to Use

| Scenario | Use Laptops | Use EC2 |
|----------|-------------|---------|
| Overnight batch | ✅ | ❌ |
| Time-sensitive job | ❌ | ✅ |
| Large batch (3000+) | ❌ | ✅ |
| Testing | ✅ | ❌ |

---

## Prerequisites

1. AWS CLI configured
2. EC2 Key Pair created
3. Security Group with:
   - Inbound: SSH (22) from your IP
   - Outbound: All traffic
4. Public subnet with auto-assign IP

---

## Setup

```bash
cd packages/ec2
npm install
cp .env.example .env
```

Edit `.env`:

```bash
AWS_REGION=us-east-1
EC2_KEY_NAME=your-key-pair
EC2_SECURITY_GROUP_ID=sg-xxxxxxxxx
EC2_SUBNET_ID=subnet-xxxxxxxxx
API_URL=http://your-api:3001
API_TOKEN=your-token
```

---

## Usage

### Launch Worker

```bash
npm run launch
```

This will:
1. Launch g4dn.xlarge spot instance
2. Install NVIDIA drivers + Ollama
3. Pull LLM model
4. Start worker automatically
5. Auto-shutdown after 15 min idle

### Check Status

```bash
npm run status
```

### Terminate

```bash
npm run terminate           # All workers
npm run terminate i-xxxxx   # Specific instance
```

---

## Architecture

```
┌───────────────────────────────────────────────────────┐
│              Your Local Machine                        │
│  ┌─────────────┐  ┌─────────────┐                     │
│  │   Server    │  │  Dashboard  │                     │
│  │  (SQLite)   │  │   (React)   │                     │
│  └──────┬──────┘  └─────────────┘                     │
│         │                                              │
└─────────┼──────────────────────────────────────────────┘
          │ HTTP API
          ▼
┌───────────────────────────────────────────────────────┐
│              AWS EC2 Spot Instance                     │
│  ┌─────────────────────────────────────────────────┐  │
│  │  g4dn.xlarge (NVIDIA T4 GPU)                    │  │
│  │  ┌─────────────┐  ┌───────────────────────┐     │  │
│  │  │   Worker    │──│  Ollama + dolphin3    │     │  │
│  │  │  (Node.js)  │  │    (Local LLM)        │     │  │
│  │  └─────────────┘  └───────────────────────┘     │  │
│  └─────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

---

## Spot Interruption

Workers automatically:
- Check for termination notices every 5 seconds
- Release in-progress page back to queue
- Gracefully shutdown

No work is lost on interruption.

---

## Auto-Shutdown

Instances auto-shutdown after idle time:

```bash
AUTO_SHUTDOWN_MINUTES=15  # Default
```

Timer resets on each page completion.

---

## Troubleshooting

### Instance Won't Start

- Check spot capacity in region
- Try different availability zone
- Increase `SPOT_MAX_PRICE`

### Worker Not Connecting

- Ensure API is accessible from internet
- Check security group outbound rules
- Verify `API_URL` and `API_TOKEN`

### Slow Generation

- T4 should do ~1 page per 8-10 seconds
- Check `nvidia-smi` for GPU utilization
- Verify model loaded: `ollama list`
