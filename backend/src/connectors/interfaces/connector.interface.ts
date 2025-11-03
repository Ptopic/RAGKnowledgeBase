/**
 * Common interfaces for connectors
 */

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  url: string;
  description: string;
  last_updated: Date | null;
}

export interface RepositoryFile {
  path: string;
  sha: string;
  url: string;
  size: number;
  type: 'code' | 'doc';
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  created?: string;
  updated?: string;
  recurringEventId?: string;
}

export interface Calendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole?: string;
  timeZone?: string;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  payload?: {
    headers: Array<{
      name: string;
      value: string;
    }>;
    parts?: any[];
    body?: {
      data?: string;
    };
  };
}

export interface GmailProfile {
  email_address: string;
  messages_total: number;
  threads_total: number;
  history_id?: string;
}

export interface NotionPage {
  page_id: string;
  title: string;
  content: NotionBlock[];
}

export interface NotionBlock {
  id: string;
  type: string;
  content: string;
  children: NotionBlock[];
}

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
}

export interface SlackMessage {
  text: string;
  timestamp: string;
  datetime: string;
  user_id: string;
  has_attachments: boolean;
  has_files: boolean;
  thread_ts?: string;
  is_thread: boolean;
  user_name?: string;
  user_email?: string;
}

