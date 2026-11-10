import { SendEmailCommand, type SESv2Client } from '@aws-sdk/client-sesv2';
import { type ContactMessage, validate } from './validate';

export interface Config {
  to: string;
  from: string;
  configurationSet: string;
}

/** The parts of a function URL event this function reads (payload format 2.0). */
export interface FunctionUrlEvent {
  body?: string;
  isBase64Encoded?: boolean;
  requestContext?: { http?: { method?: string } };
}

const TYPE_LABELS: Record<ContactMessage['type'], string> = {
  job: 'Full-time role',
  freelance: 'Freelance project',
  other: 'Other',
};

function respond(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function parse(event: FunctionUrlEvent): unknown {
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body ?? '', 'base64').toString('utf8')
      : (event.body ?? '');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function mail(message: ContactMessage, config: Config): SendEmailCommand {
  const text = [
    `Name: ${message.name}`,
    `Email: ${message.email}`,
    `About: ${TYPE_LABELS[message.type]}`,
    `Language: ${message.language}`,
    '',
    message.message,
  ].join('\n');

  return new SendEmailCommand({
    FromEmailAddress: config.from,
    Destination: { ToAddresses: [config.to] },
    // Replying goes to the sender. Nothing is ever sent to them automatically, so this form
    // cannot be used to send mail to someone else's address.
    ReplyToAddresses: [message.email],
    ConfigurationSetName: config.configurationSet,
    Content: {
      Simple: {
        Subject: { Data: `Contact form: ${TYPE_LABELS[message.type]}, ${message.name}` },
        Body: { Text: { Data: text, Charset: 'UTF-8' } },
      },
    },
  });
}

export function createHandler(client: Pick<SESv2Client, 'send'>, config: Config) {
  return async (event: FunctionUrlEvent) => {
    if (event.requestContext?.http?.method !== 'POST') {
      return respond(405, { error: 'method' });
    }

    const message = validate(parse(event));
    if (!message) {
      console.log(JSON.stringify({ outcome: 'invalid', marker: 'rollback-test' }));
      return respond(400, { error: 'invalid' });
    }

    try {
      const { MessageId } = await client.send(mail(message, config));
      // Never the name, address or message: they stay out of the logs on purpose.
      console.log(
        JSON.stringify({
          outcome: 'sent',
          type: message.type,
          language: message.language,
          messageId: MessageId,
        }),
      );
      return respond(200, { ok: true });
    } catch (error) {
      const name = error instanceof Error ? error.name : 'UnknownError';
      console.error(JSON.stringify({ outcome: 'failed', error: name }));
      return respond(502, { error: 'send_failed' });
    }
  };
}
