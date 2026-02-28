import { Injectable, Logger } from '@nestjs/common';
import TurndownService from 'turndown';
import { ConfigService } from '../config/config.service';

export interface CrawleeImpitResult {
  content: string;
  metadata: {
    title: string;
    description?: string;
    url: string;
    [key: string]: any;
  };
}

@Injectable()
export class CrawleeImpitFallbackService {
  private readonly logger = new Logger(CrawleeImpitFallbackService.name);
  private readonly enabled: boolean;
  private readonly timeoutMs: number;
  private readonly impitBrowser: string;
  private readonly http3: boolean;
  private readonly turndownService: TurndownService;

  constructor(private configService: ConfigService) {
    this.enabled = this.configService.etl.jinaReader.fallback.enabled;
    this.timeoutMs = this.configService.etl.jinaReader.fallback.timeoutMs;
    this.impitBrowser = this.configService.etl.jinaReader.fallback.impitBrowser;
    this.http3 = this.configService.etl.jinaReader.fallback.http3;
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    });

    this.turndownService.remove(['script', 'style', 'noscript']);
  }

  isAvailable(): boolean {
    return this.enabled;
  }

  async scrapeUrl(url: string, proxyUrl?: string): Promise<CrawleeImpitResult> {
    if (!this.enabled) {
      throw new Error('Crawlee Impit fallback is disabled');
    }

    this.logger.log(`Attempting Crawlee Impit fallback for URL: ${url}`);

    const crawlee = (await import('crawlee')) as any;
    const impitModule = (await import('@crawlee/impit-client')) as any;
    const { HttpCrawler, ProxyConfiguration, RequestQueue, Configuration } = crawlee;
    const { ImpitHttpClient } = impitModule;

    const crawleeConfig = new Configuration({
      persistStorage: false,
      purgeOnStart: false,
    });

    let extractedTitle = url;
    let extractedContent = '';
    let crawlError: Error | null = null;
    const turndownService = this.turndownService;

    const requestQueue = await RequestQueue.open(
      `jina-fallback-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      { config: crawleeConfig },
    );
    await requestQueue.addRequest({
      url,
      uniqueKey: `${url}::${Date.now()}::${Math.random().toString(36).slice(2)}`,
    });

    const crawler = new HttpCrawler(
      {
        requestQueue,
        maxRequestsPerCrawl: 1,
        requestHandlerTimeoutSecs: Math.ceil(this.timeoutMs / 1000),
        httpClient: new ImpitHttpClient({
          browser: this.impitBrowser,
          http3: this.http3,
        }),
        proxyConfiguration: proxyUrl
          ? new ProxyConfiguration({
              proxyUrls: [proxyUrl],
            })
          : undefined,
        requestHandler: async ({ body, request }: { body: string | Buffer; request: { url: string } }) => {
          const html = Buffer.isBuffer(body) ? body.toString('utf-8') : (body || '');

          if (!html) {
            throw new Error('Crawlee Impit fallback received empty HTTP body');
          }

          extractedTitle = extractTitle(html) || request.url;

          const markdownBody = convertHtmlToMarkdown(turndownService, html);
          extractedContent = ensureMarkdownTitle(markdownBody, extractedTitle);
        },
        failedRequestHandler: async (
          _context: unknown,
          error?: Error,
        ) => {
          crawlError = error || new Error('Unknown Crawlee fallback failure');
        },
      },
      crawleeConfig,
    );

    await crawler.run();

    if (crawlError) {
      throw new Error(`Crawlee Impit fallback crawl failed: ${crawlError.message}`);
    }

    if (!extractedContent.trim()) {
      throw new Error('Crawlee Impit fallback returned empty content');
    }

    this.logger.log(
      `Crawlee Impit fallback succeeded for ${url} - ${extractedContent.length} characters`,
    );

    return {
      content: extractedContent,
      metadata: {
        title: extractedTitle,
        url,
        sourceURL: url,
        scraper: 'Crawlee Impit Fallback',
      },
    };
  }
}

function extractTitle(html: string): string | null {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!titleMatch?.[1]) {
    return null;
  }

  return decodeHtmlEntities(titleMatch[1]).replace(/\s+/g, ' ').trim() || null;
}

function convertHtmlToMarkdown(turndownService: TurndownService, html: string): string {
  const markdown = turndownService.turndown(html).trim();
  return markdown.replace(/\n{3,}/g, '\n\n');
}

function ensureMarkdownTitle(markdown: string, title: string): string {
  if (!markdown) {
    return `# ${title}`;
  }

  if (markdown.startsWith('# ')) {
    return markdown;
  }

  return `# ${title}\n\n${markdown}`;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)));
}
