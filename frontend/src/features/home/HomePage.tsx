'use client';

import { useStreamingChat } from '@api/agent/hooks/useStreamingChat';
import MarkdownWithCode from '@components/markdownWithCode/MarkdownWithCode';
import { ArrowDownIcon, HamburgerIcon, NewChatIcon } from '@shared/svgs';
import { useEffect, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';

interface Message {
   id: number;
   text: string;
   isUser: boolean;
   isStreaming?: boolean;
}

const HomePage = () => {
   const [messages, setMessages] = useState<Message[]>([]);
   const [inputText, setInputText] = useState('');
   const [threadId, setThreadId] = useState<string>(Date.now().toString());
   const [streamingMessageId, setStreamingMessageId] = useState<number | null>(
      null
   );

   const lastUserMessageRef = useRef<HTMLDivElement>(null);
   const [isScrolledUp, setIsScrolledUp] = useState(false);

   const scrollContainerRef = useRef<HTMLDivElement>(null);

   const {
      streamedContent,
      isStreaming,
      isStartingStreaming,
      error,
      startStreaming,
      stopStreaming,
      clearContent,
   } = useStreamingChat();

   useEffect(() => {
      if (isStreaming && streamingMessageId && streamedContent) {
         setMessages((prev) =>
            prev.map((msg) =>
               msg.id === streamingMessageId
                  ? { ...msg, text: streamedContent }
                  : msg
            )
         );
      }
   }, [streamedContent, isStreaming, streamingMessageId]);

   useEffect(() => {
      if (messages.length > 0) {
         const userMessages = messages.filter((msg) => msg.isUser);
         if (userMessages.length > 0) {
            setTimeout(() => {
               scrollToLastUserMessage();
            }, 100);
         }
      }
   }, [messages.filter((msg) => msg.isUser).length]);

   useEffect(() => {
      const scrollContainer = scrollContainerRef.current;
      if (!scrollContainer) return;

      const handleScroll = () => {
         const { scrollTop, scrollHeight, clientHeight } = scrollContainer;

         const tolerance = 100;
         const isNearBottom =
            scrollTop + clientHeight >= scrollHeight - tolerance;

         setIsScrolledUp(!isNearBottom);
      };

      scrollContainer.addEventListener('scroll', handleScroll);

      handleScroll();

      return () => {
         scrollContainer.removeEventListener('scroll', handleScroll);
      };
   }, []);

   useEffect(() => {
      if (scrollContainerRef.current) {
         setTimeout(() => {
            const scrollContainer = scrollContainerRef.current;
            if (scrollContainer) {
               const { scrollTop, scrollHeight, clientHeight } =
                  scrollContainer;
               const tolerance = 100;
               const isNearBottom =
                  scrollTop + clientHeight >= scrollHeight - tolerance;
               setIsScrolledUp(!isNearBottom);
            }
         }, 50);
      }
   }, [messages.length]);

   useEffect(() => {
      if (error) {
         setMessages((prev) => [
            ...prev,
            {
               id: Date.now(),
               text: 'Something went wrong...',
               isUser: false,
               isStreaming: false,
            },
         ]);
      }
   }, [error]);

   const scrollToLastUserMessage = () => {
      if (lastUserMessageRef.current) {
         lastUserMessageRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
         });
      }
   };

   const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputText(e.target.value);
   };

   const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
         e.preventDefault();
         sendMessage();
      }
   };

   const sendMessage = async () => {
      if (inputText.trim() === '' || isStreaming) return;

      const userMessage: Message = {
         id: Date.now(),
         text: inputText.trim(),
         isUser: true,
      };

      setMessages((prev) => [...prev, userMessage]);

      const messageToSend = inputText.trim();
      setInputText('');

      const aiMessageId = Date.now() + 1;
      const aiMessage: Message = {
         id: aiMessageId,
         text: '',
         isUser: false,
         isStreaming: true,
      };

      setMessages((prev) => [...prev, aiMessage]);
      setStreamingMessageId(aiMessageId);

      clearContent();

      try {
         await startStreaming({
            message: messageToSend,
            thread_id: threadId,
         });

         setMessages((prev) => {
            const updatedMessages = prev.map((msg) =>
               msg.id === aiMessageId ? { ...msg, isStreaming: false } : msg
            );
            return updatedMessages;
         });
         setStreamingMessageId(null);
      } catch (error) {
         console.error('Error sending chat message:', error);

         setMessages((prev) =>
            prev.map((msg) =>
               msg.id === aiMessageId
                  ? {
                       ...msg,
                       text: 'Sorry, there was an error processing your request.',
                       isStreaming: false,
                    }
                  : msg
            )
         );
         setStreamingMessageId(null);
      }
   };

   const handleStopStreaming = () => {
      stopStreaming();

      if (streamingMessageId) {
         setMessages((prev) =>
            prev.map((msg) =>
               msg.id === streamingMessageId
                  ? { ...msg, isStreaming: false }
                  : msg
            )
         );
         setStreamingMessageId(null);
      }
   };

   const resetChat = () => {
      setMessages([]);
      setThreadId(Date.now().toString());
      clearContent();
      setStreamingMessageId(null);
      if (isStreaming) {
         stopStreaming();
      }
   };

   const getMessageContent = (message: Message) => {
      return message.text;
   };

   const scrollToBottom = () => {
      if (scrollContainerRef.current) {
         scrollContainerRef.current.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: 'smooth',
         });
      }
   };

   return (
      <div className='flex h-[100dvh] flex-col'>
         <nav className='flex items-center justify-between border-b border-border bg-background p-2'>
            <div className='flex w-full items-center justify-between gap-2'>
               <button className='flex cursor-pointer items-center justify-center p-2 lg:p-4'>
                  <HamburgerIcon className='h-6 w-6' />
               </button>
               <p className='text-xl font-bold'>Youtube AI</p>
               <button
                  className='flex cursor-pointer items-center justify-center p-2 lg:p-4'
                  onClick={resetChat}
               >
                  <NewChatIcon className='h-6 w-6' />
               </button>
            </div>
         </nav>
         <div
            className='custom-scrollbar flex h-full w-full flex-col overflow-y-scroll px-4 py-4'
            ref={scrollContainerRef}
         >
            <div className='mx-auto flex w-full flex-1 flex-col lg:w-[50%]'>
               {messages.length === 0 ? (
                  <div className='flex h-full flex-col items-center justify-center p-8 text-center text-text-secondary'>
                     <p>Start your conversation.</p>
                  </div>
               ) : (
                  messages.map((message, index) => {
                     const userMessages = messages.filter((msg) => msg.isUser);
                     const isLastUserMessage =
                        message.isUser &&
                        userMessages.length > 0 &&
                        message.id === userMessages[userMessages.length - 1].id;

                     return (
                        <div
                           key={message.id}
                           ref={isLastUserMessage ? lastUserMessageRef : null}
                           data-message-id={message.id}
                           className={twMerge(
                              'flex animate-fade-in gap-3 rounded-lg p-3 px-4',
                              message.isUser
                                 ? 'max-w-[75%] self-end bg-user-message'
                                 : 'max-w-[100%] self-start !px-0 !pb-4 !pt-0',
                              index === messages.length - 1 &&
                                 'min-h-[calc(100dvh-140px)] !pb-16 lg:min-h-[calc(100dvh-160px)]'
                           )}
                        >
                           <div className='min-w-0 text-text'>
                              <MarkdownWithCode
                                 markdown={getMessageContent(message)}
                                 isUser={message.isUser}
                              />
                              {message.isStreaming &&
                                 message.id === streamingMessageId &&
                                 isStartingStreaming && (
                                    <span className='inline-block h-3 w-3 animate-pulse rounded-full bg-primary' />
                                 )}
                           </div>
                        </div>
                     );
                  })
               )}
            </div>

            <div className='fixed bottom-0 left-1/2 flex w-[calc(100dvw-24px)] -translate-x-1/2 flex-col gap-4 lg:w-[50%]'>
               {isScrolledUp && (
                  <div
                     className='flex cursor-pointer items-center justify-center'
                     onClick={scrollToBottom}
                  >
                     <button className='flex cursor-pointer items-center justify-center rounded-full border border-border bg-background p-2'>
                        <ArrowDownIcon className='h-5 w-5' />
                     </button>
                  </div>
               )}

               <div className='flex items-center gap-2 bg-background pb-4'>
                  <textarea
                     value={inputText}
                     onChange={handleInputChange}
                     onKeyDown={handleKeyDown}
                     placeholder='Type your message...'
                     rows={1}
                     className='hidden min-h-[48px] flex-1 resize-none rounded-lg border border-border bg-surface px-4 py-3 font-sans text-base text-text outline-none transition-colors placeholder:text-text-secondary focus:border-primary lg:flex'
                  />
                  <textarea
                     value={inputText}
                     onChange={handleInputChange}
                     placeholder='Type your message...'
                     rows={1}
                     className='flex min-h-[48px] flex-1 resize-none rounded-lg border border-border bg-surface px-4 py-3 font-sans text-base text-text outline-none transition-colors placeholder:text-text-secondary focus:border-primary lg:hidden'
                  />
                  <button
                     className='flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg border-none bg-primary text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-disabled'
                     onClick={isStreaming ? handleStopStreaming : sendMessage}
                     disabled={inputText.trim() === '' && !isStreaming}
                  >
                     {isStreaming ? (
                        <svg
                           width='16'
                           height='16'
                           viewBox='0 0 16 16'
                           fill='none'
                           xmlns='http://www.w3.org/2000/svg'
                        >
                           <rect
                              x='2'
                              y='2'
                              width='12'
                              height='12'
                              rx='2'
                              fill='currentColor'
                           />
                        </svg>
                     ) : (
                        <svg
                           width='24'
                           height='24'
                           viewBox='0 0 24 24'
                           fill='none'
                           xmlns='http://www.w3.org/2000/svg'
                        >
                           <path
                              d='M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z'
                              fill='currentColor'
                           />
                        </svg>
                     )}
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
};

export default HomePage;
