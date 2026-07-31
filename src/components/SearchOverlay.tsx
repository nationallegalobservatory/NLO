'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Search, X, BookOpen, AlertCircle, FileText, Compass, Pin, Sparkles, Loader2, Send } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useChat } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { searchLocalFirst, trackSearchQueryLocalFirst } from '@/lib/api/offlineActions';

interface SearchResult {
  slug: string;
  type: string;
  format?: 'monthly-report' | 'post' | 'blog';
  title: string;
  date: string;
  authorName: string;
  category: string;
  excerpt?: string;
  url?: string;
}



function formatSearchResultDate(result: SearchResult): string {
  const date = new Date(result.date);
  if (Number.isNaN(date.getTime())) {
    return result.date;
  }

  const monthYearOnly =
    result.format === 'monthly-report' || result.slug === 'founding-editorial';

  return date.toLocaleDateString('en-US', monthYearOnly
    ? {
        year: 'numeric',
        month: 'long',
      }
    : {
        year: 'numeric',
        month: 'short',
      day: 'numeric',
      });
}

export default function SearchOverlay({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isAiMode, setIsAiMode] = useState(false);
  const [trendingQueries, setTrendingQueries] = useState<string[]>([]);
  const latestQueryRef = useRef('');
  const { messages, sendMessage, status, setMessages } = useChat({
    messages: [
      {
        id: 'welcome',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Hi! I am the observatory AI assistant. You can ask me any question about our legal documents, cases, or procedures, and I will search our database to find the answer.' }]
      }
    ]
  });

  // Persist chat history
  useEffect(() => {
    const saved = localStorage.getItem('nlo-ai-chat-messages');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load chat history:', e);
      }
    }
  }, [setMessages]);

  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem('nlo-ai-chat-messages', JSON.stringify(messages));
    }
  }, [messages]);

  const clearChat = () => {
    localStorage.removeItem('nlo-ai-chat-messages');
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Hi! I am the observatory AI assistant. You can ask me any question about our legal documents, cases, or procedures, and I will search our database to find the answer.' }]
      }
    ]);
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const isBhoomijaPage = pathname.startsWith('/bhoomija');

  useEffect(() => {
    fetch('/api/search/trending')
      .then((res) => res.json())
      .then((data) => {
        if (data.queries && data.queries.length > 0) {
          setTrendingQueries(data.queries);
        }
      })
      .catch((err) => console.error('Failed to fetch trending queries:', err));
  }, []);
  
  // Theme styling overrides
  const iconColor = isBhoomijaPage ? 'text-[#7d1919]' : 'text-primary';
  const categoryTextColor = isBhoomijaPage ? 'text-[#7d1919]' : 'text-primary';
  const highlightBorder = isBhoomijaPage ? 'border-[#7d1919]' : 'border-primary';
  const activeBg = isBhoomijaPage ? 'bg-[#561922]/10 dark:bg-[#C5A059]/10' : 'bg-primary-container/10 dark:bg-slate-800/80';
  const highlightText = isBhoomijaPage ? 'text-[#3c0610] dark:text-[#FDF6E3]' : 'text-slate-900 dark:text-white';
  const spinnerBorder = isBhoomijaPage ? 'border-[#561922] dark:border-[#C5A059]' : 'border-primary';
  const backdropBg = isBhoomijaPage ? 'bg-[#2c0a0a]/50 dark:bg-black/80' : 'bg-slate-900/60 dark:bg-black/80';
  const modalBg = isBhoomijaPage ? 'bg-[#fff9eb]/95 dark:bg-[#0F1115]/95' : 'bg-white dark:bg-slate-900';
  const modalBorder = isBhoomijaPage ? 'border-[#d8c1c2] dark:border-[#C5A059]/35' : 'border-slate-200 dark:border-slate-800';
  const modalShape = isBhoomijaPage ? 'rounded-none shadow-[0_24px_80px_rgba(86,25,34,0.22)] dark:shadow-[0_24px_90px_rgba(0,0,0,0.55)]' : 'rounded-xl shadow-2xl';
  const inputBorder = isBhoomijaPage ? 'border-[#d8c1c2]/80 dark:border-[#C5A059]/25' : 'border-slate-100 dark:border-slate-800';
  const inputText = isBhoomijaPage ? 'text-[#1e1c10] dark:text-[#FDF6E3] placeholder-[#867273] dark:placeholder-[#C5A059]/50 font-serif' : 'text-slate-900 dark:text-white placeholder-slate-400';
  const closeBtnHover = isBhoomijaPage ? 'hover:bg-[#561922]/10 hover:text-[#561922] dark:hover:bg-[#C5A059]/10 dark:hover:text-[#C5A059]' : 'hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600';
  const quickSearchBg = isBhoomijaPage ? 'border border-transparent hover:border-[#561922]/20 hover:bg-[#561922]/10 dark:hover:border-[#C5A059]/25 dark:hover:bg-[#C5A059]/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800';
  const quickSearchText = isBhoomijaPage ? 'text-[#534343] dark:text-[#FDF6E3]/70' : 'text-slate-400';
  const resultHover = isBhoomijaPage ? 'hover:bg-[#561922]/10 dark:hover:bg-[#C5A059]/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50';
  const footerBg = isBhoomijaPage ? 'bg-[#f4eedb] dark:bg-[#15181E]' : 'bg-slate-50 dark:bg-slate-800/30';
  const footerText = isBhoomijaPage ? 'text-[#534343] dark:text-[#FDF6E3]/55' : 'text-slate-400';
  const kbdBorder = isBhoomijaPage ? 'border-[#d8c1c2] bg-[#fff9eb] text-[#561922] dark:border-[#C5A059]/30 dark:bg-[#1A1D23] dark:text-[#C5A059]' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800';

  const performSearch = async (
    searchQuery: string,
    signal?: AbortSignal
  ) => {
    setIsLoading(true);

    try {
      const localResults = await searchLocalFirst(searchQuery);
      if (latestQueryRef.current !== searchQuery) {
        return;
      }

      if (localResults.length > 0 || !navigator.onLine) {
        setResults(localResults);
        setSelectedIndex(-1);
        setErrorMsg(null);
        return;
      }

      const res = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}`,
        signal ? { signal } : undefined
      );
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (latestQueryRef.current !== searchQuery) {
          return;
        }
        setResults(data.results || []);
        setSelectedIndex(-1);
        setErrorMsg(null);
      } else {
        setResults([]);
        setErrorMsg(data.error || 'An error occurred during search.');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      console.error('Search error:', err);
      const localResults = await searchLocalFirst(searchQuery);
      if (localResults.length > 0) {
        setResults(localResults);
        setSelectedIndex(-1);
        setErrorMsg(null);
      } else {
        setErrorMsg('Offline search index is empty. Open the archive once while online.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    latestQueryRef.current = trimmedQuery;
    const controller = new AbortController();

    if (isAiMode) {
      return;
    }

    if (trimmedQuery.length < 2) {
      const clearTimer = window.setTimeout(() => {
        setResults([]);
        setErrorMsg(null);
        setSelectedIndex(-1);
        setIsLoading(false);
      }, 0);

      return () => {
        clearTimeout(clearTimer);
        controller.abort();
      };
    }

    const delayDebounce = window.setTimeout(() => {
      setSelectedIndex(-1);
      void performSearch(trimmedQuery, controller.signal);
    }, 250);

    return () => {
      clearTimeout(delayDebounce);
      controller.abort();
    };
  }, [query, isAiMode]);

  const toggleAiMode = async () => {
    const newMode = !isAiMode;
    if (newMode && !navigator.onLine) {
      setErrorMsg('AI search is unavailable offline. Local archive search is ready.');
      return;
    }

    setIsAiMode(newMode);
    
    const trimmedQuery = query.trim();
    latestQueryRef.current = trimmedQuery;

    if (!newMode && trimmedQuery.length >= 2) {
      await performSearch(trimmedQuery);
    }
  };

  const scopedResults =
    query.trim().length < 2
      ? []
      : isBhoomijaPage
      ? results.filter((result) => result.authorName.toLowerCase().includes('bhoomija'))
      : results;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isAiMode) setSelectedIndex((prev) => (prev < scopedResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isAiMode) setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      void toggleAiMode();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isAiMode) {
         if (query.trim()) {
           sendMessage({ text: query.trim() });
           setQuery('');
         }
      } else if (selectedIndex >= 0 && selectedIndex < scopedResults.length) {
        handleSelect(scopedResults[selectedIndex]);
      }
    }
  };

  const getArticleUrl = (result: SearchResult, withHighlight = false) => {
    if (result.url && result.type !== 'judgment' && result.type !== 'policy' && result.type !== 'research' && result.type !== 'opinion') {
      return result.url;
    }

    const typeMapping: Record<string, string> = {
      judgment: 'judgments',
      policy: 'policies',
      research: 'research',
      opinion: 'opinions',
    };
    const folder = typeMapping[result.type] || 'research';
    const base = `/publications/${folder}/${result.slug}`;
    return withHighlight && query.trim() ? `${base}?highlight=${encodeURIComponent(query.trim())}` : base;
  };

  const handleSelect = (result: SearchResult) => {
    if (query.trim().length >= 2) {
      void trackSearchQueryLocalFirst(query.trim()).catch(console.error);
    }
    router.push(getArticleUrl(result));
    onClose();
    setQuery('');
    setErrorMsg(null);
  };

  const handleJumpToMention = (e: React.MouseEvent, result: SearchResult) => {
    e.stopPropagation();
    if (query.trim().length >= 2) {
      void trackSearchQueryLocalFirst(query.trim()).catch(console.error);
    }
    router.push(getArticleUrl(result, true));
    onClose();
    setQuery('');
    setErrorMsg(null);
  };

  const backdropVariants = {
    hidden: { opacity: 0, backdropFilter: 'blur(0px)' },
    visible: { opacity: 1, backdropFilter: 'blur(2px)' },
    exit: { opacity: 0, backdropFilter: 'blur(0px)' },
  };

  const modalVariants = {
    hidden: { opacity: 0, y: -20, scale: 0.985 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 380,
        damping: 30,
        mass: 0.8,
      },
    },
    exit: {
      opacity: 0,
      y: -12,
      scale: 0.99,
      transition: { duration: 0.18, ease: 'easeInOut' as const },
    },
  };

  const listVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 350, damping: 25 },
    },
  };

  return (
    <motion.div
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 ${backdropBg}`}
    >
      <motion.div
        variants={modalVariants}
        className={`w-full max-w-2xl ${modalBg} border ${modalBorder} ${modalShape} overflow-hidden ${isBhoomijaPage ? 'backdrop-blur-md' : 'glass-panel'}`}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className={`flex items-center px-4 py-3 border-b ${inputBorder}`}>
          <Search className={`w-5 h-5 ${isBhoomijaPage ? 'text-[#561922]/70 dark:text-[#C5A059]/70' : 'text-slate-400'} mr-3 shrink-0`} />
          <input
            ref={inputRef}
            type="text"
            className={`w-full bg-transparent ${inputText} focus:outline-none text-base`}
            placeholder={isAiMode ? "Ask the AI assistant anything..." : (isBhoomijaPage ? "Search Bhoomija's publications, drafts, and research..." : "Search judgments, policies, research, tags, authors...")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isAiMode && query.trim().length > 0 && (
             <button
                onClick={() => {
                   sendMessage({ text: query.trim() });
                   setQuery('');
                }}
                className={`p-1.5 mr-2 ml-2 transition-colors ${isBhoomijaPage ? 'rounded-none bg-[#561922] text-white hover:bg-[#3c0610] dark:bg-[#C5A059] dark:text-[#0F1115] dark:hover:bg-[#ffdea5]' : 'rounded-md bg-primary text-on-primary hover:opacity-90'}`}
             >
                <Send className="w-4 h-4" />
             </button>
          )}
          <div className={`ml-1 flex items-center gap-3 shrink-0 border-l pl-3 ${isBhoomijaPage ? 'border-[#d8c1c2] dark:border-[#C5A059]/25' : 'border-slate-200 dark:border-slate-700'}`}>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] hidden sm:inline-flex font-medium items-center gap-1 transition-colors ${
                isAiMode
                  ? isBhoomijaPage ? 'text-[#7d1919]' : 'text-primary'
                  : 'text-slate-400'
              }`}>
                {status === 'streaming' || status === 'submitted' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                AI Search
              </span>
              <span className={`text-[11px] sm:hidden inline-flex font-medium items-center gap-1 transition-colors ${
                isAiMode
                  ? isBhoomijaPage ? 'text-[#7d1919]' : 'text-primary'
                  : 'text-slate-400'
              }`}>
                {status === 'streaming' || status === 'submitted' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                AI
              </span>
              
              <button
                onClick={() => void toggleAiMode()}
                disabled={status === 'streaming' || status === 'submitted'}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                  isAiMode 
                    ? isBhoomijaPage ? 'bg-[#7d1919]' : 'bg-primary'
                    : isBhoomijaPage ? 'bg-[#e9e2d0] dark:bg-[#1A1D23]' : 'bg-[#e5e5ea] dark:bg-[#39393d]'
                }`}
                title="Toggle AI Search Mode (Ctrl/Cmd+Enter)"
              >
                <span className="sr-only">Toggle AI Search</span>
                
                {/* ON icon (vertical line) */}
                <span className={`absolute left-[6px] flex h-full items-center justify-center transition-opacity duration-200 ${isAiMode ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="h-2 w-[1.5px] rounded-sm bg-white" />
                </span>
 
                {/* OFF icon (circle outline) */}
                <span className={`absolute right-[5px] flex h-full items-center justify-center transition-opacity duration-200 ${isAiMode ? 'opacity-0' : 'opacity-100'}`}>
                  <div className="h-[9px] w-[9px] rounded-full border-[1.5px] border-[#8e8e93] dark:border-[#98989d]" />
                </span>
 
                {/* Thumb */}
                <span className={`pointer-events-none inline-flex h-4 w-4 transform rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] ring-0 transition duration-200 ease-in-out ${isAiMode ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-md transition ${closeBtnHover}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
 
        {/* Results / Chat Body */}
        <div className="max-h-[28rem] overflow-y-auto p-2">
          {isAiMode ? (
            <div className="flex flex-col space-y-4 py-2 px-2 h-full">
              {messages.length > 1 && (
                <div className="flex justify-end px-2">
                  <button 
                    onClick={clearChat}
                    className={`text-[11px] transition-colors underline decoration-dotted ${
                      isBhoomijaPage
                        ? 'text-[#867273] hover:text-[#561922] dark:text-[#FDF6E3]/45 dark:hover:text-[#C5A059]'
                        : 'text-slate-400 hover:text-primary'
                    }`}
                  >
                    Clear Conversation
                  </button>
                </div>
              )}
              {messages.map((msg) => {
                          const isUser = (msg.role as string) === 'user';
                          const textContent = msg.parts?.find((part) => part.type === 'text')?.text ?? '';
                          return (
                <div
                  key={msg.id}
                  className={`flex ${
                    isUser ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-3 ${
                      isUser
                        ? isBhoomijaPage
                          ? 'rounded-none bg-[#561922] text-white dark:bg-[#C5A059] dark:text-[#0F1115]'
                          : 'rounded-2xl bg-primary text-on-primary'
                        : isBhoomijaPage
                        ? 'rounded-none bg-white/65 border border-[#d8c1c2] text-[#1e1c10] dark:bg-[#1A1D23] dark:border-[#C5A059]/25 dark:text-[#FDF6E3]'
                        : 'rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                  <div className="prose dark:prose-invert prose-sm max-w-none text-[13px] leading-relaxed break-words">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {textContent}
                        </ReactMarkdown>
                  </div>
                  </div>
                </div>
              )})}
              
              {(status === 'streaming' || status === 'submitted') && (
                <div className="flex justify-start">
                  <div
                    className={`max-w-[85%] px-4 py-3 ${
                      isBhoomijaPage
                        ? 'rounded-none bg-white/65 border border-[#d8c1c2] text-[#1e1c10] dark:bg-[#1A1D23] dark:border-[#C5A059]/25 dark:text-[#FDF6E3]'
                        : 'rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <Loader2 className={`w-4 h-4 animate-spin ${iconColor}`} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`flex items-center justify-center py-8 space-x-2 ${isBhoomijaPage ? 'text-[#534343] dark:text-[#FDF6E3]/60' : 'text-slate-400'}`}
                >
                  <div className={`w-5 h-5 border-2 ${spinnerBorder} border-t-transparent rounded-full animate-spin`}></div>
                  <span className="text-sm font-medium">Searching the observatory archive...</span>
                </motion.div>
              )}

              {!isLoading && query.trim().length > 0 && scopedResults.length === 0 && !errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-center py-8 ${isBhoomijaPage ? 'text-[#534343] dark:text-[#FDF6E3]/60' : 'text-slate-400'}`}
                >
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">
                    {isBhoomijaPage ? 'No Bhoomija publications or drafts match your query.' : 'No site pages, profiles, or verified bibliography match your query.'}
                  </p>
                  <p className="text-xs mt-1">
                    {isBhoomijaPage ? 'Try Founding Note, Manufacturing Consent, constitutional law, or drafting.' : 'Try searching constitutional law, privacy, climate change, or an article title.'}
                  </p>
                </motion.div>
              )}

              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`px-4 py-3 mb-2 text-sm font-medium mx-2 ${isBhoomijaPage ? 'rounded-none bg-[#ffdad6] text-[#93000a] border border-[#93000a]/20' : 'rounded-lg bg-red-50 text-red-600 border border-red-200'}`}
                >
                  <AlertCircle className="w-5 h-5 inline mr-2" />
                  {errorMsg}
                </motion.div>
              )}
            </>
          )}

          {!isAiMode && !isLoading && query.trim().length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`py-4 px-3 ${quickSearchText}`}
            >
              <span className={`text-xs font-semibold uppercase tracking-wider block mb-2 ${isBhoomijaPage ? 'font-mono text-[#561922] dark:text-[#C5A059]' : 'text-slate-500'}`}>
                {isBhoomijaPage ? 'Bhoomija Index' : 'FAQs'}
              </span>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {isBhoomijaPage ? (
                  <>
                    <button onClick={() => setQuery('Founding')} className={`flex items-center p-2 rounded-lg ${quickSearchBg} text-left transition-colors duration-150`}>
                      <Compass className={`w-4 h-4 ${iconColor} mr-2`} /> Founding Note
                    </button>
                    <button onClick={() => setQuery('Consent')} className={`flex items-center p-2 rounded-lg ${quickSearchBg} text-left transition-colors duration-150`}>
                      <FileText className={`w-4 h-4 ${iconColor} mr-2`} /> Manufacturing Consent
                    </button>
                    <button onClick={() => setQuery('Drafting')} className={`flex items-center p-2 rounded-lg ${quickSearchBg} text-left transition-colors duration-150`}>
                      <BookOpen className={`w-4 h-4 ${iconColor} mr-2`} /> Drafting Portfolio
                    </button>
                    <button onClick={() => setQuery('Constitutional')} className={`flex items-center p-2 rounded-lg ${quickSearchBg} text-left transition-colors duration-150`}>
                      <FileText className={`w-4 h-4 ${iconColor} mr-2`} /> Constitutional Law
                    </button>
                  </>
                ) : trendingQueries.length > 0 ? (
                  trendingQueries.map((tq, i) => (
                    <button key={i} onClick={() => setQuery(tq)} className="flex items-center p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors duration-150 capitalize">
                      <Search className="w-4 h-4 text-indigo-500 mr-2" /> {tq}
                    </button>
                  ))
                ) : (
                  <>
                    <button onClick={() => setQuery('Constitutional')} className="flex items-center p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors duration-150">
                      <Compass className="w-4 h-4 text-indigo-500 mr-2" /> Constitutional Law
                    </button>
                    <button onClick={() => setQuery('Surveillance')} className="flex items-center p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors duration-150">
                      <FileText className="w-4 h-4 text-indigo-500 mr-2" /> Surveillance
                    </button>
                    <button onClick={() => setQuery('Climate')} className="flex items-center p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors duration-150">
                      <BookOpen className="w-4 h-4 text-indigo-500 mr-2" /> Climate Litigation
                    </button>
                    <button onClick={() => setQuery('Digital Services')} className="flex items-center p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors duration-150">
                      <FileText className="w-4 h-4 text-indigo-500 mr-2" /> Platform Regulations
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {!isAiMode && !isLoading && scopedResults.length > 0 && (
            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="visible"
              className="space-y-1"
            >
              <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Publications found ({scopedResults.length})
              </div>
              {scopedResults.map((result, idx) => (
                <motion.div
                  key={result.slug}
                  variants={itemVariants}
                  className={`rounded-lg transition duration-150 ${
                    idx === selectedIndex
                      ? `${activeBg} border-l-4 ${highlightBorder}`
                      : resultHover
                  }`}
                >
                  {/* Main article row */}
                  <button
                    onClick={() => handleSelect(result)}
                    className="w-full flex items-center justify-between p-4 sm:p-3 text-left min-h-[60px]"
                  >
                    <div className="min-w-0 flex-1">
                      <span className={`text-xs uppercase tracking-wider font-semibold ${categoryTextColor}`}>
                        {result.type} &bull; {result.category}
                      </span>
                      <h4 className={`text-[15px] sm:text-sm font-semibold truncate leading-snug mt-1 sm:mt-0.5 ${
                        idx === selectedIndex
                          ? highlightText
                          : isBhoomijaPage
                          ? 'text-[#1e1c10] dark:text-[#FDF6E3]'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        {result.title}
                      </h4>
                      <span className={`text-[13px] sm:text-xs mt-1 sm:mt-0 block sm:inline ${
                        isBhoomijaPage
                          ? 'text-[#534343] dark:text-[#FDF6E3]/55'
                          : 'text-slate-500 dark:text-slate-500'
                      }`}>
                        By {result.authorName} &bull; {formatSearchResultDate(result)}
                      </span>
                    </div>
                    <BookOpen className={`w-5 h-5 sm:w-4 sm:h-4 opacity-60 ml-3 shrink-0 ${isBhoomijaPage ? 'text-[#561922] dark:text-[#C5A059]' : 'text-slate-400'}`} />
                  </button>

                  {/* Jump to mention button — only shows when there's a search query */}
                  {query.trim().length >= 2 && (
                    <div className="px-4 sm:px-3 pb-3 sm:pb-2.5">
                      <button
                        onClick={(e) => handleJumpToMention(e, result)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 sm:px-2.5 sm:py-1 text-xs sm:text-[11px] font-semibold border transition-all duration-150 group min-h-[44px] sm:min-h-0 ${
                          isBhoomijaPage
                            ? 'rounded-none bg-[#561922]/10 text-[#561922] border-[#561922]/25 hover:bg-[#561922]/15 dark:bg-[#C5A059]/10 dark:text-[#C5A059] dark:border-[#C5A059]/25 dark:hover:bg-[#C5A059]/15'
                            : 'rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200/60 dark:border-amber-700/30 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                        }`}
                        title={`Jump to first mention of "${query}" in this article`}
                      >
                        <Pin className="w-3 h-3 sm:w-3 sm:h-3 group-hover:scale-110 transition-transform" />
                        Jump to &ldquo;{query.trim().length > 20 ? query.trim().slice(0, 20) + '…' : query.trim()}&rdquo; in article →
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-4 py-2 border-t ${inputBorder} ${footerBg} flex justify-between text-xs ${footerText}`}>
          <span>Use <kbd className={`px-1 border ${kbdBorder} rounded`}>↑↓</kbd> to navigate</span>
          <span>Press <kbd className={`px-1 border ${kbdBorder} rounded`}>Esc</kbd> to close</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
