import { useCallback, useRef, useState } from 'react';
import { streamChat } from '../requests';
import { IAgentChatDto } from '../types';

export const useStreamingChat = () => {
   const [streamedContent, setStreamedContent] = useState<string>('');
   const [isStartingStreaming, setIsStartingStreaming] =
      useState<boolean>(false);
   const [isStreaming, setIsStreaming] = useState<boolean>(false);
   const [error, setError] = useState<string | null>(null);
   const abortControllerRef = useRef<AbortController | null>(null);
   const contentRef = useRef<string>('');

   const startStreaming = useCallback(async (chatDto: IAgentChatDto) => {
      setStreamedContent('');
      contentRef.current = '';
      setError(null);
      setIsStreaming(true);
      setIsStartingStreaming(true);

      abortControllerRef.current = new AbortController();

      try {
         const generator = streamChat(chatDto);
         let isFirstChunk = true;

         for await (const chunk of generator) {
            if (abortControllerRef.current?.signal.aborted) {
               break;
            }

            contentRef.current += chunk;

            if (isFirstChunk) {
               setIsStartingStreaming(false);
               isFirstChunk = false;
            }

            setStreamedContent(contentRef.current);
         }
      } catch (err) {
         if (!abortControllerRef.current?.signal.aborted) {
            setError(
               err instanceof Error
                  ? err.message
                  : 'An error occurred while streaming'
            );
         }
      } finally {
         setIsStreaming(false);
         setIsStartingStreaming(false);
         abortControllerRef.current = null;
      }
   }, []);

   const stopStreaming = useCallback(() => {
      if (abortControllerRef.current) {
         abortControllerRef.current.abort();
         abortControllerRef.current = null;
      }
      setIsStreaming(false);
   }, []);

   const clearContent = useCallback(() => {
      setStreamedContent('');
      contentRef.current = '';
      setError(null);
   }, []);

   const getFinalContent = useCallback(() => {
      return contentRef.current;
   }, []);

   return {
      streamedContent,
      isStreaming,
      isStartingStreaming,
      error,
      startStreaming,
      stopStreaming,
      clearContent,
      getFinalContent,
   };
};
