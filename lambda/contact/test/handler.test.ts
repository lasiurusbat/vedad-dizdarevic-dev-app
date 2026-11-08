import { SendEmailCommand } from '@aws-sdk/client-sesv2';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHandler, type FunctionUrlEvent } from '../src/handler';

const config = {
  to: 'owner@example.com',
  from: 'form@example.com',
  configurationSet: 'test-set',
};
const secretMessage = 'A confidential message about a role.';
const body = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  type: 'freelance',
  language: 'de',
  message: secretMessage,
};

function post(payload: unknown, base64 = false): FunctionUrlEvent {
  const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return {
    body: base64 ? Buffer.from(raw).toString('base64') : raw,
    isBase64Encoded: base64,
    requestContext: { http: { method: 'POST' } },
  };
}

describe('contact handler', () => {
  const send = vi.fn();
  const handler = createHandler({ send }, config);
  let log: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({ MessageId: 'm-1' });
    log = vi.spyOn(console, 'log').mockImplementation(() => {});
    error = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends one plain-text mail with Reply-To set to the sender', async () => {
    const response = await handler(post(body));
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ ok: true });
    expect(send).toHaveBeenCalledTimes(1);

    const command = send.mock.calls[0]![0] as SendEmailCommand;
    expect(command).toBeInstanceOf(SendEmailCommand);
    const input = command.input;
    expect(input.FromEmailAddress).toBe(config.from);
    expect(input.Destination?.ToAddresses).toEqual([config.to]);
    expect(input.Destination?.CcAddresses).toBeUndefined();
    expect(input.Destination?.BccAddresses).toBeUndefined();
    expect(input.ReplyToAddresses).toEqual([body.email]);
    expect(input.ConfigurationSetName).toBe(config.configurationSet);
    const simple = input.Content?.Simple;
    expect(simple?.Subject?.Data).toBe('Contact form: Freelance project, Ada Lovelace');
    expect(simple?.Body?.Text?.Data).toContain(secretMessage);
    expect(simple?.Body?.Html).toBeUndefined();
  });

  it('reads a base64 body', async () => {
    expect((await handler(post(body, true))).statusCode).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('rejects other methods without sending', async () => {
    const response = await handler({ ...post(body), requestContext: { http: { method: 'GET' } } });
    expect(response.statusCode).toBe(405);
    expect(send).not.toHaveBeenCalled();
  });

  it.each([
    ['broken JSON', '{nope'],
    ['an empty body', ''],
    ['invalid fields', { ...body, email: 'nope' }],
  ])('answers 400 to %s without sending', async (_label, payload) => {
    const response = await handler(post(payload));
    expect(response.statusCode).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it('answers 502 when SES fails, naming only the error type', async () => {
    send.mockRejectedValue(
      Object.assign(new Error(`failed for ${body.email}`), { name: 'Throttled' }),
    );
    const response = await handler(post(body));
    expect(response.statusCode).toBe(502);
    expect(response.body).not.toContain(body.email);
    const logged = JSON.stringify(error.mock.calls);
    expect(logged).toContain('Throttled');
    expect(logged).not.toContain(body.email);
  });

  it('keeps personal data out of the logs', async () => {
    await handler(post(body));
    await handler(post({ ...body, email: 'nope' }));
    const logged = JSON.stringify([...log.mock.calls, ...error.mock.calls]);
    expect(logged).toContain('sent');
    for (const secret of [secretMessage, body.name, body.email, 'nope']) {
      expect(logged).not.toContain(secret);
    }
  });
});
