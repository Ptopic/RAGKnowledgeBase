import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { twMerge } from 'tailwind-merge';

interface MarkdownWithCodeProps {
   markdown: string;
   isStreaming?: boolean;
   isUser?: boolean;
}

const MarkdownWithCode = memo(
   ({
      markdown,
      isStreaming = false,
      isUser = false,
   }: MarkdownWithCodeProps) => {
      const processedMarkdown = useMemo(() => {
         if (!markdown.trim()) return null;

         return (
            <ReactMarkdown
               remarkPlugins={[remarkGfm]}
               components={{
                  h1: ({ children, ...props }) => (
                     <h1
                        className='mb-4 mt-6 text-2xl font-bold text-white'
                        {...props}
                     >
                        {children}
                     </h1>
                  ),
                  h2: ({ children, ...props }) => (
                     <h2
                        className='mb-3 mt-5 text-xl font-bold text-white'
                        {...props}
                     >
                        {children}
                     </h2>
                  ),
                  h3: ({ children, ...props }) => (
                     <h3
                        className='mb-2 mt-4 text-lg font-bold text-white'
                        {...props}
                     >
                        {children}
                     </h3>
                  ),
                  h4: ({ children, ...props }) => (
                     <h4
                        className='mb-2 mt-3 text-base font-bold text-white'
                        {...props}
                     >
                        {children}
                     </h4>
                  ),
                  h5: ({ children, ...props }) => (
                     <h5
                        className='mb-2 mt-3 text-sm font-bold text-white'
                        {...props}
                     >
                        {children}
                     </h5>
                  ),
                  h6: ({ children, ...props }) => (
                     <h6
                        className='mb-2 mt-3 text-xs font-bold text-white'
                        {...props}
                     >
                        {children}
                     </h6>
                  ),
                  p: ({ children, ...props }) => (
                     <p
                        className={twMerge(
                           'mb-4 leading-relaxed',
                           isUser && '!mb-0'
                        )}
                        {...props}
                     >
                        {children}
                     </p>
                  ),
                  ul: ({ children, ...props }) => (
                     <ul className='mb-4 ml-6 list-disc space-y-1' {...props}>
                        {children}
                     </ul>
                  ),
                  ol: ({ children, ...props }) => (
                     <ol
                        className='mb-4 ml-6 list-decimal space-y-1'
                        {...props}
                     >
                        {children}
                     </ol>
                  ),
                  li: ({ children, ...props }) => (
                     <li className='leading-relaxed' {...props}>
                        {children}
                     </li>
                  ),
                  a: ({ children, ...props }) => (
                     <a
                        className='text-blue-400 underline hover:text-blue-300'
                        {...props}
                     >
                        {children}
                     </a>
                  ),
                  strong: ({ children, ...props }) => (
                     <strong className='font-bold' {...props}>
                        {children}
                     </strong>
                  ),
                  em: ({ children, ...props }) => (
                     <em className='italic' {...props}>
                        {children}
                     </em>
                  ),
                  hr: ({ ...props }) => (
                     <hr className='my-6 border-t border-border' {...props} />
                  ),
                  table: ({ children, ...props }) => (
                     <div className='my-4 overflow-x-auto'>
                        <table
                           className='min-w-full border-collapse border border-border text-sm'
                           {...props}
                        >
                           {children}
                        </table>
                     </div>
                  ),
                  thead: ({ children, ...props }) => (
                     <thead className='bg-surface' {...props}>
                        {children}
                     </thead>
                  ),
                  tbody: ({ children, ...props }) => (
                     <tbody {...props}>{children}</tbody>
                  ),
                  tr: ({ children, ...props }) => (
                     <tr
                        className='border-b border-border hover:bg-surface/50'
                        {...props}
                     >
                        {children}
                     </tr>
                  ),
                  th: ({ children, ...props }) => (
                     <th
                        className='border border-border px-4 py-2 text-left font-bold text-white'
                        {...props}
                     >
                        {children}
                     </th>
                  ),
                  td: ({ children, ...props }) => (
                     <td className='border border-border px-4 py-2' {...props}>
                        {children}
                     </td>
                  ),
                  code(props: any) {
                     const { node, inline, className, children, ...rest } =
                        props;
                     const match = /language-(\w+)/.exec(className || '');
                     return !inline && match ? (
                        <div className='my-4 w-full overflow-hidden rounded border border-gray-700'>
                           <div className='overflow-x-auto'>
                              <SyntaxHighlighter
                                 style={oneDark as any}
                                 language={match[1]}
                                 PreTag='div'
                                 className='!m-0 !bg-transparent text-sm'
                                 customStyle={{
                                    margin: 0,
                                    padding: '12px',
                                    background: 'transparent',
                                    whiteSpace: 'pre',
                                    minWidth: 'max-content',
                                 }}
                                 codeTagProps={{
                                    style: { background: 'transparent' },
                                 }}
                                 {...rest}
                              >
                                 {children}
                              </SyntaxHighlighter>
                           </div>
                        </div>
                     ) : (
                        <code
                           className={twMerge(
                              className,
                              'rounded-lg border border-gray-600 py-2 font-mono text-sm'
                           )}
                           {...rest}
                        >
                           {children}
                        </code>
                     );
                  },
               }}
            >
               {markdown}
            </ReactMarkdown>
         );
      }, [markdown, isUser]);

      return (
         <div className='max-w-none'>
            {processedMarkdown}
            {isStreaming && (
               <span className='ml-1 inline-block h-3 w-3 animate-pulse rounded-full bg-primary' />
            )}
         </div>
      );
   }
);

MarkdownWithCode.displayName = 'MarkdownWithCode';

export default MarkdownWithCode;
