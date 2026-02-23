import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export const useMarkdownStyles = () => {
  const markdownComponents = {
    h1: ({ node, ...props }) => <h1 className="text-4xl font-bold text-white mb-6 mt-8" style={{ textShadow: "0 0 10px rgba(0, 255, 136, 0.3)" }} {...props} />,
    h2: ({ node, ...props }) => <h2 className="text-3xl font-semibold text-cyan-400 mb-4 mt-8 border-b border-cyan-400/30 pb-2" {...props} />,
    h3: ({ node, ...props }) => <h3 className="text-2xl font-medium text-pink-400 mb-4 mt-6" {...props} />,
    p: ({ node, ...props }) => <p className="text-gray-300 leading-relaxed mb-6 text-lg" {...props} />,
    a: ({ node, ...props }) => <a className="text-cyan-400 hover:text-pink-500 underline decoration-cyan-400/50 hover:decoration-pink-500/50 transition-colors" {...props} />,
    ul: ({ node, ...props }) => <ul className="list-disc list-inside text-gray-300 mb-6 space-y-2 marker:text-cyan-400" {...props} />,
    ol: ({ node, ...props }) => <ol className="list-decimal list-inside text-gray-300 mb-6 space-y-2 marker:text-pink-400" {...props} />,
    li: ({ node, ...props }) => <li className="text-gray-300" {...props} />,
    strong: ({ node, ...props }) => <strong className="font-bold text-white" {...props} />,
    em: ({ node, ...props }) => <em className="italic text-gray-400" {...props} />,
    blockquote: ({ node, ...props }) => (
      <blockquote className="border-l-4 border-pink-500 pl-4 py-1 my-6 bg-gray-900/50 italic text-gray-400 rounded-r-lg" {...props} />
    ),
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <div className="rounded-lg overflow-hidden my-6 border border-gray-800 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          <SyntaxHighlighter
            style={vscDarkPlus}
            language={match[1]}
            PreTag="div"
            customStyle={{ margin: 0, padding: '1.5rem', background: '#0d1117' }}
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      ) : (
        <code className="bg-gray-800 text-pink-400 px-1.5 py-0.5 rounded text-sm font-mono border border-gray-700" {...props}>
          {children}
        </code>
      );
    }
  };

  return { markdownComponents };
};
