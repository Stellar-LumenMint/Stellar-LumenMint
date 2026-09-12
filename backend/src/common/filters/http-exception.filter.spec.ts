import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { AppErrorCode } from '../enums/app-error-code.enum';
import { withErrorCode } from '../errors/error-code.resolver';

interface CapturedResponse {
  statusCode: number;
  code: string;
  message: string | string[];
  path: string;
  errors?: Record<string, string[]>;
  stellar?: Record<string, unknown>;
}

function makeFilter() {
  const logger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  };

  const filter = new HttpExceptionFilter(logger as never);

  const run = (
    exception: HttpException,
    url = '/api/v1/nfts',
  ): CapturedResponse => {
    let captured: CapturedResponse | undefined;

    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn((body: CapturedResponse) => {
        captured = body;
      }),
    };

    const host = {
      switchToHttp: () => ({
        getRequest: () => ({ url, method: 'GET', query: {}, params: {} }),
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(exception.getStatus());
    expect(captured).toBeDefined();
    return captured as CapturedResponse;
  };

  return { filter, run, logger };
}

describe('HttpExceptionFilter', () => {
  it('reports VALIDATION_ERROR for class-validator failures, with field errors', () => {
    const { run } = makeFilter();

    const body = run(
      new BadRequestException({
        message: [
          'name should not be empty',
          'price must be a positive number',
        ],
      }),
    );

    expect(body.code).toBe(AppErrorCode.VALIDATION_ERROR);
    expect(body.message).toBe('Validation failed');
    expect(body.errors).toEqual({
      name: ['name should not be empty'],
      price: ['price must be a positive number'],
    });
  });

  it('derives a code from the status when the throw site supplies none', () => {
    const { run } = makeFilter();

    expect(run(new NotFoundException()).code).toBe(AppErrorCode.NOT_FOUND);
    expect(run(new HttpException('nope', HttpStatus.CONFLICT)).code).toBe(
      AppErrorCode.CONFLICT,
    );
  });

  it('prefers the code the throw site attached', () => {
    const { run } = makeFilter();

    const body = run(
      new BadRequestException(
        withErrorCode(AppErrorCode.WALLET_SIGNATURE_INVALID, 'Bad signature'),
      ),
    );

    expect(body.code).toBe(AppErrorCode.WALLET_SIGNATURE_INVALID);
    expect(body.message).toBe('Bad signature');
  });

  it('preserves the StellarErrorInterceptor code and context instead of discarding them', () => {
    const { run } = makeFilter();

    // The exact shape StellarErrorInterceptor throws. Before this was handled,
    // the filter rebuilt the body from the top level only, so `error.code` and
    // the whole `stellar` block were dropped and the client got a bare 502.
    const body = run(
      new HttpException(
        {
          ok: false,
          error: {
            code: AppErrorCode.SOROBAN_RPC_ERROR,
            message: 'RPC unavailable',
            stellar: {
              transactionHash: 'abc123',
              contractId:
                'CDQN2A5U6SQLL4NZAMV4SL6BAOK6EXDG4G6HHRDJOOH6XK4LPUPZLHJC',
              network: 'testnet',
            },
          },
          timestamp: new Date().toISOString(),
        },
        HttpStatus.BAD_GATEWAY,
      ),
    );

    expect(body.code).toBe(AppErrorCode.SOROBAN_RPC_ERROR);
    expect(body.stellar).toEqual({
      transactionHash: 'abc123',
      contractId: 'CDQN2A5U6SQLL4NZAMV4SL6BAOK6EXDG4G6HHRDJOOH6XK4LPUPZLHJC',
      network: 'testnet',
    });
  });

  it('does not echo internals for 5xx responses', () => {
    const { run, logger } = makeFilter();

    const body = run(
      new HttpException(
        'connect ECONNREFUSED 10.0.0.5:5432',
        HttpStatus.INTERNAL_SERVER_ERROR,
      ),
    );

    expect(body.message).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toContain('10.0.0.5');
    // The detail is not lost — it is recorded server-side.
    expect(logger.error).toHaveBeenCalled();
  });
});
