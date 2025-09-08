
import { ConnectClient, SearchUsersCommand } from "@aws-sdk/client-connect"; // ES Modules import
const client = new ConnectClient({ region: process.env.AWS_REGION });

export async function searchhierarchy(hierarchyGroupId, targetRole, instanceId) {
  let searchResponse;
  try {
    let searchFilter = {
      UserAttributeFilter: {
        AndCondition: {
          HierarchyGroupCondition: {
            Value: hierarchyGroupId,
            HierarchyGroupMatchType: 'WITH_CHILD_GROUPS'
          },
          TagConditions: [
            {
              TagKey: 'Role',
              TagValue: targetRole
            }
          ]
        }
      }
    };
    const input = new SearchUsersCommand({
      InstanceId: instanceId,
      SearchFilter: searchFilter
    })
    //console.log('input : ', JSON.stringify(input));

    searchResponse = await client.send(input);
    console.log('searchhierarchy searchResponse : ', JSON.stringify(searchResponse));

  } catch (error) {
    console.error('Error searchhierarchy SearchUsersCommand:', error);
  }
  return searchResponse;
}

export async function searchRole(targetRole, instanceId) {
  let searchResponse;
  try {
    let searchFilter = {
      UserAttributeFilter: {
        OrConditions: [
          {
            TagConditions: [
              {
                TagKey: 'Role',
                TagValue: targetRole
              }
            ]
          }
        ]
      }
    };

    const input = new SearchUsersCommand({
      InstanceId: instanceId,
      SearchFilter: searchFilter
    })
    //console.log('input : ', JSON.stringify(input));

    searchResponse = await client.send(input);
    console.log('searchRole searchResponse : ', JSON.stringify(searchResponse));

  } catch (error) {
    console.error('Error searchRole SearchUsersCommand:', error);
  }
  return searchResponse;
}