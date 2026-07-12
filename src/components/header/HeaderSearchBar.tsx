import { FormEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MapPin, Mic, Search, SearchX } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  applyHeaderSearchAction,
  getHeaderSearchSuggestions,
  resolveHeaderSearch,
  type HeaderSearchAction,
  type HeaderSearchSuggestion,
} from '@/lib/headerSearchResolver';
import { BOOKING_HOME_RESET_EVENT } from '@/lib/bookingSessionReset';
import { scrollToBookingWidget } from '@/lib/bookingWidgetScroll';

const SEARCH_SUGGESTIONS = [
  'Where would you like to travel today?',
  'Book a cab to Araku Valley…',
  'Airport pickup in Visakhapatnam…',
  'Outstation trip to Hyderabad…',
  'Local sightseeing in Vizag…',
  'Urbania for group travel…',
  'Tour packages to Lambasingi…',
] as const;

/** Explicit actions — avoid re-resolving query text on chip tap */
const EMPTY_STATE_HINTS: { label: string; action: HeaderSearchAction }[] = [
  {
    label: 'Araku Valley',
    action: { type: 'navigate', path: '/tours/araku-valley-tour', label: 'Araku Valley Tour' },
  },
  {
    label: 'Airport transfer',
    action: resolveHeaderSearch('airport transfer')!,
  },
  {
    label: 'Urbania rental',
    action: { type: 'navigate', path: '/vehicle/urbania', label: 'Urbania Rental' },
  },
];

const ROTATE_MS = 3500;

interface HeaderSearchBarProps {
  className?: string;
}

export function HeaderSearchBar({ className }: HeaderSearchBarProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLFormElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [results, setResults] = useState<HeaderSearchSuggestion[]>([]);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [panelBox, setPanelBox] = useState<{ top: number; left: number; width: number } | null>(null);

  const trimmedQuery = query.trim();
  const showAnimatedPlaceholder = !isFocused && query.length === 0;
  const showResults = isFocused && trimmedQuery.length >= 2 && results.length > 0;
  const showNoResults =
    isFocused && trimmedQuery.length >= 2 && results.length === 0 && showEmptyState;
  const showPanel = showResults || showNoResults;

  const syncPanelBox = useCallback(() => {
    const el = fieldRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPanelBox({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!showPanel) {
      setPanelBox(null);
      return;
    }
    syncPanelBox();
  }, [showPanel, syncPanelBox, trimmedQuery, results.length]);

  useEffect(() => {
    if (!showPanel) return undefined;

    const onReposition = () => syncPanelBox();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [showPanel, syncPanelBox]);

  useEffect(() => {
    const handleHomeReset = () => {
      setQuery('');
      setIsFocused(false);
      setResults([]);
      setShowEmptyState(false);
    };

    window.addEventListener(BOOKING_HOME_RESET_EVENT, handleHomeReset);
    return () => window.removeEventListener(BOOKING_HOME_RESET_EVENT, handleHomeReset);
  }, []);

  useEffect(() => {
    if (!showAnimatedPlaceholder) return undefined;

    const timer = window.setInterval(() => {
      setSuggestionIndex((prev) => (prev + 1) % SEARCH_SUGGESTIONS.length);
    }, ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [showAnimatedPlaceholder]);

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      setResults([]);
      setActiveResultIndex(0);
      setShowEmptyState(false);
      return;
    }

    const timer = window.setTimeout(() => {
      const next = getHeaderSearchSuggestions(trimmedQuery);
      setResults(next);
      setActiveResultIndex(0);
      setShowEmptyState(next.length === 0);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [trimmedQuery]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setIsFocused(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const runSearch = useCallback(
    (searchQuery: string, explicitAction?: HeaderSearchAction) => {
      const trimmed = searchQuery.trim();
      if (trimmed.length < 2 && !explicitAction) {
        toast.message('Type a destination or service to search');
        scrollToBookingWidget({ smooth: true });
        return;
      }

      const action = explicitAction ?? resolveHeaderSearch(trimmed);
      if (!action) {
        setQuery(trimmed);
        setIsFocused(true);
        setShowEmptyState(true);
        setResults([]);
        return;
      }

      applyHeaderSearchAction(action, navigate);
      setQuery('');
      setIsFocused(false);
      setShowEmptyState(false);
      setResults([]);

      if (action.type === 'prefill' && action.prefill.autoTriggerSearch === false) {
        toast.success(`Showing ${action.label}`);
      }
    },
    [navigate],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (showResults && results[activeResultIndex]) {
      runSearch(query, results[activeResultIndex].action);
      return;
    }
    runSearch(query);
  };

  const handleVoiceSearch = () => {
    const win = window as Window & {
      webkitSpeechRecognition?: new () => {
        lang: string;
        start: () => void;
        onresult: (event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void;
      };
      SpeechRecognition?: new () => {
        lang: string;
        start: () => void;
        onresult: (event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void;
      };
    };
    const SpeechRecognitionCtor = win.webkitSpeechRecognition ?? win.SpeechRecognition;
    if (!SpeechRecognitionCtor) {
      toast.error('Voice search is not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-IN';
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (!transcript) return;
      setQuery(transcript);
      runSearch(transcript);
    };
    recognition.start();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsFocused(false);
      return;
    }

    if (!showResults) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveResultIndex((prev) => (prev + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveResultIndex((prev) => (prev - 1 + results.length) % results.length);
    }
  };

  const panel =
    showPanel && panelBox
      ? createPortal(
          <div
            ref={panelRef}
            className="premium-search-results fixed z-[10055] overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.16)]"
            style={{
              top: panelBox.top,
              left: panelBox.left,
              width: panelBox.width,
            }}
          >
            {showResults && (
              <ul role="listbox" className="max-h-72 overflow-y-auto py-1.5">
                {results.map((result, index) => (
                  <li key={result.id} role="option" aria-selected={index === activeResultIndex}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors',
                        index === activeResultIndex ? 'bg-blue-50/80' : 'hover:bg-gray-50',
                      )}
                      onMouseEnter={() => setActiveResultIndex(index)}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        runSearch(result.label, result.action);
                      }}
                    >
                      <Search className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold text-gray-900">{result.label}</span>
                        <span className="block truncate text-[11px] text-gray-500">{result.subtitle}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {showNoResults && (
              <div className="flex flex-col items-center px-4 py-5 text-center" role="status" aria-live="polite">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                  <SearchX className="h-6 w-6 text-blue-600" aria-hidden />
                </div>
                <p className="text-[14px] font-semibold text-gray-900">Search results are not found</p>
                <p className="mt-1 max-w-[18rem] text-[12px] leading-snug text-gray-500">
                  We couldn&apos;t find anything for &ldquo;{trimmedQuery}&rdquo;. Try a destination, airport, or
                  service.
                </p>
                <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
                  {EMPTY_STATE_HINTS.map((hint) => (
                    <button
                      key={hint.label}
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50/80 px-3 py-1.5 text-[11px] font-medium text-blue-700 transition-colors hover:bg-blue-100 active:bg-blue-200"
                      onPointerDown={(event) => {
                        // Keep focus/panel until click applies the action
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        runSearch(hint.label, hint.action);
                      }}
                    >
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                      {hint.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-3 text-[12px] font-semibold text-blue-600 hover:text-blue-700"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsFocused(false);
                    setShowEmptyState(false);
                    scrollToBookingWidget({ smooth: true });
                  }}
                >
                  Use booking form instead
                </button>
              </div>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <form
        ref={containerRef}
        onSubmit={handleSubmit}
        className={cn('premium-header-search relative w-full max-w-[680px]', className)}
        role="search"
      >
        <div
          ref={fieldRef}
          className="premium-search-field relative flex h-11 w-full items-center rounded-full border border-gray-200/70 bg-white"
        >
          <button
            type="submit"
            className="ml-2.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
            aria-label="Search"
          >
            <Search className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>

          <div className="relative flex min-h-0 min-w-0 flex-1 items-center self-stretch bg-white">
            {showAnimatedPlaceholder && (
              <div
                className="premium-search-placeholder pointer-events-none absolute inset-0 flex items-center overflow-hidden pr-2"
                aria-hidden
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={suggestionIndex}
                    className="premium-search-placeholder-text block w-full truncate text-[16px] leading-none text-gray-400"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {SEARCH_SUGGESTIONS[suggestionIndex]}
                  </motion.span>
                </AnimatePresence>
              </div>
            )}

            <input
              type="text"
              name="site-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={showAnimatedPlaceholder ? '' : 'Search destinations, trips, packages…'}
              aria-label="Search Vizag Taxi Hub"
              role="searchbox"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-expanded={showResults || showNoResults}
              aria-autocomplete="list"
              onFocus={() => setIsFocused(true)}
              className="premium-search-input w-full border-0 bg-white py-0 pl-0 pr-2 text-[16px] leading-[1.25] text-gray-800 shadow-none outline-none ring-0 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-0"
            />
          </div>

          <button
            type="button"
            onClick={handleVoiceSearch}
            className="premium-voice-btn mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition-all duration-250 hover:bg-blue-600/6 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/20"
            aria-label="Voice search"
          >
            <Mic className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        </div>
      </form>
      {panel}
    </>
  );
}
