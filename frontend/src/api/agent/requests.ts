import { ICallableRequestBuilder } from '@api/requestBuilder/types';

import config from '@shared/config';
import { IAgentChatDto } from './types';

export const chat =
   (request: ICallableRequestBuilder<any>) => async (chatDto: IAgentChatDto) =>
      request.call(`${config.apiUrl}/agent/chat`, (init) => ({
         ...init,
         method: 'POST',
         headers: {
            ...init.headers,
            'Content-Type': 'application/json',
         },
         body: JSON.stringify(chatDto),
      }));

export const streamChat = async function* (
   chatDto: IAgentChatDto
): AsyncGenerator<string, void, unknown> {
   try {
      const response = await fetch(`${config.apiUrl}/agent/chat/stream`, {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
         },
         body: JSON.stringify(chatDto),
      });

      if (!response.ok) {
         throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
         throw new Error('Response body is not readable');
      }

      try {
         while (true) {
            const { done, value } = await reader.read();

            if (done) {
               break;
            }

            const chunk = decoder.decode(value, { stream: true });
            if (chunk) {
               yield chunk;
            }
         }
      } finally {
         reader.releaseLock();
      }
   } catch (error) {
      console.error('Streaming error:', error);
      throw error;
   }
};
