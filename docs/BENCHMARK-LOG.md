# MarketBrewer SEO Generation Benchmarks

This document tracks performance benchmarks for LLM-based SEO page generation across different hardware configurations.

---

## Benchmark Summary

| Date | Instance | GPU | Model | Tokens/sec | Time/Page | Pages/Hour | Cost/1000 Pages |
|------|----------|-----|-------|------------|-----------|------------|-----------------|
| 2025-12-23 | g5.xlarge | NVIDIA A10G (24GB) | llama3.1:8b | 92 | 6.0s | 600 | $0.70 |

---

## Detailed Benchmarks

### 2025-12-23 - g5.xlarge (NVIDIA A10G)

**Configuration:**
- Instance: g5.xlarge (spot @ $0.42/hr)
- GPU: NVIDIA A10G (24GB VRAM)
- Model: llama3.1:8b (4.9GB)
- Region: us-east-1

**Results:**
```
Cold start (model load): 63.9s
Warm generation average: 5.8s
Tokens per second: 92
Tokens per page: ~450
```

**Generation Times (5 warm runs):**
| Run | Time | Tokens | Tokens/sec |
|-----|------|--------|------------|
| 1 | 5.6s | 440 | 92 |
| 2 | 6.2s | 486 | 92 |
| 3 | 6.0s | 464 | 92 |
| 4 | 5.5s | 434 | 92 |
| 5 | 5.5s | 434 | 92 |

**Production Run:**
- Pages generated: 807 (before spot interruption)
- Average time per page: ~7s (including SQS/DynamoDB overhead)
- Spot interruption: Yes (capacity reclaimed after ~1.5 hours)

---

## Instance Comparison (Expected)

| Instance | GPU | VRAM | Spot Price | Est. Tokens/sec | Est. Time/Page |
|----------|-----|------|------------|-----------------|----------------|
| g5.xlarge | A10G | 24GB | $0.42/hr | 92 | 6s |
| g5.2xlarge | A10G | 24GB | $0.45/hr | 92 | 6s |
| g4dn.xlarge | T4 | 16GB | $0.19/hr | ~50 | ~10s |
| g4dn.2xlarge | T4 | 16GB | $0.27/hr | ~50 | ~10s |
| p3.2xlarge | V100 | 16GB | $0.31/hr | ~80 | ~7s |

---

## Benchmark Script

To run benchmarks on a new instance:

```bash
ssh -i ~/.ssh/marketbrewer-gpu.pem ubuntu@<IP> 'cat > benchmark.sh' << 'EOF'
#!/bin/bash
echo "MarketBrewer SEO Benchmark"
echo "=========================="
echo "Instance: $(curl -s http://169.254.169.254/latest/meta-data/instance-type)"
echo "GPU: $(nvidia-smi --query-gpu=name --format=csv,noheader)"
echo "Date: $(date)"
echo ""

PROMPT="Generate SEO content for DUI Lawyer in Montgomery County, MD. Business: Street Lawyer Magic. Return JSON with title, meta_description, h1, and 3 sections of 100+ words each."

echo "Running 5 generations..."
for i in 1 2 3 4 5; do
  START=$(date +%s.%N)
  RESPONSE=$(curl -s http://localhost:11434/api/generate \
    -H "Content-Type: application/json" \
    -d "{\"model\": \"llama3.1:8b\", \"prompt\": \"$PROMPT\", \"stream\": false}")
  END=$(date +%s.%N)

  ELAPSED=$(echo "$END - $START" | bc)
  TOKENS=$(echo "$RESPONSE" | jq -r '.eval_count // 0')
  TPS=$(echo "$RESPONSE" | jq -r '.eval_count / (.eval_duration / 1000000000) // 0')

  echo "Run $i: ${ELAPSED}s, $TOKENS tokens, $TPS tok/s"
done
EOF
chmod +x benchmark.sh && ./benchmark.sh
```

---

## Cost Analysis

### Street Lawyer Magic Job (1,734 pages)

**Actual costs (2025-12-23):**
- First run (g5.xlarge): 807 pages in ~1.5 hours = $0.63
- Remaining: 927 pages (pending spot capacity)
- Estimated total: ~$1.50

**Cost per 1000 pages by instance:**
| Instance | Spot Price | Pages/Hour | Cost/1000 |
|----------|------------|------------|-----------|
| g5.xlarge | $0.42 | 600 | $0.70 |
| g4dn.xlarge | $0.19 | 360 | $0.53 |
| g5.2xlarge | $0.45 | 600 | $0.75 |

---

## Notes

1. **Spot Interruptions:** Spot instances can be reclaimed with 2-minute warning. SQS queue ensures no data loss - messages return to queue automatically.

2. **Cold Start:** First generation takes ~60s as model loads into GPU memory. Subsequent generations are ~6-10s.

3. **Model Size:** llama3.1:8b requires ~5GB VRAM. Fits comfortably on T4 (16GB) and A10G (24GB).

4. **Scaling:** With SQS queue architecture, multiple workers can process in parallel. Each additional worker adds linear throughput.
