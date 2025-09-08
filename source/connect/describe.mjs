
import { ConnectClient, DescribeInstanceCommand } from "@aws-sdk/client-connect"; // ES Modules import
const client = new ConnectClient({ region: process.env.AWS_REGION });

export async function getAlias(instanceId) {
  try {
    const describeInstanceCommand = new DescribeInstanceCommand({
      InstanceId: instanceId
    });
    const instanceDetails = await client.send(describeInstanceCommand);
    return instanceDetails.Instance.InstanceAlias;
  } catch (error) {
    console.error('Error getting instance alias:', error);
  }
}