// ── AI Utilities for LumenMint ───────────────────────────────────────────────

import type { NftAttribute, NftMetadata } from '@stellar-lumenmint/shared-types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AiNftEnrichment {
  suggestedTitle: string;
  suggestedDescription: string;
  extractedAttributes: NftAttribute[];
  confidence: number; // 0–100
  tags: string[];
  category: string;
  styleVector: StyleVector;
}

export interface StyleVector {
  artStyle: string;
  colorPalette: string[];
  mood: string;
  medium: string;
  genre: string;
}

export interface SearchSuggestion {
  query: string;
  reason: string;
  relevanceScore: number;
}

export interface AiConfig {
  /** API endpoint for the AI service (OpenAI-compatible). */
  apiEndpoint?: string;
  /** API key for the AI service. */
  apiKey?: string;
  /** Model to use. Default: 'gpt-4o-mini'. */
  model?: string;
  /** Request timeout in ms. Default: 30000. */
  timeoutMs?: number;
}

// ── NFT Metadata Generator ───────────────────────────────────────────────────

interface GenerateOptions {
  /** Name context (e.g. "Pixel Art Cat"). */
  name?: string;
  /** Visual traits to describe. */
  traits?: string[];
  /** Art style (e.g. "pixel art", "digital painting"). */
  artStyle?: string;
  /** Maximum attributes to generate. Default: 8. */
  maxAttributes?: number;
}

/**
 * Generate NFT metadata using AI.
 *
 * Requires an AI service endpoint and API key to be configured.
 * Falls back to rule-based generation if no API is configured.
 */
export async function generateNftMetadata(
  config: AiConfig,
  options: GenerateOptions,
): Promise<NftMetadata> {
  if (config.apiEndpoint && config.apiKey) {
    return generateWithAI(config, options);
  }
  return generateWithRules(options);
}

async function generateWithAI(
  config: AiConfig,
  options: GenerateOptions,
): Promise<NftMetadata> {
  const prompt = buildMetadataPrompt(options);
  const timeoutMs = config.timeoutMs ?? 30000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(config.apiEndpoint!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model ?? 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an NFT metadata generator. Respond with valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`AI API error: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      choices: [{ message: { content: string } }];
    };
    return JSON.parse(data.choices[0].message.content) as NftMetadata;
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error).name === 'AbortError') {
      throw new Error(`AI request timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
}

function buildMetadataPrompt(options: GenerateOptions): string {
  const name = options.name ?? 'Unknown NFT';
  const traits = (options.traits ?? []).join(', ');
  const style = options.artStyle ?? 'digital art';
  const max = options.maxAttributes ?? 8;

  return `Generate NFT metadata in JSON format for:
Name: ${name}
${traits ? `Traits: ${traits}` : ''}
Style: ${style}

Return JSON with: name, description (2-3 sentences), and an attributes array (max ${max} items) with traitType, value, and optional displayType fields.`;
}

function generateWithRules(options: GenerateOptions): NftMetadata {
  const attributes: NftAttribute[] = [];
  const style = options.artStyle ?? 'digital art';

  attributes.push({ traitType: 'Art Style', value: style });
  attributes.push({ traitType: 'Rarity', value: 'Common' });
  attributes.push({ traitType: 'Generation', value: '1' });

  if (options.traits?.length) {
    options.traits.forEach((trait, i) => {
      attributes.push({
        traitType: `Trait ${i + 1}`,
        value: trait,
      });
    });
  }

  return {
    id: '',
    name: options.name ?? 'Unnamed NFT',
    description: `A ${style} NFT from the Stellar LumenMint collection.`,
    image: '',
    attributes: attributes.slice(0, options.maxAttributes ?? 8),
  };
}

// ── NFT Enrichment ───────────────────────────────────────────────────────────

/**
 * Analyze an existing NFT and enrich it with AI-generated metadata.
 */
export async function enrichNftMetadata(
  config: AiConfig,
  metadata: NftMetadata,
): Promise<AiNftEnrichment> {
  if (config.apiEndpoint && config.apiKey) {
    return enrichWithAI(config, metadata);
  }
  return enrichWithRules(metadata);
}

async function enrichWithAI(
  config: AiConfig,
  metadata: NftMetadata,
): Promise<AiNftEnrichment> {
  const timeoutMs = config.timeoutMs ?? 30000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(config.apiEndpoint!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model ?? 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You analyze NFT metadata and return structured enrichment data as JSON.' },
          { role: 'user', content: JSON.stringify(metadata) },
        ],
        temperature: 0.3,
        max_tokens: 400,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    const data = (await response.json()) as {
      choices: [{ message: { content: string } }];
    };
    return JSON.parse(data.choices[0].message.content) as AiNftEnrichment;
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error).name === 'AbortError') {
      return enrichWithRules(metadata);
    }
    throw err;
  }
}

function extractColorsFromName(name: string): {
  style: string;
  palette: string[];
} {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('pixel')) {
    return { style: 'pixel art', palette: ['#FF5555', '#55FF55', '#5555FF'] };
  }
  if (nameLower.includes('gold') || nameLower.includes('legendary')) {
    return { style: 'illustration', palette: ['#FFD700', '#FFA500', '#8B4513'] };
  }
  if (nameLower.includes('dark') || nameLower.includes('shadow')) {
    return { style: 'dark art', palette: ['#1a1a2e', '#16213e', '#0f3460'] };
  }

  return { style: 'digital art', palette: ['#6366f1', '#8b5cf6', '#d946ef'] };
}

function enrichWithRules(metadata: NftMetadata): AiNftEnrichment {
  const existingRarity = metadata.attributes.find(
    (a) => a.traitType.toLowerCase() === 'rarity',
  );
  const colors = extractColorsFromName(metadata.name);
  return {
    suggestedTitle: metadata.name,
    suggestedDescription: metadata.description ?? `${metadata.name} — a unique NFT.`,
    extractedAttributes: metadata.attributes,
    confidence: 60,
    tags: [metadata.name.toLowerCase(), 'nft', 'stellar'],
    category: existingRarity ? existingRarity.value.toString() : 'art',
    styleVector: {
      artStyle: colors.style,
      colorPalette: colors.palette,
      mood: 'neutral',
      medium: 'digital',
      genre: 'abstract',
    },
  };
}

// ── Search Enhancement ───────────────────────────────────────────────────────

/**
 * Generate AI-powered search suggestions based on user query.
 */
export async function generateSearchSuggestions(
  config: AiConfig,
  query: string,
  maxSuggestions = 5,
): Promise<SearchSuggestion[]> {
  if (!config.apiEndpoint || !config.apiKey) {
    return ruleBasedSuggestions(query, maxSuggestions);
  }

  try {
    const response = await fetch(config.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model ?? 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Generate ${maxSuggestions} alternative search queries for an NFT marketplace. Return a JSON array of { query, reason, relevanceScore } objects.`,
          },
          { role: 'user', content: query },
        ],
        temperature: 0.6,
        max_tokens: 300,
      }),
    });

    const data = (await response.json()) as {
      choices: [{ message: { content: string } }];
    };
    return JSON.parse(data.choices[0].message.content) as SearchSuggestion[];
  } catch {
    return ruleBasedSuggestions(query, maxSuggestions);
  }
}

function ruleBasedSuggestions(
  query: string,
  max: number,
): SearchSuggestion[] {
  const suggestions: SearchSuggestion[] = [
    { query: `${query} rare`, reason: 'Filter for rare items', relevanceScore: 80 },
    { query: `${query} legendary`, reason: 'Highest rarity tier', relevanceScore: 70 },
    { query: `newest ${query}`, reason: 'Recently minted', relevanceScore: 65 },
    { query: `${query} on sale`, reason: 'Available to buy', relevanceScore: 60 },
    { query: `best ${query}`, reason: 'Highest quality', relevanceScore: 55 },
  ];
  return suggestions.slice(0, max);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractColorsFromName(name: string): {
  style: string;
  palette: string[];
} {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('pixel')) {
    return { style: 'pixel art', palette: ['#FF5555', '#55FF55', '#5555FF'] };
  }
  if (nameLower.includes('gold') || nameLower.includes('legendary')) {
    return { style: 'illustration', palette: ['#FFD700', '#FFA500', '#8B4513'] };
  }
  if (nameLower.includes('dark') || nameLower.includes('shadow')) {
    return { style: 'dark art', palette: ['#1a1a2e', '#16213e', '#0f3460'] };
  }

  return { style: 'digital art', palette: ['#6366f1', '#8b5cf6', '#d946ef'] };
}
