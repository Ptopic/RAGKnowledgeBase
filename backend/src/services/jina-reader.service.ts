/**
 * Jina Reader Service
 * Free web scraping service that converts any URL to LLM-friendly markdown
 * Uses https://r.jina.ai/{url} - no API key required
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../config/config.service';

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

  constructor(private configService: ConfigService) {
    // Check if Jina Reader is enabled (default: true, it's free!)
    const enabledEnv = process.env.JINA_READER_ENABLED || 'TRUE';
    this.enabled = enabledEnv.toUpperCase() === 'TRUE';

    if (this.enabled) {
      this.logger.log('Jina Reader service initialized (free, no API key required)');
    } else {
      this.logger.warn('Jina Reader service is disabled');
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

    try {
      this.logger.log(`Scraping URL with Jina Reader: ${url}`);

      // Jina Reader API: https://r.jina.ai/{url}
      const jinaUrl = `${this.jinaReaderBaseUrl}${encodeURIComponent(url)}`;

      // Fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(jinaUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain',
          'X-Return-Format': 'markdown',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Jina Reader API error: ${response.status} ${response.statusText}`);
      }

      // Get the markdown content
      const markdownContent = await response.text();

      if (!markdownContent || markdownContent.trim().length === 0) {
        throw new Error('Jina Reader returned empty content');
      }

      // Extract title from the first line (usually # Title in markdown)
      let title = url;
      const lines = markdownContent.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('# ')) {
          title = line.replace(/^#\s+/, '').trim();
          break;
        }
      }

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
      throw new Error(`Failed to scrape URL with Jina Reader: ${error.message}`);
    }
  }
}
