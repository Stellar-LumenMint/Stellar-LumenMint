// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AppErrorCode } from '../enums/app-error-code.enum';
import { errorCodeFrom, resolveErrorCode } from '../errors/error-code.resolver';

interface ErrorResponse {
  statusCode: number;
  /**
   * Machine-readable failure code. Stable across releases, unlike the message,
   * so clients can branch on it instead of matching English prose.
   */
  code: AppErrorCode;
  message: string | string[];
  timestamp: string;
  path: string;
  errors?: Record<string, string[]>;
  /**
   * Stellar-specific context — transaction hash, contract id and network — for
   * failures raised through `StellarErrorInterceptor`. These are public
   * identifiers (never keys), and without them a client that gets a contract
   * rejection has nothing to look up.
   */
  stellar?: Record<string, unknown>;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(HttpExceptionFilter.name)
    private readonly logger: PinoLogger,
  ) {}
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Stable, locale-neutral messages. Never echo internal exception details
    // for 5xx responses — they can leak stack traces or host paths to clients.
    // The full error is still recorded in the server logs below.
    const errorResponse: ErrorResponse = {
      statusCode: status,
      code: AppErrorCode.INTERNAL_SERVER_ERROR,
      message: status >= 500 ? 'Internal server error' : 'Request failed',
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    let hasValidationErrors = false;

    // Special handling for class-validator errors (BadRequestException)
    if (
      status === 400 &&
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      const responseObj = exceptionResponse as { message?: string | string[] };
      if (responseObj.message && Array.isArray(responseObj.message)) {
        errorResponse.message = 'Validation failed';
        errorResponse.errors = this.formatValidationErrors(responseObj.message);
        hasValidationErrors = true;
      } else if (typeof responseObj.message === 'string') {
        errorResponse.message = responseObj.message;
      }
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      // Two payload shapes reach here: a flat `{ message }` from a throw site,
      // and the `{ error: { code, message, stellar } }` that
      // StellarErrorInterceptor builds. The nested shape has to be unwrapped
      // explicitly — reading only the top level discarded the interceptor's
      // entire payload, leaving clients with a status and nothing else.
      const responseObj = exceptionResponse as {
        message?: string;
        stellar?: unknown;
        error?: { message?: string; stellar?: unknown };
      };

      const nestedError = responseObj.error;

      errorResponse.message =
        responseObj.message ||
        nestedError?.message ||
        (status >= 500 ? 'Internal server error' : exception.message);

      const stellar = nestedError?.stellar ?? responseObj.stellar;
      if (typeof stellar === 'object' && stellar !== null) {
        errorResponse.stellar = stellar as Record<string, unknown>;
      }
    } else {
      errorResponse.message =
        status >= 500 ? 'Internal server error' : exception.message;
    }

    // A code attached by the throw site wins; otherwise the status decides.
    // Validation failures are distinguished from plain 400s because clients
    // act on that difference: one is fixable by resubmitting, the other is not.
    errorResponse.code =
      errorCodeFrom(exceptionResponse) ??
      resolveErrorCode(status, { hasValidationErrors });

    const logContext = {
      method: request.method,
      url: request.url,
      statusCode: status,
      code: errorResponse.code,
      query: request.query,
      params: request.params,
    };

    if (status >= 500) {
      this.logger.error(
        {
          ...logContext,
          err: exception,
        },
        'HTTP 5xx Exception',
      );
    } else if (status >= 400) {
      this.logger.warn(logContext, 'HTTP 4xx Exception');
    } else {
      this.logger.info(logContext, 'HTTP Exception');
    }

    response.status(status).json(errorResponse);
  }

  private formatValidationErrors(messages: string[]): Record<string, string[]> {
    const errors: Record<string, string[]> = {};

    messages.forEach((message) => {
      // Extraer el nombre del campo del mensaje de validación
      const fieldMatch = message.match(/^(\w+)\s/);
      const field = fieldMatch ? fieldMatch[1] : 'general';

      if (!errors[field]) {
        errors[field] = [];
      }
      errors[field].push(message);
    });

    return errors;
  }
}
