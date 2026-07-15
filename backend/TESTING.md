# Backend Testing Patterns

NestJS testing conventions for the LumenMint backend.

## Service Tests

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MyService,
        { provide: getRepositoryToken(MyEntity), useValue: mockRepo },
      ],
    }).compile();
    service = module.get(MyService);
  });
});
```

## Controller Tests

```typescript
describe('MyController', () => {
  let controller: MyController;
  let service: jest.Mocked<Partial<MyService>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [MyController],
      providers: [{ provide: MyService, useValue: mockService }],
    }).compile();
  });
});
```

## Mock Patterns

- `ConfigService` → `{ get: jest.fn() }`
- `Repository<T>` → `{ find, findOne, save, delete, createQueryBuilder }`
- `SorobanService` → `{ invokeContract, buildTransaction }`
- `SettlementClient` → `{ createSale, createAuction }`
