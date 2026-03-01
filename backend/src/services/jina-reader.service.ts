/**
 * Jina Reader Service
 * Free web scraping service that converts any URL to LLM-friendly markdown
 * Uses https://r.jina.ai/{url} - no API key required
 */

import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '../config/config.service';
import { CrawleeImpitFallbackService } from './crawlee-impit-fallback.service';

export interface JinaReaderResult {
  content: string;
  metadata: {
    title: string;
    description?: string;
    url: string;
    [key: string]: any;
  };
}

@Injectable()
export class JinaReaderService {
  private readonly logger = new Logger(JinaReaderService.name);
  private readonly jinaReaderBaseUrl = 'https://r.jina.ai/';
  private readonly enabled: boolean;
  private readonly jinaApiKey?: string;
  private readonly proxyEnabled: boolean;
  private readonly proxyProtocol: 'http' | 'https';
  private readonly proxyHost?: string;
  private readonly proxyPort?: number;
  private readonly proxyUsername?: string;
  private readonly proxyPassword?: string;
  private readonly proxyCheckIpOnEachRequest: boolean;
  private readonly fallbackEnabled: boolean;

  constructor(
    private configService: ConfigService,
    private crawleeImpitFallbackService: CrawleeImpitFallbackService,
  ) {
    this.enabled = this.configService.etl.jinaReader.enabled;
    this.jinaApiKey = this.configService.etl.jinaReader.apiKey;
    this.proxyEnabled = this.configService.etl.jinaReader.proxy.enabled;
    this.proxyProtocol = this.configService.etl.jinaReader.proxy.protocol;
    this.proxyHost = this.configService.etl.jinaReader.proxy.host;
    this.proxyPort = this.configService.etl.jinaReader.proxy.port;
    this.proxyUsername = this.configService.etl.jinaReader.proxy.username;
    this.proxyPassword = this.configService.etl.jinaReader.proxy.password;
    this.proxyCheckIpOnEachRequest = this.configService.etl.jinaReader.proxy.checkIpOnEachRequest;
    this.fallbackEnabled = this.configService.etl.jinaReader.fallback.enabled;

    if (this.enabled) {
      this.logger.log('Jina Reader service initialized');

      if (this.proxyEnabled) {
        if (this.hasProxyConfig()) {
          this.logger.log('Jina Reader proxy enabled');
        } else {
          this.logger.warn(
            'Jina Reader proxy enabled but config is incomplete; requests will continue without proxy',
          );
        }
      }

      if (this.fallbackEnabled) {
        this.logger.log('Crawlee Impit fallback is enabled for Jina Reader failures');
      }
    } else {
      this.logger.warn('Jina Reader service is disabled');
    }
  }

  private hasProxyConfig(): boolean {
    return !!(
      this.proxyHost &&
      this.proxyPort &&
      this.proxyUsername &&
      this.proxyPassword
    );
  }

  private buildProxyUrl(): string | null {
    if (!this.proxyEnabled || !this.hasProxyConfig()) {
      return null;
    }

    const encodedUsername = encodeURIComponent(this.proxyUsername!);
    const encodedPassword = encodeURIComponent(this.proxyPassword!);

    return `${this.proxyProtocol}://${encodedUsername}:${encodedPassword}@${this.proxyHost}:${this.proxyPort}`;
  }

  private async checkProxyIp(): Promise<void> {
    if (!this.proxyEnabled || !this.hasProxyConfig() || !this.proxyCheckIpOnEachRequest) {
      return;
    }

    try {
      const response = await axios.get('http://ip-api.com/json', {
        timeout: 15000,
        proxy: {
          protocol: this.proxyProtocol,
          host: this.proxyHost,
          port: this.proxyPort,
          auth: {
            username: this.proxyUsername,
            password: this.proxyPassword,
          },
        },
      });

      const ipInfo = response.data;
      if (ipInfo?.status === 'success') {
        this.logger.log(
          `Proxy IP check success: ${ipInfo.query} (${ipInfo.countryCode || 'N/A'}, ${ipInfo.city || 'N/A'})`,
        );
      } else {
        this.logger.warn('Proxy IP check returned non-success status');
      }
    } catch (error) {
      this.logger.warn(`Proxy IP check failed: ${error.message}`);
    }
  }

  /**
   * Check if Jina Reader is available
   */
  isAvailable(): boolean {
    return this.enabled;
  }

  /**
   * Scrape a URL using Jina Reader
   * Returns content in markdown format with metadata
   */
  async scrapeUrl(url: string): Promise<JinaReaderResult> {
    if (!this.enabled) {
      throw new Error('Jina Reader service is disabled. Please enable JINA_READER_ENABLED in .env');
    }

    const proxyUrl = this.buildProxyUrl();

    if (proxyUrl) {
      await this.checkProxyIp();
    }

    try {
      return await this.scrapeWithJina(url, proxyUrl);
    } catch (jinaError) {
      this.logger.warn(
        `Jina Reader failed for ${url}. ${this.fallbackEnabled ? 'Trying Crawlee Impit fallback.' : 'Fallback disabled.'} Error: ${jinaError.message}`,
      );

      if (!this.fallbackEnabled || !this.crawleeImpitFallbackService.isAvailable()) {
        throw new Error(`Failed to scrape URL with Jina Reader: ${jinaError.message}`);
      }

      try {
        return await this.crawleeImpitFallbackService.scrapeUrl(url, proxyUrl || undefined);
      } catch (fallbackError) {
        this.logger.error(
          `Crawlee Impit fallback failed for ${url}: ${fallbackError.message}`,
          fallbackError.stack,
        );

        throw new Error(
          `Failed to scrape URL with Jina Reader (${jinaError.message}) and Crawlee Impit fallback (${fallbackError.message})`,
        );
      }
    }
  }

  private async scrapeWithJina(url: string, proxyUrl: string | null): Promise<JinaReaderResult> {
    try {
      this.logger.log(`Scraping URL with Jina Reader: ${url}`);

      // Jina Reader API: https://r.jina.ai/{url}
      // Keep raw URL format for parity with hegnar-journalist-boost
      const jinaUrl = `${this.jinaReaderBaseUrl}${url}`;

      const headers: Record<string, string> = {
        'X-Base': 'final',
        'X-Retain-Images': 'all',
      };

      if (this.jinaApiKey) {
        headers['Authorization'] = `Bearer ${this.jinaApiKey}`;
      }

      if (proxyUrl) {
        headers['x-proxy-url'] = proxyUrl;
      }

      // Fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(jinaUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        const errorBodySnippet = errorBody.slice(0, 500);
        this.logger.warn(
          `Jina Reader non-OK response for ${url}: ${response.status} ${response.statusText}${errorBodySnippet ? ` - ${errorBodySnippet}` : ''}`,
        );
        throw new Error(`Jina Reader API error: ${response.status} ${response.statusText}`);
      }

      // Get the markdown content
      const markdownContent = await response.text();

      if (!markdownContent || markdownContent.trim().length === 0) {
        throw new Error('Jina Reader returned empty content');
      }

      const title = this.extractTitleFromJinaMarkdown(markdownContent, url);

      this.logger.log(`Successfully scraped ${url} - ${markdownContent.length} characters`);

      return {
        content: markdownContent,
        metadata: {
          title,
          url,
          sourceURL: url,
          scraper: 'Jina Reader',
        },
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        this.logger.error(`Jina Reader request timeout for ${url}`);
        throw new Error('Request timeout while scraping URL with Jina Reader');
      }

      this.logger.error(`Jina Reader scrape failed for ${url}: ${error.message}`, error.stack);
      throw error;
    }
  }

  private extractTitleFromJinaMarkdown(markdownContent: string, fallbackUrl: string): string {
    const lines = markdownContent
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    for (const line of lines) {
      if (line.startsWith('# ')) {
        return line.replace(/^#\s+/, '').trim();
      }
    }

    for (const line of lines) {
      const titleMatch = line.match(/^title\s*:\s*(.+)$/i);
      if (titleMatch?.[1]) {
        return titleMatch[1].trim();
      }
    }

    for (const line of lines) {
      if (line.length >= 8) {
        return line.slice(0, 200);
      }
    }

    return fallbackUrl;
  }
}
