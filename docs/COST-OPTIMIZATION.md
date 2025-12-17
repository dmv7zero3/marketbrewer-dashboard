# EC2 Cost Optimization & Control Strategy

**Status:** ✅ Recommended for v1.0.0  
**Updated:** December 17, 2025  
**Target Budget:** $35/month maximum

---

## Executive Summary

**MarketBrewer can operate on t3.large for ~$20-25/month by stopping the instance when not in use.** This exceeds performance requirements while staying well under budget.

---

## Cost Breakdown

### t3.large (Recommended for v1.0)

| Component             | Cost/Month | Notes          |
| --------------------- | ---------- | -------------- |
| EC2 t3.large (24/7)   | $60        | ❌ Over budget |
| EC2 t3.large (8h/day) | $20        | ✅ Recommended |
| EBS Storage (50GB)    | $2.50      | Stays same     |
| Ollama (local, free)  | $0         | No cloud costs |
| **Total (8h/day)**    | **$22.50** | ✅ Under $35   |

### Cost Comparison

```
Scenario: 100 pages/month generation (realistic)

t3.medium (always on):    $30 + $2.50 = $32.50
t3.large (8h/day):        $20 + $2.50 = $22.50  ← BEST CHOICE
t3.large (always on):     $60 + $2.50 = $62.50  ← AVOID
SPOT t3.large (Phase 2):  $6 + $2.50 = $8.50    ← Future option
```

---

## Instance Control Strategy

### ✅ Manual Start/Stop (Simple)

**When to stop:**

- End of workday (5pm)
- After deployment verification
- Not using actively

**When to start:**

- Beginning of workday (8am)
- Testing new features
- Client demonstrations

**Commands:**

```bash
# Stop instance (save money!)
aws ec2 stop-instances --instance-ids i-xxxxxxxxx

# Start instance
aws ec2 start-instances --instance-ids i-xxxxxxxxx

# Check status
aws ec2 describe-instances --instance-ids i-xxxxxxxxx \
  --query 'Reservations[0].Instances[0].State.Name'
```

**AWS Console:**

1. EC2 Dashboard → Instances
2. Select instance
3. Instance State → Stop / Start

### ✅ Auto-Stop on Idle (Advanced)

**For hands-free cost control**, install auto-shutdown script:

```bash
# SSH into instance
ssh -i ~/.ssh/marketbrewer-key.pem ubuntu@<PUBLIC_IP>

# Create auto-shutdown script
cat > /usr/local/bin/ec2-auto-shutdown.sh << 'EOF'
#!/bin/bash
# Auto-stop EC2 when idle for N minutes

INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
IDLE_THRESHOLD_MINUTES=30          # Stop after 30 min idle
CPU_THRESHOLD=5                    # CPU < 5% = idle
CHECK_INTERVAL_SECONDS=60          # Check every 60 sec

IDLE_COUNTER=0

while true; do
  # Get CPU usage
  CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
  CPU_USAGE=${CPU_USAGE%.*}  # Remove decimals

  if [ "$CPU_USAGE" -lt "$CPU_THRESHOLD" ]; then
    IDLE_COUNTER=$((IDLE_COUNTER + 1))
    IDLE_MINUTES=$((IDLE_COUNTER * CHECK_INTERVAL_SECONDS / 60))

    if [ "$IDLE_MINUTES" -ge "$IDLE_THRESHOLD_MINUTES" ]; then
      echo "[$(date)] CPU idle for $IDLE_MINUTES minutes. Stopping instance..."
      aws ec2 stop-instances --instance-ids "$INSTANCE_ID"
      exit 0
    fi
  else
    IDLE_COUNTER=0  # Reset if CPU active
  fi

  sleep "$CHECK_INTERVAL_SECONDS"
done
EOF

chmod +x /usr/local/bin/ec2-auto-shutdown.sh

# Run as background service (optional)
nohup /usr/local/bin/ec2-auto-shutdown.sh > /var/log/ec2-auto-shutdown.log 2>&1 &
```

### ✅ Scheduled Start/Stop (via Lambda)

**For weekly schedule** (e.g., stop 6pm daily, start 8am daily):

```bash
# AWS CLI: Create scheduled stop
aws events put-rule \
  --name "marketbrewer-stop-6pm" \
  --schedule-expression "cron(0 22 ? * MON-FRI *)" \
  --state ENABLED

# Create Lambda function to stop instance
# (Requires IAM role with ec2:StopInstances permission)
```

**Easier Alternative: AWS Systems Manager (Free)**

1. AWS Console → Systems Manager → Maintenance Windows
2. Create window: Mon-Fri 10pm UTC (6pm EST)
3. Add task: Stop EC2 instances
4. Done!

---

## Real-World Usage Scenarios

### Scenario 1: Development/Testing (Most Common)

```
Monday-Friday:
├── 8am: Start instance (manual or scheduled)
├── 8am-5pm: Use normally (generate pages, test)
└── 5pm: Stop instance (manual or auto)

Cost: ~$20/month (8h × 22 weekdays)
Plus: Storage $2.50
Total: $22.50/month ✅
```

### Scenario 2: Batch Content Generation

```
Weekend batch run:
├── Friday 5pm: Generate 200 pages (API + queue)
├── Runs continuously 6 hours
├── Auto-stops when queue empty
└── Saturday-Sunday: Stopped (no cost)

Cost: One instance = $2.50
Plus: One batch run ≈ $5
Total: ~$7.50 for batch ✅
```

### Scenario 3: Always-On (Production - Phase 2)

```
Deployed with load balancer + auto-scaling:
├── Min 1 instance (t3.large always on)
├── Max 3 instances (during peak)
├── Average: 1.5 instances running
└── SPOT instances for burst

Cost: $45/month + $5 SPOT
Total: ~$50/month
```

---

## Monitoring Costs

### CloudWatch Alerts (Optional but Recommended)

```bash
# Alert if EC2 running > 8 hours/day
# Alert if bill exceeds $35 estimated

aws cloudwatch put-metric-alarm \
  --alarm-name "marketbrewer-ec2-high-cost" \
  --alarm-description "Alert if EC2 running too long" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 3600 \
  --threshold 35 \
  --comparison-operator GreaterThanThreshold
```

### Monthly Cost Review

```bash
# Check actual costs
aws ce get-cost-and-usage \
  --time-period Start=2025-12-01,End=2025-12-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```

---

## AWS Billing Dashboard

**Best way to monitor costs:**

1. AWS Console → Billing & Cost Management
2. Click "Cost Explorer"
3. Filter by: Service = EC2, Region = your region
4. View daily/monthly trend
5. Set budget alert at $30/month (gives 5% buffer)

---

## SPOT Instances (Phase 2 Consideration)

### When to use SPOT for v1.0? ❌

**Not recommended yet because:**

- Ollama model cold-start takes ~10 minutes
- Can be interrupted mid-page-generation
- Needs complex interrupt handling

### Phase 2: SPOT + On-Demand Hybrid

```
Architecture:
├── On-demand t3.large (API, always ready)
│   └── Cost: $20/month (8h/day)
│
├── SPOT t3.large (batch generation)
│   ├── Spawned when queue > 10 jobs
│   ├── Runs Ollama pre-warmed
│   └── Cost: $6/month
│
└── Auto-scaling group (max 3 instances)

Total: ~$26-35/month for high volume
```

**Benefits:**

- 70% cheaper for burst capacity
- Handle interruptions gracefully
- Scale to 1000s of pages/month

---

## Lambda Alternative Analysis

### Could we use Lambda for content generation? ❌

**Pros:**

- Pay only for compute time
- Auto-scales
- No instance management

**Cons:**

- **Ollama model size:** 4GB+ exceeds Lambda limits
- **Cold start:** Model load = 10 minutes (unacceptable)
- **Timeout:** 15-minute max (reasonable but tight)
- **Cost:** Actually more expensive for our workload
  - t3.large 8h/day: $20/month
  - Lambda 100 pages/month: $40/month

**Verdict:** Use EC2 for v1.0, revisit Lambda in Phase 3 if moving to cloud models (GPT-4, Claude).

---

## Cost Control Checklist

Before going to production, execute:

- [ ] Choose instance type: **t3.large** recommended
- [ ] Set up auto-stop: Manual or scheduled
- [ ] Create AWS Billing alarm at $30/month
- [ ] Add monthly cost review to calendar
- [ ] Document stop/start procedures for team
- [ ] Test stopping/starting instance weekly
- [ ] Track actual costs first month
- [ ] Adjust schedule if needed

---

## Monthly Budget Template

| Item                  | Planned    | Actual | Notes           |
| --------------------- | ---------- | ------ | --------------- |
| EC2 t3.large (8h/day) | $20        |        |                 |
| EBS Storage (50GB)    | $2.50      |        |                 |
| Data transfer         | $0         |        |                 |
| CloudWatch            | $0         |        |                 |
| **Total**             | **$22.50** |        | **Budget: $35** |

---

## Emergency Cost Containment

**If bill exceeds $40:**

1. Stop all instances: `aws ec2 stop-instances --all`
2. Check CloudWatch for unexpected activity
3. Review EC2 Dashboard for stray instances
4. Check S3 for unexpected large buckets
5. Contact AWS Support for cost adjustment

---

## Key Takeaways

| Goal              | Solution            | Cost Impact          |
| ----------------- | ------------------- | -------------------- |
| **Faster pages**  | Upgrade to t3.large | +$10/month           |
| **Cost control**  | Stop when not using | -$40/month           |
| **Auto shutdown** | Install script      | $0 + peace of mind   |
| **Budget safety** | CloudWatch alerts   | $0 + assurance       |
| **Phase 2 scale** | SPOT instances      | -$14/month for burst |

---

## Support & Escalation

**Questions about costs?**

- See AWS EC2 pricing page
- Contact AWS Support for reserved instances
- Consider AWS Cost Optimization reviews

**Got an unexpected bill?**

- Check CloudWatch logs for rogue processes
- Verify no SPOT instances left running
- Contact AWS for bill review

---

**Last Updated:** December 17, 2025  
**Strategy:** RECOMMENDED for v1.0  
**Target:** $22.50-35/month with t3.large + cost control
