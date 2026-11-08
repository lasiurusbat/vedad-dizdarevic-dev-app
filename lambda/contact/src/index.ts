import { SESv2Client } from '@aws-sdk/client-sesv2';
import { createHandler } from './handler';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

// Outside the handler so warm invocations reuse it. The region comes from AWS_REGION, which
// Lambda sets. One retry at most: the form's timeout is short, and a retry can repeat a mail.
export const handler = createHandler(new SESv2Client({ maxAttempts: 2 }), {
  to: required('CONTACT_TO_ADDRESS'),
  from: required('CONTACT_FROM_ADDRESS'),
  configurationSet: required('SES_CONFIGURATION_SET'),
});
