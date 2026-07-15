import { ValidationPipe as NestValidationPipe, ValidationPipeOptions } from '@nestjs/common';

/**
 * Global validation pipe configuration.
 *
 * Automatically validates incoming request bodies against DTO classes decorated
 * with class-validator decorators (@IsString, @IsNumber, etc.).
 *
 * Features:
 * - Strips unknown properties (whitelist: true)
 * - Transforms input types (e.g., string "123" → number 123)
 * - Throws 400 Bad Request with validation error details
 */
export const validationPipeOptions: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
};

export const GlobalValidationPipe = new NestValidationPipe(validationPipeOptions);
