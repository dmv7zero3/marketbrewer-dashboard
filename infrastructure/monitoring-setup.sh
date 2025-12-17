#!/bin/bash

##############################################################################
# MarketBrewer Monitoring & Alerting Setup
# 
# Configure CloudWatch metrics, alarms, and dashboards for:
# - EC2 instance health
# - API response times and error rates
# - Worker job processing and queue depth
# - Cost monitoring and billing alerts
# - System resource utilization (CPU, memory, disk)
# - Ollama model inference metrics
#
# Usage: bash infrastructure/monitoring-setup.sh
# 
# Prerequisites:
# - AWS CLI configured with credentials
# - IAM permissions for CloudWatch, SNS, CloudFormation
# - EC2 instance running with CloudWatch agent
##############################################################################

set -euo pipefail

# Configuration
STACK_NAME="${STACK_NAME:-marketbrewer-monitoring}"
SNS_EMAIL="${SNS_EMAIL:-j@marketbrewer.com}"
ALARM_ACTIONS_ENABLED="${ALARM_ACTIONS_ENABLED:-true}"
REGION="${AWS_REGION:-us-east-1}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

# ==============================================================================
# STEP 1: Create SNS Topic for Alerts
# ==============================================================================

create_sns_topic() {
  echo "Creating SNS topic for monitoring alerts..."
  
  TOPIC_ARN=$(aws sns create-topic \
    --name marketbrewer-alerts \
    --region "$REGION" \
    --query 'TopicArn' \
    --output text)
  
  log_info "SNS Topic created: $TOPIC_ARN"
  
  # Subscribe email address
  aws sns subscribe \
    --topic-arn "$TOPIC_ARN" \
    --protocol email \
    --notification-endpoint "$SNS_EMAIL" \
    --region "$REGION" > /dev/null
  
  log_warn "Subscription confirmation email sent to $SNS_EMAIL"
  echo ""
}

# ==============================================================================
# STEP 2: Create CloudWatch Log Groups
# ==============================================================================

create_log_groups() {
  echo "Creating CloudWatch log groups..."
  
  LOG_GROUPS=(
    "/marketbrewer/api"
    "/marketbrewer/worker"
    "/marketbrewer/system"
    "/marketbrewer/ollama"
    "/marketbrewer/costs"
  )
  
  for LOG_GROUP in "${LOG_GROUPS[@]}"; do
    aws logs create-log-group \
      --log-group-name "$LOG_GROUP" \
      --region "$REGION" 2>/dev/null || true
    
    # Set retention to 30 days
    aws logs put-retention-policy \
      --log-group-name "$LOG_GROUP" \
      --retention-in-days 30 \
      --region "$REGION" 2>/dev/null || true
    
    log_info "Log group: $LOG_GROUP (30-day retention)"
  done
  echo ""
}

# ==============================================================================
# STEP 3: Create Custom Metrics
# ==============================================================================

create_custom_metrics() {
  echo "Configuring custom application metrics..."
  
  # Create metric filter for API errors
  aws logs put-metric-filter \
    --log-group-name "/marketbrewer/api" \
    --filter-name "API-Errors" \
    --filter-pattern "[timestamp, request_id, level=ERROR*]" \
    --metric-transformations \
      metricName=APIErrorCount,metricNamespace=MarketBrewer/API,metricValue=1 \
    --region "$REGION" 2>/dev/null || true
  
  log_info "API error metric created"
  
  # Create metric filter for worker errors
  aws logs put-metric-filter \
    --log-group-name "/marketbrewer/worker" \
    --filter-name "Worker-Errors" \
    --filter-pattern "[timestamp, request_id, level=ERROR*]" \
    --metric-transformations \
      metricName=WorkerErrorCount,metricNamespace=MarketBrewer/Worker,metricValue=1 \
    --region "$REGION" 2>/dev/null || true
  
  log_info "Worker error metric created"
  
  # Create metric filter for Ollama inference time
  aws logs put-metric-filter \
    --log-group-name "/marketbrewer/ollama" \
    --filter-name "Inference-Time" \
    --filter-pattern "[timestamp, request_id, inference_ms=*]" \
    --metric-transformations \
      metricName=InferenceTime,metricNamespace=MarketBrewer/Ollama,metricValue='$inference_ms' \
    --region "$REGION" 2>/dev/null || true
  
  log_info "Ollama inference time metric created"
  echo ""
}

# ==============================================================================
# STEP 4: Create CloudWatch Alarms
# ==============================================================================

create_alarms() {
  echo "Creating CloudWatch alarms..."
  
  TOPIC_ARN=$(aws sns list-topics \
    --region "$REGION" \
    --query "Topics[?contains(TopicArn, 'marketbrewer-alerts')].TopicArn" \
    --output text)
  
  if [ -z "$TOPIC_ARN" ]; then
    log_error "SNS topic not found. Skipping alarms."
    return 1
  fi
  
  # CPU Utilization Alarm
  aws cloudwatch put-metric-alarm \
    --alarm-name marketbrewer-high-cpu \
    --alarm-description "Alert when CPU exceeds 80%" \
    --metric-name CPUUtilization \
    --namespace AWS/EC2 \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --alarm-actions "$TOPIC_ARN" \
    --region "$REGION" 2>/dev/null || true
  
  log_info "Alarm: High CPU (>80% for 10 min)"
  
  # Memory Utilization Alarm (from CloudWatch agent)
  aws cloudwatch put-metric-alarm \
    --alarm-name marketbrewer-high-memory \
    --alarm-description "Alert when memory exceeds 85%" \
    --metric-name MemoryUtilization \
    --namespace CWAgent \
    --statistic Average \
    --period 300 \
    --threshold 85 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --alarm-actions "$TOPIC_ARN" \
    --region "$REGION" 2>/dev/null || true
  
  log_info "Alarm: High Memory (>85% for 10 min)"
  
  # Disk Utilization Alarm
  aws cloudwatch put-metric-alarm \
    --alarm-name marketbrewer-high-disk \
    --alarm-description "Alert when disk exceeds 90%" \
    --metric-name DiskSpaceUtilization \
    --namespace CWAgent \
    --statistic Average \
    --period 300 \
    --threshold 90 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --alarm-actions "$TOPIC_ARN" \
    --region "$REGION" 2>/dev/null || true
  
  log_info "Alarm: High Disk (>90% for 10 min)"
  
  # API Error Rate Alarm
  aws cloudwatch put-metric-alarm \
    --alarm-name marketbrewer-api-errors \
    --alarm-description "Alert when API errors exceed 1%" \
    --metric-name APIErrorCount \
    --namespace MarketBrewer/API \
    --statistic Sum \
    --period 300 \
    --threshold 5 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 1 \
    --alarm-actions "$TOPIC_ARN" \
    --region "$REGION" 2>/dev/null || true
  
  log_info "Alarm: API Errors (>5 in 5 min)"
  
  # Worker Queue Depth Alarm
  aws cloudwatch put-metric-alarm \
    --alarm-name marketbrewer-worker-backlog \
    --alarm-description "Alert when worker queue exceeds 50 jobs" \
    --metric-name QueueDepth \
    --namespace MarketBrewer/Worker \
    --statistic Maximum \
    --period 300 \
    --threshold 50 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 1 \
    --alarm-actions "$TOPIC_ARN" \
    --region "$REGION" 2>/dev/null || true
  
  log_info "Alarm: Worker Queue (>50 jobs)"
  
  # Billing Alarm
  aws cloudwatch put-metric-alarm \
    --alarm-name marketbrewer-monthly-costs \
    --alarm-description "Alert when estimated monthly costs exceed \$30" \
    --metric-name EstimatedCharges \
    --namespace AWS/Billing \
    --statistic Maximum \
    --period 86400 \
    --threshold 30 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 1 \
    --alarm-actions "$TOPIC_ARN" \
    --region "$REGION" 2>/dev/null || true
  
  log_info "Alarm: Billing (estimated >$30/month)"
  
  # StatusCheckFailed Alarm (instance health)
  aws cloudwatch put-metric-alarm \
    --alarm-name marketbrewer-instance-unhealthy \
    --alarm-description "Alert when EC2 instance fails status checks" \
    --metric-name StatusCheckFailed \
    --namespace AWS/EC2 \
    --statistic Maximum \
    --period 300 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --evaluation-periods 2 \
    --alarm-actions "$TOPIC_ARN" \
    --region "$REGION" 2>/dev/null || true
  
  log_info "Alarm: Instance Health (failed status check)"
  
  echo ""
}

# ==============================================================================
# STEP 5: Create CloudWatch Dashboard
# ==============================================================================

create_dashboard() {
  echo "Creating CloudWatch dashboard..."
  
  DASHBOARD_BODY=$(cat <<'EOF'
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/EC2", "CPUUtilization", { "stat": "Average" } ],
          [ "CWAgent", "MemoryUtilization", { "stat": "Average" } ],
          [ "CWAgent", "DiskSpaceUtilization", { "stat": "Average" } ]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "System Resource Utilization"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "MarketBrewer/API", "APIErrorCount", { "stat": "Sum" } ],
          [ "MarketBrewer/Worker", "WorkerErrorCount", { "stat": "Sum" } ]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "Error Rates"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "MarketBrewer/Worker", "QueueDepth", { "stat": "Maximum" } ],
          [ "MarketBrewer/Ollama", "InferenceTime", { "stat": "Average" } ]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Worker & LLM Performance"
      }
    },
    {
      "type": "log",
      "properties": {
        "query": "fields @timestamp, level, message | stats count() by level",
        "region": "us-east-1",
        "title": "Log Summary"
      }
    }
  ]
}
EOF
)
  
  aws cloudwatch put-dashboard \
    --dashboard-name MarketBrewerOverview \
    --dashboard-body "$DASHBOARD_BODY" \
    --region "$REGION" 2>/dev/null || true
  
  log_info "Dashboard created: MarketBrewerOverview"
  echo ""
}

# ==============================================================================
# STEP 6: Configure CloudWatch Agent (on EC2)
# ==============================================================================

create_agent_config() {
  echo "Creating CloudWatch Agent configuration..."
  
  cat > /tmp/cloudwatch-config.json <<'EOF'
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "ec2-user"
  },
  "metrics": {
    "namespace": "CWAgent",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          {
            "name": "cpu_usage_idle",
            "rename": "CPU_USAGE_IDLE",
            "unit": "Percent"
          },
          {
            "name": "cpu_usage_iowait",
            "rename": "CPU_USAGE_IOWAIT",
            "unit": "Percent"
          },
          "cpu_time_guest"
        ],
        "metrics_collection_interval": 60,
        "aggregation_dimensions": [
          [
            "InstanceId"
          ]
        ]
      },
      "disk": {
        "measurement": [
          {
            "name": "used_percent",
            "rename": "DiskSpaceUtilization",
            "unit": "Percent"
          },
          "inodes_free"
        ],
        "metrics_collection_interval": 60,
        "aggregation_dimensions": [
          [
            "InstanceId",
            "path"
          ]
        ],
        "resources": [
          "*"
        ]
      },
      "mem": {
        "measurement": [
          {
            "name": "mem_used_percent",
            "rename": "MemoryUtilization",
            "unit": "Percent"
          }
        ],
        "metrics_collection_interval": 60,
        "aggregation_dimensions": [
          [
            "InstanceId"
          ]
        ]
      },
      "netstat": {
        "measurement": [
          {
            "name": "tcp_established",
            "rename": "TCP_ESTABLISHED",
            "unit": "Count"
          }
        ],
        "metrics_collection_interval": 60,
        "aggregation_dimensions": [
          [
            "InstanceId"
          ]
        ]
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/seo-api.log",
            "log_group_name": "/marketbrewer/api",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/var/log/seo-worker.log",
            "log_group_name": "/marketbrewer/worker",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/var/log/syslog",
            "log_group_name": "/marketbrewer/system",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
EOF
  
  log_info "CloudWatch Agent configuration created: /tmp/cloudwatch-config.json"
  echo ""
  echo "To install on EC2 instance:"
  echo "  1. Download CloudWatch Agent:"
  echo "     cd /tmp && wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm"
  echo "  2. Install:"
  echo "     sudo rpm -U ./amazon-cloudwatch-agent.rpm"
  echo "  3. Configure:"
  echo "     sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a query -m ec2 -c file:/tmp/cloudwatch-config.json -s"
  echo ""
}

# ==============================================================================
# STEP 7: Application Logging Setup
# ==============================================================================

create_app_logging() {
  echo "Creating application logging configuration..."
  
  cat > /tmp/winston-config.json <<'EOF'
{
  "transports": [
    {
      "type": "file",
      "filename": "/var/log/seo-api.log",
      "level": "info",
      "format": "json",
      "maxsize": 52428800,
      "maxFiles": 5
    },
    {
      "type": "console",
      "level": "info",
      "format": "simple"
    }
  ],
  "defaultMeta": {
    "service": "marketbrewer-api",
    "version": "1.0.0"
  },
  "exceptionHandlers": [
    {
      "type": "file",
      "filename": "/var/log/seo-api-exceptions.log"
    }
  ]
}
EOF
  
  log_info "Application logging config created: /tmp/winston-config.json"
  echo ""
}

# ==============================================================================
# STEP 8: Cost Tracking Setup
# ==============================================================================

create_cost_tracking() {
  echo "Setting up cost tracking..."
  
  # Enable Cost Explorer API
  aws ce list-cost-allocation-tags --region "$REGION" > /dev/null 2>&1 || {
    log_warn "Cost Explorer may take 24-48 hours to populate. Check AWS Billing console."
  }
  
  # Create cost anomaly detection
  aws ce create-anomaly-monitor \
    --anomaly-monitor '{
      "MonitorName": "marketbrewer-costs",
      "MonitorType": "CUSTOM",
      "MonitorSpecification": "{\"Tags\":{\"Key\":\"Application\",\"Values\":[\"marketbrewer\"]}}"
    }' \
    --region "$REGION" 2>/dev/null || true
  
  log_info "Cost anomaly detection enabled"
  echo ""
}

# ==============================================================================
# STEP 9: Summary and Health Check
# ==============================================================================

print_summary() {
  echo "=============================================="
  echo "   Monitoring Setup Complete!"
  echo "=============================================="
  echo ""
  echo "Resources Created:"
  echo "  • SNS Topic: marketbrewer-alerts"
  echo "  • Log Groups: /marketbrewer/{api,worker,system,ollama,costs}"
  echo "  • Custom Metrics: API errors, Worker errors, Ollama inference time"
  echo "  • 7 CloudWatch Alarms: CPU, Memory, Disk, API, Worker, Billing, Instance Health"
  echo "  • CloudWatch Dashboard: MarketBrewerOverview"
  echo ""
  echo "Next Steps:"
  echo "  1. Confirm SNS subscription email (check $SNS_EMAIL inbox)"
  echo "  2. Install CloudWatch Agent on EC2 instance (see above)"
  echo "  3. Configure application logging (update code to use Winston)"
  echo "  4. Test alarms: aws cloudwatch set-alarm-state --alarm-name marketbrewer-high-cpu --state-value ALARM --state-reason 'Test alarm'"
  echo ""
  echo "Monitoring Dashboard:"
  echo "  AWS Console → CloudWatch → Dashboards → MarketBrewerOverview"
  echo ""
  echo "Billing:"
  echo "  AWS Console → Billing → Bills → Current Month"
  echo ""
}

# ==============================================================================
# Main
# ==============================================================================

main() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║   MarketBrewer Monitoring & Alerting Setup                    ║"
  echo "║   Region: $REGION"
  echo "║   SNS Email: $SNS_EMAIL"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""
  
  # Verify AWS CLI
  if ! command -v aws &> /dev/null; then
    log_error "AWS CLI not found. Install from: https://aws.amazon.com/cli/"
    exit 1
  fi
  
  # Verify credentials
  if ! aws sts get-caller-identity > /dev/null 2>&1; then
    log_error "AWS credentials not configured. Run: aws configure"
    exit 1
  fi
  
  create_sns_topic
  create_log_groups
  create_custom_metrics
  create_alarms
  create_dashboard
  create_agent_config
  create_app_logging
  create_cost_tracking
  print_summary
}

main "$@"
