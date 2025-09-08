import { ConnectClient, CreateEvaluationFormCommand } from "@aws-sdk/client-connect";
import { send } from "./cfn-response/cfn-response.mjs";

const client = new ConnectClient();

export const handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event));
  
  try {
    if (event.RequestType === 'Create') {
      const instanceId = event.ResourceProperties.InstanceId;
      const questionText = event.ResourceProperties.QuestionText || "Which role should be notified?";
      
      const params = {
        InstanceId: instanceId,
        Title: "Evaluation Notification Form",
        Description: "Evaluation notification form",
        Items: [{
          Section: {
            Title: "Notification Questions",
            RefId: "section-1",
            Items: [{
              Question: {
                Title: questionText,
                RefId: "role-question",
                QuestionType: "SINGLESELECT",
                QuestionTypeProperties: {
                  SingleSelect: {
                    Options: [
                      { RefId: "supervisor", Text: "Supervisor", Score: 1 },
                      { RefId: "manager", Text: "Manager", Score: 1 }
                    ]
                  }
                }
              }
            }]
          }
        }]
      };

      const result = await client.send(new CreateEvaluationFormCommand(params));
      
      await send(event, context, 'SUCCESS', {
        EvaluationFormId: result.EvaluationFormId,
        EvaluationFormArn: result.EvaluationFormArn
      });

    } else {
      await send(event, context, 'SUCCESS', {});
    }

  } catch (error) {
    console.error('Error:', error);
    await send(event, context, 'FAILED', {}, error.message);
  }
};