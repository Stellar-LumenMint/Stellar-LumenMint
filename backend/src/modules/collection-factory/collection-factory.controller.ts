import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CollectionFactoryService } from './collection-factory.service';
import { CreateFactoryCollectionDto } from './dto/create-factory-collection.dto';
import { MintTokenDto } from './dto/mint-token.dto';
import { BatchMintDto } from './dto/batch-mint.dto';
import { TransferTokenDto } from './dto/transfer-token.dto';
import { SetRoyaltyDto } from './dto/set-royalty.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

// Every route that mints, moves or reconfigures a token deploys and signs with
// the platform key, so it is a privileged operation and requires a session.
// The read-only routes stay public. Previously the whole controller was open:
// an anonymous request could mint to any address, transfer anybody's token and
// set royalties through the platform's signer.
@Controller('collections')
export class CollectionFactoryController {
  constructor(
    private readonly collectionFactoryService: CollectionFactoryService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('factory/create')
  async createCollection(@Body() body: CreateFactoryCollectionDto) {
    return this.collectionFactoryService.createCollection(body);
  }

  @Get('factory/count')
  async getCollectionCount() {
    return this.collectionFactoryService.getCollectionCount();
  }

  @Get('factory/:id/address')
  async getCollectionAddress(@Param('id', ParseIntPipe) id: number) {
    return this.collectionFactoryService.getCollectionAddress(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':address/mint')
  async mintToken(
    @Param('address') address: string,
    @Body() body: MintTokenDto,
  ) {
    return this.collectionFactoryService.mintToken(
      address,
      body.to,
      body.metadataUri,
      body.attributes,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':address/batch-mint')
  async batchMint(
    @Param('address') address: string,
    @Body() body: BatchMintDto,
  ) {
    return this.collectionFactoryService.batchMint(
      address,
      body.recipients,
      body.uris,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':address/transfer')
  async transferToken(
    @Param('address') address: string,
    @Body() body: TransferTokenDto,
  ) {
    return this.collectionFactoryService.transferToken(
      address,
      body.from,
      body.to,
      body.tokenId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':address/royalty')
  async setRoyalty(
    @Param('address') address: string,
    @Body() body: SetRoyaltyDto,
  ) {
    return this.collectionFactoryService.setRoyalty(
      address,
      body.recipient,
      body.percentage,
    );
  }
}
