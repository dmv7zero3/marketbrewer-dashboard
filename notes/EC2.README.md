# MarketBrewer EC2 Spot Worker

Launch GPU-powered spot instances for fast, cheap SEO content generation.

## Cost Estimates

| Instance Type | GPU | Spot Price | 3000 Pages | Time |
|---------------|-----|------------|------------|------|
| g4dn.xlarge | T4 (16GB) | ~$0.15-0.20/hr | **~$1.20-1.60** | ~8 hrs |
| g5.xlarge | A10G (24GB) | ~$0.25-0.35/hr | ~$1.25-1.75 | ~5 hrs |
| g5.2xlarge | A10G (24GB) | ~$0.35-0.50/hr | ~$1.40-2.00 | ~4 hrs |

**Recommended:** g4dn.xlarge - best cost/performance ratio

## Prerequisites

1. **AWS CLI configured** with appropriate credentials
2. **EC2 Key Pair** created in your region
3. **Security Group** with:
   - Inbound: SSH (22) from your IP
   - Outbound: All traffic (for API + Ollama downloads)
4. **VPC Subnet** (public subnet with auto-assign public IP)

## Setup

```bash
cd packages/ec2
npm install
cp .env.example .env
```

Edit `.env` with your AWS configuration:

```env
AWS_REGION=us-east-1
EC2_KEY_NAME=your-key-pair-name
EC2_SECURITY_GROUP_ID=sg-xxxxxxxxx
EC2_SUBNET_ID=subnet-xxxxxxxxx
API_URL=http://your-api-server:3001
API_TOKEN=your-api-token
```

## Usage

### Launch a Worker

```bash
npm run launch
```

This will:
1. Launch a g4dn.xlarge spot instance
2. Install NVIDIA drivers + Ollama
3. Pull the LLM model (dolphin3)
4. Start the worker automatically
5. Auto-shutdown after 15 minutes of idle time

### Check Status

```bash
npm run status
```

Shows all running workers with:
- Instance ID and IP
- Runtime and estimated cost
- SSH connection command

### Terminate Workers

```bash
npm run terminate              # Terminate all workers
npm run terminate i-xxxxx      # Terminate specific instance
```

### View Logs

```bash
# SSH into the instance
ssh -i your-key.pem ubuntu@<public-ip>

# View worker logs
tail -f /home/ubuntu/worker.log

# View setup logs
cat /var/log/marketbrewer-setup.log
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Your Local Machine                 │
│  ┌─────────────┐  ┌─────────────┐                  │
│  │   Server    │  │  Dashboard  │                  │
│  │  (SQLite)   │  │   (React)   │                  │
│  └──────┬──────┘  └─────────────┘                  │
│         │                                           │
└─────────┼───────────────────────────────────────────┘
          │ HTTP API
          ▼
┌─────────────────────────────────────────────────────┐
│              AWS EC2 Spot Instance                  │
│  ┌─────────────────────────────────────────────┐   │
│  │  g4dn.xlarge (NVIDIA T4 GPU)                │   │
│  │  ┌─────────────┐  ┌─────────────────────┐   │   │
│  │  │   Worker    │──│  Ollama + dolphin3  │   │   │
│  │  │  (Node.js)  │  │    (Local LLM)      │   │   │
│  │  └─────────────┘  └─────────────────────┘   │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Spot Instance Handling

The worker automatically:
- Checks for spot termination notices every 5 seconds
- Releases any in-progress page back to the queue
- Gracefully shuts down on termination

If a spot instance is interrupted:
- In-progress page returns to "queued" status
- Other workers (or new instances) will pick it up
- No work is lost

## Auto-Shutdown

To minimize costs, instances auto-shutdown after idle time:

```env
AUTO_SHUTDOWN_MINUTES=15  # Default: 15 minutes
```

The idle timer resets whenever a page is completed.

## Troubleshooting

### Instance won't start
- Check spot capacity in your region
- Try a different availability zone
- Increase `SPOT_MAX_PRICE`

### Worker not connecting to API
- Ensure API server is accessible from internet
- Check security group allows outbound traffic
- Verify `API_URL` and `API_TOKEN` in .env

### Slow generation
- T4 GPU should generate ~1 page per 8-10 seconds
- If slower, check `nvidia-smi` for GPU utilization
- Ensure model is loaded: `ollama list`

### Out of GPU memory
- Use a smaller model (llama3.2:3b)
- Or upgrade to g5.xlarge (24GB GPU memory)
