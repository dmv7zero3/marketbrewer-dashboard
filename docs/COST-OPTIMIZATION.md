# EC2 Cost Optimization & Control Strategy

**Status:** ✅ ULTRA-MINIMAL approach (Dec 17, 2025 updated)  
**Target Budget:** $15/month maximum (staging)  
**Philosophy:** Zero unnecessary costs, redeploy on failure

---

## Executive Summary

**MarketBrewer staging operates on t3.large for ~$5-13/month with aggressive cost minimization:**
- ✅ Auto-stop enabled (8h/day usage only)
- ✅ No backups (redeploy on failure; 5-minute recovery)
- ✅ Minimal CloudWatch (essential alarms only)
- ✅ 7-day log retention (not 30+)
- ✅ No S3, no multi-AZ, no reserved capacity

**Production:** Single instance; multi-region redundancy deferred to v2.0.

---

## Cost Breakdown (Ultra-Minimal)

### Staging Setup

| Component                      | Cost/Month | Notes                          |
| ------------------------------ | ---------- | ------------------------------ |
| EC2 t3.large (auto-stop, 8h/d) | $8         | Stop at 6pm, start at 6am      |
| EBS Storage (50GB)             | $5         | Root volume only               |
| CloudWatch (minimal)           | $0.10      | CPU + disk alarms only         |
| Log retention (7 days)         | $0.50      | Auto-delete old logs           |
| **Total (Staging)**            | **$13.60** | ✅ Ultra-minimal               |

### With Manual Shutdown (Non-Business Hours)

| Component                      | Cost/Month | Notes                          |
| ------------------------------ | ---------- | ------------------------------ |
| EC2 t3.large (manual, ~0h/d)   | $0         | Stop when not actively testing |
| EBS Storage (50GB)             | $5         | Still charged when stopped     |
| CloudWatch (minimal)           | $0.10      | Always on                      |
| **Total (Minimal)**            | **$5.10**  | ✅ Absolute minimum            |

---

## Cost Reduction Strategies (Ranked by Impact)

### 🟢 HIGH-IMPACT (Already Implemented)

#### 1. Auto-Stop Schedule
- **Mechanism:** CloudFormation scheduled action
- **When:** Stop at 6 PM, start at 6 AM (or manual)
- **Savings:** $60 → $20/month compute (67% reduction)
- **Status:** ✅ In CloudFormation template

#### 2. Zero Backups
- **Approach:** No S3 backups, no EBS snapshots
- **Recovery:** Redeploy CloudFormation (5 min, free)
- **Risk:** Data loss acceptable for v1.0
- **Savings:** $5-10/month
- **Status:** ✅ Updated in PRE-EC2-LAUNCH-CHECKLIST

#### 3. Minimal CloudWatch
- **Keep:** CPU, disk, disk-full alarms only
- **Remove:** Custom metrics, dashboards, SNS for non-critical alerts
- **Savings:** $1-2/month
- **Status:** ✅ Updated CloudFormation

#### 4. Short Log Retention
- **Set:** 7 days for staging (not 30+)
- **Mechanism:** CloudWatch log group retention policy
- **Savings:** $0.50-1/month
- **Status:** ✅ Recommended

---

### 🟡 MEDIUM-IMPACT (Evaluate Later)

#### 5. Spot Instances for Staging
- **Cost:** t3.large Spot ~$2.40/month (vs $8 On-Demand)
- **Risk:** Interruptions acceptable for staging
- **Savings:** $5.60/month
- **Effort:** Modify CloudFormation for Spot pricing
- **Recommendation:** **Deploy On-Demand first; switch to Spot if costs become issue**

#### 6. Smaller Instance Type?
- **Question:** Can we use t3.medium (1 vCPU, 4GB)?
- **Bottleneck:** Ollama llama3.2 needs ~4GB minimum
- **Verdict:** t3.large is right-size; don't downgrade
- **Savings:** None (would trade reliability)

#### 7. EBS Optimization
- **Current:** 50GB root volume (reasonable)
- **Future:** If database grows > 40GB, implement data cleanup
- **Savings:** Minimal ($2.50 per 50GB)

---

### 🔵 LOW-IMPACT (Defer to Later)

#### 8. CloudWatch Logs Export to S3
- **Cost:** $0.50 per export + S3 storage
- **Benefit:** Long-term audit trail
- **Recommendation:** Defer to v1.1 (if required)

#### 9. Reserved Instances
- **Cost:** Commit to 1-year for 30% discount
- **Upfront:** $140 for 1-year commitment
- **Recommendation:** Defer to v2.0 (after proving MVP works)

#### 10. Consolidate to Multi-Region
- **Cost:** Multiple instances across regions
- **Benefit:** Redundancy, faster access
- **Recommendation:** Defer to v2.0

---

## Implementation Checklist

### Before EC2 Deployment

- [ ] Verify auto-stop CloudFormation action exists
- [ ] Verify CloudWatch alarms set (CPU, disk-full only)
- [ ] Set CloudWatch log retention to 7 days
- [ ] Verify no backup/snapshot schedule configured
- [ ] Confirm no S3 bucket created
- [ ] Disable SNS alerts for non-critical metrics

### During First Month

- [ ] Monitor AWS billing console weekly
- [ ] Document actual cost vs. estimate
- [ ] Check if instance is being used as planned
- [ ] Identify any unexpected charges

### If Costs Exceed $20/Month

1. **Check CloudWatch:** Review metric publishing
   - Disable custom metrics if not needed
   - Increase log retention cleanup

2. **Check EBS:** Verify disk not growing
   - Clear old logs manually
   - Verify database not accumulating data

3. **Consider Spot:** Switch staging to Spot instances
   - Risk: Interruptions (acceptable for staging)
   - Savings: ~$5.60/month

4. **Reduce Hours:** Shut down outside business hours
   - Savings: Additional $8/month
   - Effort: Manual start/stop via AWS console

---

## What NOT to Cut (Security & Reliability)

### Keep These (Non-Negotiable)

- ✅ **Health checks:** Critical for reliability
- ✅ **Rate limiting:** Security-critical
- ✅ **Database indexes:** Performance-critical
- ✅ **systemd restart policies:** Availability
- ✅ **CORS validation:** Security-critical
- ✅ **Input validation (Zod):** Security-critical

### Can Remove (Non-Critical)

- ❌ CloudWatch dashboards (use CLI if needed)
- ❌ Custom metrics (CPU/disk sufficient)
- ❌ SNS alerts for informational events
- ❌ Long-term log retention (7 days enough)
- ❌ EBS snapshots (redeploy instead)

---

## Cost Control: Manual vs. Automated

### Option A: Manual Control (Recommended for v1.0)

**Start instance when needed:**
```bash
# Via AWS Console: EC2 → select instance → Instance State → Start
# Via AWS CLI:
aws ec2 start-instances --instance-ids i-XXXXXXXX --region us-east-1
```

**Stop instance when done:**
```bash
# Via AWS Console: EC2 → select instance → Instance State → Stop
# Via AWS CLI:
aws ec2 stop-instances --instance-ids i-XXXXXXXX --region us-east-1
```

**Cost:** $0 if stopped 24/7, $8/month if running 8h/day

**Recommendation:** Best for testing (full control, low cost)

---

### Option B: Scheduled Auto-Stop (Staging)

**Configuration in CloudFormation:**

```yaml
# Recommended: Stop at 6pm, start at 6am
StopSchedule:
  Type: AWS::Events::Rule
  Properties:
    ScheduleExpression: "cron(0 22 * * ? *)"  # 10 PM UTC = 5 PM EST
    State: ENABLED
    Targets:
      - Arn: !Sub "arn:aws:ssm:${AWS::Region}::automation-assume-role/SSMAutomationRole"
        RoleArn: !GetAtt StopInstanceRole.Arn

StartSchedule:
  Type: AWS::Events::Rule
  Properties:
    ScheduleExpression: "cron(0 10 * * ? *)"  # 10 AM UTC = 5 AM EST
    State: ENABLED
```

**Cost:** $8/month with default 8h/day schedule

**Recommendation:** Good for continuous staging validation

---

### Option C: Always-On Production (Post-v1.0)

**For production, keep instance running 24/7**

**Cost:** $20 + $5 = $25/month

**Consideration:** Add redundancy later (v2.0)

---

## Estimated Monthly Costs (Final Recommendation)

| Scenario              | Compute | Storage | CloudWatch | **Total** |
| -------------------- | ------- | ------- | ---------- | --------- |
| Manual control (0h)   | $0      | $5      | $0.10      | **$5.10** |
| Auto-stop (8h/day)    | $8      | $5      | $0.10      | **$13.10**|
| Always-on (24h)       | $20     | $5      | $0.10      | **$25.10**|
| Spot + auto-stop      | $2.40   | $5      | $0.10      | **$7.50** |

**Recommendation for v1.0:** Manual control or auto-stop (your choice)
**Annual Savings:** ~$150-300/year vs. always-on setup

---

## Questions for Implementation

1. **How often will staging be used?**
   - Daily: Use auto-stop (8h/day) → $13/month
   - Weekly: Use manual stop → $5/month
   - As-needed: Use manual control → $5/month

2. **Is instance failure acceptable?**
   - Yes: Skip backups, redeploy on failure → save $5-10/month
   - No: Add S3 backups in v1.1 → add $5/month

3. **Should production stay always-on?**
   - Yes: Single instance, no redundancy → $25/month
   - No: Implement multi-AZ later → v2.0 feature

---

## Action Items (This Week)

1. [ ] Deploy EC2 with auto-stop enabled
2. [ ] Set CloudWatch log retention to 7 days
3. [ ] Disable non-essential CloudWatch metrics
4. [ ] Monitor billing for first week
5. [ ] Document actual vs. estimated costs
6. [ ] Decide on Spot instance conversion (if cost > $15)

---

## Next Steps (Post-MVP)

### v1.1 (Month 2)
- Add CloudWatch Logs export (if audit trail needed)
- Implement automated cleanup (if disk grows)

### v2.0 (Future)
- Multi-AZ redundancy (high availability)
- Multi-region deployment
- Reserved Instance commitments (if MVP successful)
- Data replication to S3 (if production critical)

---

## Summary

**Bottom line:** MarketBrewer v1.0 staging costs $5-13/month using aggressive cost minimization:
- Zero backups (redeploy on failure)
- Auto-stop or manual control
- Minimal CloudWatch
- Single instance, no redundancy

**This is acceptable for MVP; add redundancy and backups in v2.0 if revenue justifies it.**



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
