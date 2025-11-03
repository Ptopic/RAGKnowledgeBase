import { Injectable, Logger } from '@nestjs/common';
import { NotionPage, NotionBlock } from './interfaces/connector.interface';
import { Client } from '@notionhq/client';

/**
 * Notion Connector for retrieving pages and content
 */

@Injectable()
export class NotionConnector {
  private readonly logger = new Logger(NotionConnector.name);
  private notion: Client;

  constructor(readonly token: string) {
    if (!token) {
      throw new Error('Notion token cannot be empty.');
    }

    this.notion = new Client({ auth: token });
    
    this.logger.log('Notion connector initialized');
  }

  /**
   * Fetch all pages shared with the integration
   */
  async getAllPages(startDate?: string, endDate?: string): Promise<NotionPage[]> {
    try {
      // biome-ignore lint/suspicious/noExplicitAny: Notion SDK search params have complex typing
      const searchParams: any = {
        filter: {
          value: 'page',
          property: 'object',
        },
      };
      
      if (startDate || endDate) {
        searchParams.sort = {
          direction: 'descending',
          timestamp: 'last_edited_time',
        };
      }
      
      const response = await this.notion.search(searchParams);
      const pages = response.results;
      
      const allPageData: NotionPage[] = [];
      
      for (const page of pages) {
        const pageId = page.id;
        const content = await this.getPageContent(pageId);
        
        allPageData.push({
          page_id: pageId,
          title: this.getPageTitle(page),
          content,
        });
      }
      
      return allPageData;
    } catch (error) {
      this.logger.error(`Failed to fetch Notion pages: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract title from a page object
   */
  // biome-ignore lint/suspicious/noExplicitAny: Notion page objects have dynamic structure
  getPageTitle(page: any): string {
    try {
      if (page.properties) {
        for (const [, propData] of Object.entries(page.properties)) {
          // biome-ignore lint/suspicious/noExplicitAny: Property data types vary by property type
          const prop = propData as any;
          if (prop.type === 'title' && prop.title && prop.title.length > 0) {
            // biome-ignore lint/suspicious/noExplicitAny: Title text objects have dynamic fields
            return prop.title.map((t: any) => t.plain_text).join(' ');
          }
        }
      }
      return `Untitled page (${page.id})`;
    } catch {
      return `Untitled page (${page.id})`;
    }
  }

  /**
   * Fetch content (blocks) of a specific page
   */
  async getPageContent(pageId: string): Promise<NotionBlock[]> {
    // biome-ignore lint/suspicious/noExplicitAny: Block objects from Notion API have dynamic structure
    const blocks: any[] = [];
    let hasMore = true;
    let cursor: string | undefined;
    
    while (hasMore) {
      const response = cursor
        ? await this.notion.blocks.children.list({ block_id: pageId, start_cursor: cursor })
        : await this.notion.blocks.children.list({ block_id: pageId });
      
      blocks.push(...response.results);
      hasMore = response.has_more;
      cursor = response.next_cursor || undefined;
    }
    
    const processedBlocks: NotionBlock[] = [];
    for (const block of blocks) {
      processedBlocks.push(await this.processBlock(block));
    }
    
    return processedBlocks;
  }

  /**
   * Process a block recursively
   */
  // biome-ignore lint/suspicious/noExplicitAny: Block objects from Notion API have dynamic structure
  private async processBlock(block: any): Promise<NotionBlock> {
    const blockId = block.id;
    const blockType = block.type;
    const content = this.extractBlockContent(block);
    
    const hasChildren = block.has_children || false;
    const childBlocks: NotionBlock[] = [];
    
    if (hasChildren) {
      const response = await this.notion.blocks.children.list({ block_id: blockId });
      for (const childBlock of response.results) {
        childBlocks.push(await this.processBlock(childBlock));
      }
    }
    
    return {
      id: blockId,
      type: blockType,
      content,
      children: childBlocks,
    };
  }

  /**
   * Extract content from a block based on its type
   */
  // biome-ignore lint/suspicious/noExplicitAny: Block objects have dynamic type-specific content
  private extractBlockContent(block: any): string {
    const blockType = block.type;
    
    if (block[blockType]?.rich_text) {
      // biome-ignore lint/suspicious/noExplicitAny: Rich text objects have dynamic structure
      return block[blockType].rich_text.map((t: any) => t.plain_text).join('');
    } else if (blockType === 'image') {
      return '[Notion Image]';
    } else if (blockType === 'code') {
      const language = block.code?.language || '';
      // biome-ignore lint/suspicious/noExplicitAny: Rich text objects have dynamic structure
      const code = block.code?.rich_text?.map((t: any) => t.plain_text).join('') || '';
      return `\`\`\`${language}\n${code}\n\`\`\``;
    } else if (blockType === 'equation') {
      return block.equation?.expression || '';
    }
    return '';
  }
}

