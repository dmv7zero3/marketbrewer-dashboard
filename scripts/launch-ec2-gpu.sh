#!/bin/bash
# MarketBrewer EC2 GPU Spot Instance Launcher
# Creates security group, key pair, and launches g4dn.xlarge spot instance

set -e

# Configuration
REGION="us-east-1"
INSTANCE_TYPE="g4dn.xlarge"
KEY_NAME="marketbrewer-gpu"
SECURITY_GROUP_NAME="marketbrewer-gpu-sg"
MY_IP="$(curl -s https://checkip.amazonaws.com)/32"
SPOT_PRICE="0.25"  # Max price (safety margin above $0.18 spot)
AMI_ID=""  # Will be auto-detected

# Deep Learning AMI (Ubuntu) - auto-detect latest
get_dl_ami() {
    aws ec2 describe-images \
        --region "$REGION" \
        --owners amazon \
        --filters "Name=name,Values=Deep Learning AMI GPU PyTorch*Ubuntu 22.04*" \
        --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
        --output text
}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "=========================================="
echo "  MarketBrewer EC2 GPU Launcher"
echo "=========================================="
echo ""
echo "Configuration:"
echo "  Region: $REGION"
echo "  Instance: $INSTANCE_TYPE"
echo "  Your IP: $MY_IP"
echo ""

# Step 1: Get or create key pair
print_status "Setting up SSH key pair..."
KEY_FILE="$HOME/.ssh/${KEY_NAME}.pem"

if aws ec2 describe-key-pairs --key-names "$KEY_NAME" --region "$REGION" 2>/dev/null; then
    print_status "Key pair '$KEY_NAME' already exists"
    if [ ! -f "$KEY_FILE" ]; then
        print_error "Key file not found at $KEY_FILE"
        print_error "Delete the key pair and run again, or locate the .pem file"
        exit 1
    fi
else
    print_status "Creating new key pair..."
    aws ec2 create-key-pair \
        --key-name "$KEY_NAME" \
        --region "$REGION" \
        --query 'KeyMaterial' \
        --output text > "$KEY_FILE"
    chmod 400 "$KEY_FILE"
    print_status "Key saved to: $KEY_FILE"
fi

# Step 2: Get or create security group
print_status "Setting up security group..."
SG_ID=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=$SECURITY_GROUP_NAME" \
    --region "$REGION" \
    --query 'SecurityGroups[0].GroupId' \
    --output text 2>/dev/null || echo "None")

if [ "$SG_ID" == "None" ] || [ -z "$SG_ID" ]; then
    print_status "Creating security group..."
    SG_ID=$(aws ec2 create-security-group \
        --group-name "$SECURITY_GROUP_NAME" \
        --description "MarketBrewer GPU generation instance" \
        --region "$REGION" \
        --query 'GroupId' \
        --output text)

    # Add SSH rule
    aws ec2 authorize-security-group-ingress \
        --group-id "$SG_ID" \
        --protocol tcp \
        --port 22 \
        --cidr "$MY_IP" \
        --region "$REGION"

    print_status "Security group created: $SG_ID"
else
    print_status "Using existing security group: $SG_ID"

    # Update SSH rule with current IP
    aws ec2 revoke-security-group-ingress \
        --group-id "$SG_ID" \
        --protocol tcp \
        --port 22 \
        --cidr "0.0.0.0/0" \
        --region "$REGION" 2>/dev/null || true

    aws ec2 authorize-security-group-ingress \
        --group-id "$SG_ID" \
        --protocol tcp \
        --port 22 \
        --cidr "$MY_IP" \
        --region "$REGION" 2>/dev/null || true
fi

# Step 3: Find the Deep Learning AMI
print_status "Finding Deep Learning AMI..."
AMI_ID=$(get_dl_ami)

if [ -z "$AMI_ID" ] || [ "$AMI_ID" == "None" ]; then
    print_warning "Deep Learning AMI not found, using Ubuntu 22.04 base"
    AMI_ID=$(aws ec2 describe-images \
        --region "$REGION" \
        --owners amazon \
        --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
        --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
        --output text)
fi

print_status "Using AMI: $AMI_ID"

# Step 4: Create user data script
USER_DATA=$(cat "$(dirname "$0")/ec2-user-data.sh" | base64)

# Step 5: Request spot instance
print_status "Requesting spot instance..."

LAUNCH_SPEC=$(cat << EOF
{
    "ImageId": "$AMI_ID",
    "InstanceType": "$INSTANCE_TYPE",
    "KeyName": "$KEY_NAME",
    "SecurityGroupIds": ["$SG_ID"],
    "BlockDeviceMappings": [
        {
            "DeviceName": "/dev/sda1",
            "Ebs": {
                "VolumeSize": 100,
                "VolumeType": "gp3",
                "DeleteOnTermination": true
            }
        }
    ],
    "UserData": "$USER_DATA"
}
EOF
)

echo "$LAUNCH_SPEC" > /tmp/launch-spec.json

SPOT_REQUEST_ID=$(aws ec2 request-spot-instances \
    --spot-price "$SPOT_PRICE" \
    --instance-count 1 \
    --type "one-time" \
    --launch-specification file:///tmp/launch-spec.json \
    --region "$REGION" \
    --query 'SpotInstanceRequests[0].SpotInstanceRequestId' \
    --output text)

print_status "Spot request ID: $SPOT_REQUEST_ID"

# Step 6: Wait for spot request to be fulfilled
print_status "Waiting for spot instance to launch..."
aws ec2 wait spot-instance-request-fulfilled \
    --spot-instance-request-ids "$SPOT_REQUEST_ID" \
    --region "$REGION"

# Get instance ID
INSTANCE_ID=$(aws ec2 describe-spot-instance-requests \
    --spot-instance-request-ids "$SPOT_REQUEST_ID" \
    --region "$REGION" \
    --query 'SpotInstanceRequests[0].InstanceId' \
    --output text)

print_status "Instance ID: $INSTANCE_ID"

# Wait for instance to be running
print_status "Waiting for instance to be running..."
aws ec2 wait instance-running \
    --instance-ids "$INSTANCE_ID" \
    --region "$REGION"

# Get public IP/DNS
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --region "$REGION" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

PUBLIC_DNS=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --region "$REGION" \
    --query 'Reservations[0].Instances[0].PublicDnsName' \
    --output text)

# Tag the instance
aws ec2 create-tags \
    --resources "$INSTANCE_ID" \
    --tags Key=Name,Value=MarketBrewer-GPU-Worker Key=Project,Value=MarketBrewer \
    --region "$REGION"

echo ""
echo "=========================================="
echo "  EC2 GPU Instance Launched!"
echo "=========================================="
echo ""
echo "Instance Details:"
echo "  Instance ID: $INSTANCE_ID"
echo "  Public IP: $PUBLIC_IP"
echo "  Public DNS: $PUBLIC_DNS"
echo "  Spot Request: $SPOT_REQUEST_ID"
echo ""
echo "Next Steps:"
echo ""
echo "1. Wait ~5-10 minutes for bootstrap to complete"
echo "   Check: ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'test -f ~/.bootstrap-complete && echo Ready'"
echo ""
echo "2. Deploy the project:"
echo "   ./scripts/deploy-ec2.sh $PUBLIC_IP $KEY_FILE"
echo ""
echo "3. Start generation:"
echo "   ssh -i $KEY_FILE ubuntu@$PUBLIC_IP"
echo "   cd /home/ubuntu/marketbrewer && ./start-generation.sh"
echo ""
echo "4. Monitor:"
echo "   ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'tail -f /home/ubuntu/worker.log'"
echo ""
echo "5. When complete, download results:"
echo "   ./scripts/download-results.sh $PUBLIC_IP $KEY_FILE"
echo ""
echo "6. IMPORTANT - Terminate when done:"
echo "   aws ec2 terminate-instances --instance-ids $INSTANCE_ID --region $REGION"
echo ""

# Save instance info
cat > /tmp/marketbrewer-ec2-instance.txt << EOF
INSTANCE_ID=$INSTANCE_ID
PUBLIC_IP=$PUBLIC_IP
PUBLIC_DNS=$PUBLIC_DNS
KEY_FILE=$KEY_FILE
SPOT_REQUEST_ID=$SPOT_REQUEST_ID
REGION=$REGION
EOF

print_status "Instance info saved to /tmp/marketbrewer-ec2-instance.txt"
