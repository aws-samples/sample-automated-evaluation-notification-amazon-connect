
import { ConnectClient, DescribeUserCommand } from "@aws-sdk/client-connect"; // ES Modules import
const client = new ConnectClient({ region: process.env.AWS_REGION });

export async function getUser(instanceId, agentId) {
  let instanceDetails;
  try {
    const describeUserCommand = new DescribeUserCommand({
      InstanceId: instanceId,
      UserId: agentId
    });
    instanceDetails = await client.send(describeUserCommand);
  } catch (error) {
    console.error('Error DescribeUserCommand:', error);
  }
  return instanceDetails

}