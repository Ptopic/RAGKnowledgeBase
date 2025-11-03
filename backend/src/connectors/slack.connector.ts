import { Injectable, Logger } from '@nestjs/common';
import { SlackChannel, SlackMessage } from './interfaces/connector.interface';
import { WebClient } from '@slack/web-api';

/**
 * Slack Connector for retrieving conversation history
 */

@Injectable()
export class SlackConnector {
  private readonly logger = new Logger(SlackConnector.name);
  private client: WebClient;

  constructor(token?: string) {
    if (token) {
      this.setToken(token);
    }
  }

  /**
   * Set the Slack API token
   */
  setToken(token: string): void {
    if (!token) {
      throw new Error('Slack token cannot be empty.');
    }

    this.client = new WebClient(token);
    
    this.logger.log('Slack connector initialized');
  }

  /**
   * Fetch all channels that the bot has access to
   */
  async getAllChannels(includePrivate: boolean = true): Promise<SlackChannel[]> {
    if (!this.client) {
      throw new Error('Slack client not initialized. Call setToken() first.');
    }
    
    const channelsList: SlackChannel[] = [];
    let types = 'public_channel';
    if (includePrivate) {
      types += ',private_channel';
    }
    
    let cursor: string | undefined;
    let isFirstRequest = true;
    
    while (isFirstRequest || cursor) {
      try {
        if (!isFirstRequest) {
          // Add delay for pagination
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        const result = await this.client.conversations.list({
          types,
          cursor,
          limit: 1000,
        });
        
        const channels = result.channels || [];
        for (const channel of channels) {
          if (channel.name && channel.id) {
            channelsList.push({
              id: channel.id,
              name: channel.name,
              is_private: channel.is_private || false,
              is_member: channel.is_member || false,
            });
          }
        }
        
        cursor = result.response_metadata?.next_cursor;
        isFirstRequest = false;
        
        if (!cursor) break;
      } catch (error) {
        if (error.data?.error === 'ratelimited') {
          const retryAfter = error.data?.retry_after || 60;
          this.logger.warn(`Rate limited. Waiting ${retryAfter} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        } else {
          throw error;
        }
      }
    }
    
    return channelsList;
  }

  /**
   * Fetch conversation history for a channel
   */
  async getConversationHistory(
    channelId: string,
    limit: number = 1000,
    oldest?: number,
    latest?: number,
    // biome-ignore lint/suspicious/noExplicitAny: Slack message objects have dynamic structure
  ): Promise<any[]> {
    if (!this.client) {
      throw new Error('Slack client not initialized. Call setToken() first.');
    }
    
    // biome-ignore lint/suspicious/noExplicitAny: Slack message objects have dynamic structure
    const messages: any[] = [];
    let cursor: string | undefined;
    
    while (true) {
      try {
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        // biome-ignore lint/suspicious/noExplicitAny: Slack API params have flexible structure
        const params: any = {
          channel: channelId,
          limit: Math.min(limit, 1000),
        };
        
        if (oldest) params.oldest = oldest.toString();
        if (latest) params.latest = latest.toString();
        if (cursor) params.cursor = cursor;
        
        const result = await this.client.conversations.history(params);
        
        const batch = result.messages || [];
        messages.push(...batch);
        
        if (result.has_more && messages.length < limit) {
          cursor = result.response_metadata?.next_cursor;
        } else {
          break;
        }
      } catch (error) {
        if (error.data?.error === 'not_in_channel') {
          this.logger.warn(`Bot is not in channel '${channelId}'`);
          return [];
        }
        if (error.data?.error === 'ratelimited') {
          const retryAfter = error.data?.retry_after || 60;
          this.logger.warn(`Rate limited. Waiting ${retryAfter} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        } else {
          throw error;
        }
      }
    }
    
    return messages.slice(0, limit);
  }

  /**
   * Convert date string to Unix timestamp
   */
  static convertDateToTimestamp(dateStr: string): number | null {
    try {
      const date = new Date(dateStr);
      return Math.floor(date.getTime() / 1000);
    } catch {
      return null;
    }
  }

  /**
   * Fetch conversation history within a date range
   */
  async getHistoryByDateRange(
    channelId: string,
    startDate: string,
    endDate: string,
    limit: number = 1000,
    // biome-ignore lint/suspicious/noExplicitAny: Slack message objects have dynamic structure
  ): Promise<[any[], string | null]> {
    const oldest = SlackConnector.convertDateToTimestamp(startDate);
    if (!oldest) {
      return [[], `Invalid start date format: ${startDate}. Please use YYYY-MM-DD.`];
    }

    const latest = SlackConnector.convertDateToTimestamp(endDate);
    if (!latest) {
      return [[], `Invalid end date format: ${endDate}. Please use YYYY-MM-DD.`];
    }

    // Add one day to make end date inclusive
    const latestInclusive = latest + 86400;

    try {
      const messages = await this.getConversationHistory(
        channelId,
        limit,
        oldest,
        latestInclusive,
      );
      return [messages, null];
    } catch (error) {
      return [[], `Slack API error: ${error.message}`];
    }
  }

  /**
   * Get user information
   */
  // biome-ignore lint/suspicious/noExplicitAny: Slack user info has dynamic structure
  async getUserInfo(userId: string): Promise<any> {
    if (!this.client) {
      throw new Error('Slack client not initialized. Call setToken() first.');
    }
    
    while (true) {
      try {
        const result = await this.client.users.info({ user: userId });
        return result.user;
      } catch (error) {
        if (error.data?.error === 'ratelimited') {
          const retryAfter = error.data?.retry_after || 30;
          this.logger.warn(`Rate limited. Waiting ${retryAfter} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Format a message for easier consumption
   */
  // biome-ignore lint/suspicious/noExplicitAny: Slack message objects have dynamic structure
  async formatMessage(msg: any, includeUserInfo: boolean = false): Promise<SlackMessage> {
    const formatted: SlackMessage = {
      text: msg.text || '',
      timestamp: msg.ts || '',
      datetime: msg.ts
        ? new Date(parseFloat(msg.ts) * 1000).toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        : '',
      user_id: msg.user || 'UNKNOWN',
      has_attachments: !!msg.attachments,
      has_files: !!msg.files,
      thread_ts: msg.thread_ts,
      is_thread: !!msg.thread_ts,
    };

    if (includeUserInfo && msg.user && this.client) {
      try {
        const userInfo = await this.getUserInfo(msg.user);
        formatted.user_name = userInfo.real_name || 'Unknown';
        formatted.user_email = userInfo.profile?.email || '';
      } catch {
        formatted.user_name = 'Unknown';
      }
    }

    return formatted;
  }
}

