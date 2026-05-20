import { useRef, useState } from 'react';
import type { WikiPage, WikiPayload } from './types';

export function useWikiState() {
  const [wiki, setWiki] = useState<WikiPayload | null>(null);
  const [selectedWikiPageId, setSelectedWikiPageId] = useState<string | null>(null);
  const [readingMode, setReadingMode] = useState(false);
  const [activeSourceRef, setActiveSourceRef] = useState<string | null>(null);
  const sourceCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const selectedWikiPage = wiki?.pages.find((page) => page.id === selectedWikiPageId) || wiki?.pages[0];

  function selectFirstWikiPage(payload: WikiPayload) {
    if (payload.pages[0]) setSelectedWikiPageId(payload.pages[0].id);
  }

  function openWikiPage(pageId: string) {
    setSelectedWikiPageId(pageId);
    setActiveSourceRef(null);
  }

  function handleCitationClick(ref: string) {
    setActiveSourceRef(ref);
    sourceCardRefs.current[ref]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function askablePage(page?: WikiPage) {
    return page || selectedWikiPage;
  }

  return {
    wiki,
    setWiki,
    selectedWikiPageId,
    setSelectedWikiPageId,
    selectedWikiPage,
    readingMode,
    setReadingMode,
    activeSourceRef,
    sourceCardRefs,
    selectFirstWikiPage,
    openWikiPage,
    handleCitationClick,
    askablePage,
  };
}
