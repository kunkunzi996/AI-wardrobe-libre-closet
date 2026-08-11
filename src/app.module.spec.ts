import 'reflect-metadata';

import pino from 'pino';
import { Params } from 'nestjs-pino';
import { AppModule } from './app.module';

const AUTHORIZATION_SENTINEL = 'Bearer synthetic-log-redaction-token';
const COOKIE_SENTINEL = 'session=synthetic-cookie';
const PROXY_AUTHORIZATION_SENTINEL = 'Basic synthetic-proxy-credentials';
const SET_COOKIE_SENTINEL = 'session=synthetic-set-cookie';

function configuredPinoHttpOptions(): Record<string, unknown> {
  const imports = Reflect.getMetadata('imports', AppModule) as unknown[];
  const loggerModule = imports.find(
    (entry): entry is { providers: Array<Record<string, unknown>> } =>
      !!entry &&
      typeof entry === 'object' &&
      Array.isArray((entry as { providers?: unknown }).providers) &&
      (entry as { providers: Array<Record<string, unknown>> }).providers.some(
        (provider) => provider.provide === 'pino-params',
      ),
  );

  if (!loggerModule) {
    throw new Error('LoggerModule configuration was not found');
  }

  const paramsProvider = loggerModule.providers.find(
    (provider) => provider.provide === 'pino-params',
  );
  if (typeof paramsProvider?.useFactory !== 'function') {
    throw new Error('LoggerModule factory was not found');
  }

  const params = paramsProvider.useFactory({
    getOrThrow: () => 'synthetic-data-path',
  }) as Params;

  if (!params.pinoHttp || Array.isArray(params.pinoHttp)) {
    throw new Error('Pino HTTP options were not found');
  }

  return params.pinoHttp as Record<string, unknown>;
}

function captureRequestLog(redact: unknown): string {
  let output = '';
  const destination = {
    write(chunk: string | Uint8Array): boolean {
      output += Buffer.from(chunk).toString();
      return true;
    },
  };
  const logger = pino(
    {
      serializers: { req: pino.stdSerializers.req },
      ...(redact ? { redact } : {}),
    },
    destination,
  );

  const req = pino.stdSerializers.req({
    id: 'synthetic-request-id',
    method: 'GET',
    url: '/synthetic-log-redaction',
    headers: {
      authorization: AUTHORIZATION_SENTINEL,
      cookie: COOKIE_SENTINEL,
      'proxy-authorization': PROXY_AUTHORIZATION_SENTINEL,
      'set-cookie': [SET_COOKIE_SENTINEL],
      host: 'synthetic.example.test',
      'user-agent': 'synthetic-log-redaction-test',
    },
    socket: { remoteAddress: '127.0.0.1', remotePort: 12345 },
  });

  logger.info({ req }, 'synthetic request');
  return output;
}

describe('HTTP request log redaction', () => {
  it('keeps sensitive request headers out of logs while retaining safe context', () => {
    const pinoHttpOptions = configuredPinoHttpOptions();
    const redact = pinoHttpOptions.redact as {
      paths?: unknown;
      censor?: unknown;
    };

    expect(redact).toEqual({
      paths: expect.arrayContaining([
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["proxy-authorization"]',
        'req.headers["set-cookie"]',
      ]),
      censor: '[Redacted]',
    });

    const unredactedOutput = captureRequestLog(undefined);
    expect(unredactedOutput).toContain(AUTHORIZATION_SENTINEL);

    const redactedOutput = captureRequestLog(redact);
    for (const sentinel of [
      AUTHORIZATION_SENTINEL,
      COOKIE_SENTINEL,
      PROXY_AUTHORIZATION_SENTINEL,
      SET_COOKIE_SENTINEL,
    ]) {
      expect(redactedOutput).not.toContain(sentinel);
    }
    expect(redactedOutput).toContain('[Redacted]');
    expect(redactedOutput).toContain('synthetic.example.test');
    expect(redactedOutput).toContain('synthetic-log-redaction-test');
  });
});
