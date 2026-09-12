import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, throwError, type Observable } from 'rxjs';
import { getStellarConfig } from '../config/stellar.config';
import { AppErrorCode } from '../common/enums/app-error-code.enum';
import { SorobanRpcService } from '../services/soroban-rpc.service';
import {
  asHttpRequest,
  inferStellarContext,
} from './stellar.interceptor.utils';

type ErrorMapping = {
  status: HttpStatus;
  code: AppErrorCode;
};

// Codes come from the shared enum rather than being spelled out here, so the
// set of codes a client can receive is enumerable from one file. The string
// values are unchanged, so nothing on the wire moved.
const ERROR_MAP: Record<string, ErrorMapping> = {
  SorobanRpcError: {
    status: HttpStatus.BAD_GATEWAY,
    code: AppErrorCode.SOROBAN_RPC_ERROR,
  },
  TransactionFailedError: {
    status: HttpStatus.BAD_REQUEST,
    code: AppErrorCode.STELLAR_TRANSACTION_FAILED,
  },
  InsufficientBalanceError: {
    status: HttpStatus.PAYMENT_REQUIRED,
    code: AppErrorCode.INSUFFICIENT_BALANCE,
  },
  InvalidSignatureError: {
    status: HttpStatus.UNAUTHORIZED,
    code: AppErrorCode.INVALID_SIGNATURE,
  },
  ContractError: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    code: AppErrorCode.SOROBAN_CONTRACT_ERROR,
  },
};

@Injectable()
export class StellarErrorInterceptor implements NestInterceptor {
  constructor(private readonly sorobanRpcService: SorobanRpcService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = asHttpRequest(context.switchToHttp().getRequest<unknown>());
    if (!req) {
      return next.handle();
    }

    const requestContext = inferStellarContext(req);

    return next.handle().pipe(
      catchError((error: unknown) => {
        if (!requestContext.isStellarRequest) {
          return throwError(() => error);
        }

        const config = getStellarConfig(process.env);
        const err = error as Error & {
          status?: number;
          code?: string;
          txHash?: string;
          contractId?: string;
          details?: unknown;
        };

        const mapped = this.resolveMapping(err);
        const networkContext = this.sorobanRpcService.getNetworkContext();
        const message = config.obfuscateSensitiveErrors
          ? this.sanitize(err.message)
          : err.message;

        return throwError(
          () =>
            new HttpException(
              {
                ok: false,
                error: {
                  code: mapped.code,
                  message,
                  details: config.obfuscateSensitiveErrors
                    ? undefined
                    : err.details || null,
                  stellar: {
                    transactionHash:
                      err.txHash || requestContext.txHash || null,
                    contractId:
                      err.contractId || requestContext.contractId || null,
                    network: networkContext.network,
                    sorobanRpcUrl: networkContext.sorobanRpcUrl,
                    networkPassphrase: networkContext.networkPassphrase,
                  },
                },
                timestamp: new Date().toISOString(),
              },
              mapped.status,
            ),
        );
      }),
    );
  }

  private resolveMapping(error: Error & { status?: number; code?: string }) {
    if (error.name && ERROR_MAP[error.name]) {
      return ERROR_MAP[error.name];
    }

    const text = `${error.name || ''} ${error.message || ''}`.toLowerCase();

    if (text.includes('insufficient balance')) {
      return ERROR_MAP.InsufficientBalanceError;
    }

    if (text.includes('invalid signature')) {
      return ERROR_MAP.InvalidSignatureError;
    }

    if (text.includes('contract') && text.includes('revert')) {
      return ERROR_MAP.ContractError;
    }

    if (text.includes('rpc') || text.includes('network')) {
      return ERROR_MAP.SorobanRpcError;
    }

    // An error that already carries a member of the enum keeps it; anything
    // else — including a free-text code a driver happened to set — becomes the
    // catch-all, so the set of codes a client can observe stays closed.
    const explicit =
      typeof error.code === 'string'
        ? AppErrorCode[error.code as keyof typeof AppErrorCode]
        : undefined;

    return {
      status:
        typeof error.status === 'number'
          ? error.status
          : HttpStatus.INTERNAL_SERVER_ERROR,
      code: explicit ?? AppErrorCode.STELLAR_UNKNOWN_ERROR,
    };
  }

  private sanitize(value: string | undefined) {
    if (!value) {
      return 'A Stellar transaction error occurred';
    }

    return value
      .replace(/S[A-Z2-7]{55}/g, '[REDACTED_STELLAR_SEED]')
      .replace(/secret[^\s]*/gi, '[REDACTED_SECRET]')
      .replace(/private\s*key[^\s]*/gi, '[REDACTED_PRIVATE_KEY]');
  }
}
