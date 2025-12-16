#!/usr/bin/env node

/**
 * Launch an EC2 Spot Instance for SEO content generation
 * 
 * Usage: npm run launch
 * 
 * Cost estimates (us-east-1):
 * - g4dn.xlarge spot: ~$0.15-0.20/hr
 * - 3000 pages in ~8 hours = ~$1.20-1.60
 */

require('dotenv').config();

const { EC2Client, RunInstancesCommand, DescribeInstancesCommand, CreateTagsCommand } = require('@aws-sdk/client-ec2');
const fs = require('fs');
const path = require('path');

const config = {
  region: process.env.AWS_REGION || 'us-east-1',
  instanceType: process.env.EC2_INSTANCE_TYPE || 'g4dn.xlarge',
  amiId: process.env.EC2_AMI_ID || 'ami-0c7217cdde317cfec', // Ubuntu 22.04
  keyName: process.env.EC2_KEY_NAME,
  securityGroupId: process.env.EC2_SECURITY_GROUP_ID,
  subnetId: process.env.EC2_SUBNET_ID,
  spotMaxPrice: process.env.SPOT_MAX_PRICE || '0.30',
  apiUrl: process.env.API_URL,
  apiToken: process.env.API_TOKEN,
  ollamaModel: process.env.OLLAMA_MODEL || 'dolphin3:latest',
  autoShutdownMinutes: process.env.AUTO_SHUTDOWN_MINUTES || '15',
};

// Validate required config
const required = ['keyName', 'securityGroupId', 'apiUrl', 'apiToken'];
for (const key of required) {
  if (!config[key]) {
    console.error(`ERROR: Missing required config: ${key}`);
    console.error('Please set it in .env file');
    process.exit(1);
  }
}

// Read user data script
const userDataTemplate = fs.readFileSync(
  path.join(__dirname, '../userdata/worker-setup.sh'),
  'utf-8'
);

// Replace variables in user data
const userData = userDataTemplate
  .replace(/\{\{API_URL\}\}/g, config.apiUrl)
  .replace(/\{\{API_TOKEN\}\}/g, config.apiToken)
  .replace(/\{\{OLLAMA_MODEL\}\}/g, config.ollamaModel)
  .replace(/\{\{AUTO_SHUTDOWN_MINUTES\}\}/g, config.autoShutdownMinutes);

const userDataBase64 = Buffer.from(userData).toString('base64');

async function launchSpotInstance() {
  const ec2 = new EC2Client({ region: config.region });

  console.log('=== MarketBrewer EC2 Spot Launcher ===');
  console.log(`Instance Type: ${config.instanceType}`);
  console.log(`Max Spot Price: $${config.spotMaxPrice}/hr`);
  console.log(`Region: ${config.region}`);
  console.log(`API URL: ${config.apiUrl}`);
  console.log(`Ollama Model: ${config.ollamaModel}`);
  console.log('');

  try {
    console.log('Launching spot instance...');

    const command = new RunInstancesCommand({
      ImageId: config.amiId,
      InstanceType: config.instanceType,
      KeyName: config.keyName,
      SecurityGroupIds: [config.securityGroupId],
      SubnetId: config.subnetId,
      MinCount: 1,
      MaxCount: 1,
      UserData: userDataBase64,
      InstanceMarketOptions: {
        MarketType: 'spot',
        SpotOptions: {
          MaxPrice: config.spotMaxPrice,
          SpotInstanceType: 'one-time',
          InstanceInterruptionBehavior: 'terminate',
        },
      },
      BlockDeviceMappings: [
        {
          DeviceName: '/dev/sda1',
          Ebs: {
            VolumeSize: 100, // 100GB for model storage
            VolumeType: 'gp3',
            DeleteOnTermination: true,
          },
        },
      ],
      TagSpecifications: [
        {
          ResourceType: 'instance',
          Tags: [
            { Key: 'Name', Value: 'marketbrewer-seo-worker' },
            { Key: 'Project', Value: 'marketbrewer-seo-platform' },
            { Key: 'Environment', Value: 'production' },
          ],
        },
      ],
    });

    const response = await ec2.send(command);
    const instanceId = response.Instances[0].InstanceId;

    console.log(`✓ Instance launched: ${instanceId}`);
    console.log('');
    console.log('Waiting for instance to be running...');

    // Wait for instance to be running
    let publicIp = null;
    for (let i = 0; i < 30; i++) {
      await sleep(10000); // Wait 10 seconds

      const describeCommand = new DescribeInstancesCommand({
        InstanceIds: [instanceId],
      });
      const describeResponse = await ec2.send(describeCommand);
      const instance = describeResponse.Reservations[0].Instances[0];

      if (instance.State.Name === 'running' && instance.PublicIpAddress) {
        publicIp = instance.PublicIpAddress;
        break;
      }

      process.stdout.write('.');
    }

    console.log('');

    if (publicIp) {
      console.log('✓ Instance is running!');
      console.log('');
      console.log('=== Connection Details ===');
      console.log(`Instance ID: ${instanceId}`);
      console.log(`Public IP: ${publicIp}`);
      console.log(`SSH: ssh -i ${config.keyName}.pem ubuntu@${publicIp}`);
      console.log('');
      console.log('=== Setup Progress ===');
      console.log('The instance is now installing:');
      console.log('  1. NVIDIA drivers');
      console.log('  2. Ollama');
      console.log(`  3. Pulling model: ${config.ollamaModel}`);
      console.log('  4. Starting worker');
      console.log('');
      console.log('This takes ~5-10 minutes. Check progress with:');
      console.log(`  ssh -i ${config.keyName}.pem ubuntu@${publicIp} "tail -f /var/log/cloud-init-output.log"`);
      console.log('');
      console.log(`Auto-shutdown: ${config.autoShutdownMinutes} minutes after job completion`);

      // Save instance info
      const instanceInfo = {
        instanceId,
        publicIp,
        launchedAt: new Date().toISOString(),
        instanceType: config.instanceType,
        spotMaxPrice: config.spotMaxPrice,
      };
      fs.writeFileSync(
        path.join(__dirname, '../.current-instance.json'),
        JSON.stringify(instanceInfo, null, 2)
      );
    } else {
      console.log('⚠ Instance launched but no public IP yet.');
      console.log(`Instance ID: ${instanceId}`);
      console.log('Run "npm run status" to check status.');
    }

  } catch (error) {
    console.error('Failed to launch instance:', error.message);
    process.exit(1);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

launchSpotInstance();
