import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  UseGuards,
  Req,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import type { Request as ExpressRequest } from 'express';

interface RequestWithUser extends ExpressRequest {
  user?: {
    userId: string;
    id?: string;
    [key: string]: unknown;
  };
}

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.create(createOrderDto);
  }

  @Get()
  async findAll(@Query() query: OrderQueryDto) {
    return this.orderService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.orderService.updateStatus(id, status);
  }

  // The buyer is taken from the authenticated session rather than the body. A
  // caller-supplied `buyerId` used to be forwarded straight to the contract
  // call, so an unauthenticated request could settle a bundle on behalf of any
  // address.
  @UseGuards(JwtAuthGuard)
  @Post(':id/execute')
  async executeBundle(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body('amount') amount?: string,
  ) {
    return this.orderService.executeBundle(
      id,
      req.user?.userId as string,
      amount,
    );
  }

  // As above: the seller who may cancel a bundle is the authenticated caller.
  @UseGuards(JwtAuthGuard)
  @Post(':id/cancel')
  async cancelBundle(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.orderService.cancelBundle(id, req.user?.userId as string);
  }

  @Get(':id/stats')
  async getStats(@Param('id') nftId: string) {
    return this.orderService.getStats(nftId);
  }
}
