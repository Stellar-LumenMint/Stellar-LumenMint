// ── Payment Controller ───────────────────────────────────────────────────────

import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  HttpStatus,
  HttpCode,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { PaymentService, PaymentIntent } from './payment.service';
import { SUPPORTED_PAYMENT_METHODS } from './enums/payment-method.enum';
import { CreatePaymentIntentDto, ProcessPayoutDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('Payments')
@Controller('api/payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('intent')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a payment intent' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 201,
    description: 'Payment intent created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body (amount must be positive)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — valid JWT required',
  })
  @HttpCode(HttpStatus.CREATED)
  async createIntent(
    @Body() body: CreatePaymentIntentDto,
  ): Promise<PaymentIntent> {
    if (body.amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }
    return this.paymentService.createPaymentIntent(
      body.amount,
      body.currency ?? 'USD',
      {
        nftId: body.nftId,
      },
    );
  }

  // Moving funds out of the platform wallet is an administrative action, so it
  // requires both a valid session and the admin role. The endpoint previously
  // advertised `@ApiBearerAuth()` while enforcing nothing, which left an
  // unauthenticated route that paid out to any Stellar address supplied in the
  // body.
  @Post('payout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Process a payout to a Stellar address' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Payout processed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid Stellar address or malformed request',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — valid JWT required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — the caller is not an admin',
  })
  async processPayout(
    @Body() body: ProcessPayoutDto,
  ): Promise<{ success: boolean; txHash?: string }> {
    if (!this.paymentService.isValidStellarAddress(body.recipientAddress)) {
      // A bad address is a client error, not a server fault: throwing a bare
      // `Error` surfaced as a 500.
      throw new BadRequestException('Invalid Stellar address');
    }
    return this.paymentService.processPayout(body);
  }

  @Get('methods')
  @ApiOperation({ summary: 'List supported payment methods' })
  @ApiResponse({
    status: 200,
    description: 'Supported payment methods returned',
  })
  getSupportedMethods(): { methods: readonly string[] } {
    return { methods: SUPPORTED_PAYMENT_METHODS };
  }

  @Get('validate/:address')
  @ApiOperation({ summary: 'Validate a Stellar address format' })
  @ApiParam({
    name: 'address',
    description: 'Stellar public key (starts with G)',
    example: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMKJS',
  })
  @ApiResponse({ status: 200, description: 'Validation result returned' })
  validateAddress(@Param('address') address: string): { valid: boolean } {
    return { valid: this.paymentService.isValidStellarAddress(address) };
  }
}
