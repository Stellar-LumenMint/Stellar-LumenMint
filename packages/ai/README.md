# @stellar-lumenmint/ai

AI-powered utilities for NFT metadata generation, enrichment, and search enhancement.

## Installation

```bash
pnpm add @stellar-lumenmint/ai
```

## Features

### NFT Metadata Generation

Generate AI-powered NFT metadata (name, description, attributes). Falls back to rule-based generation when no AI API key is configured.

```typescript
import { generateNftMetadata } from '@stellar-lumenmint/ai';

const metadata = await generateNftMetadata({
  config: {
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey: 'sk-...',
    model: 'gpt-4',
  },
  prompt: 'A cosmic dragon breathing stardust in a nebula',
  style: 'fantasy',
});
// => { name: 'Cosmic Dragon', description: '...', attributes: [...] }
```

### Metadata Enrichment

Analyze existing metadata and return enriched AI suggestions.

```typescript
import { enrichNftMetadata } from '@stellar-lumenmint/ai';

const enrichment = await enrichNftMetadata({
  config: { apiEndpoint: '...', apiKey: '...' },
  existingMetadata: { name: 'Dragon #42', description: 'A red dragon' },
});
// => { suggestedTitle: '...', extractedAttributes: [...], styleVector: {...} }
```

### Search Suggestions

AI-powered alternative search queries with relevance scoring.

```typescript
import { generateSearchSuggestions } from '@stellar-lumenmint/ai';

const suggestions = await generateSearchSuggestions({
  config: { apiEndpoint: '...', apiKey: '...' },
  query: 'space cat',
  limit: 5,
});
// => [{ query: 'cosmic feline NFT', score: 0.92 }, ...]
```

## Configuration

| Option | Type | Description |
|---|---|---|
| `apiEndpoint` | `string` | AI API endpoint URL |
| `apiKey` | `string` | API authentication key |
| `model` | `string` | Model name (default: `gpt-4`) |
| `timeoutMs` | `number` | Request timeout in ms (default: `30000`) |

All functions accept an optional `AiConfig` that can be shared across calls.

## Fallback Behavior

When no `apiEndpoint` or `apiKey` is configured, all functions automatically fall back to rule-based generation that produces reasonable results without network calls.
