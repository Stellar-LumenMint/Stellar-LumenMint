// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  timestamp: string;
  path: string;
  errors?: Record<string, string[]>;
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
      message:
        status >= 500 ? 'Internal server error' : 'Request failed',
      timestamp: new Date().toISOString(),
      path: request.url,
    };

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
      } else if (typeof responseObj.message === 'string') {
        errorResponse.message = responseObj.message;
      }
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      const responseObj = exceptionResponse as { message?: string };
      errorResponse.message =
        responseObj.message ||
        (status >= 500 ? 'Internal server error' : exception.message);
    } else {
      errorResponse.message =
        status >= 500 ? 'Internal server error' : exception.message;
    }

    const logContext = {
      method: request.method,
      url: request.url,
      statusCode: status,
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
