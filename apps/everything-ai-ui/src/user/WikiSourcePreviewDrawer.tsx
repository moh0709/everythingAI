import { useEffect, useMemo, useRef, useState } from 'react';
import type { WikiSource, WikiSourceChunk } from './types';

type WikiSourcePreviewDrawerProps = {
  source: WikiSource | null;
  activeChunkRef?: string | null;
  onClose: () => void;
  onCopyCitation: (ref?: string | null) => void;
  onCopyPath: (path?: string | null) => void;
};

function normalizeChunkRef(ref?: string | null) {
  if (!ref) return null;
  return ref.replace(/^\[/, '').replace(/\]$/, '');
}

function chunkRefCandidates(chunk: WikiSourceChunk) {
  return [chunk.ref, chunk.chunk_ref].filter(Boolean) as string[];
}

function primaryChunkRef(chunk: WikiSourceChunk) {
  return chunk.ref || chunk.chunk_ref || '';
}

function rangeLabel(label: string, start?: number, end?: number) {
  if (start == null && end == null) return null;
  if (start != null && end != null) return `${label} ${start}-${end}`;
  return `${label} ${start ?? end}`;
}

function chunkMeta(chunk: WikiSourceChunk) {
  return [
    chunk.page_number != null ? `Page ${chunk.page_number}` : null,
    rangeLabel('Lines', chunk.line_start, chunk.line_end),
    rangeLabel('Chars', chunk.char_start, chunk.char_end),
    chunk.stable_chunk_key ? `Key ${chunk.stable_chunk_key.slice(0, 10)}` : null,
  ].filter(Boolean) as string[];
}

export function WikiSourcePreviewDrawer({
  source,
  activeChunkRef,
  onClose,
  onCopyCitation,
  onCopyPath,
}: WikiSourcePreviewDrawerProps) {
  const chunkRefs = useRef<Record<string, HTMLElement | null>>({});
  const normalizedActiveChunkRef = normalizeChunkRef(activeChunkRef);
  const chunks = useMemo(() => source?.chunks || [], [source]);
  const activeChunk = useMemo(() => {
    if (!normalizedActiveChunkRef) return null;
    return chunks.find((chunk) => chunkRefCandidates(chunk).includes(normalizedActiveChunkRef)) || null;
  }, [chunks, normalizedActiveChunkRef]);
  const activeChunkSnippet = activeChunk?.evidence || activeChunk?.text || source?.evidence || null;
  const defaultInspectionRef = normalizedActiveChunkRef || (chunks[0] ? primaryChunkRef(chunks[0]) : null);
  const [inspectionChunkRef, setInspectionChunkRef] = useState<string | null>(defaultInspectionRef);

  useEffect(() => {
    setInspectionChunkRef(defaultInspectionRef);
  }, [defaultInspectionRef, source]);

  const inspectionChunkIndex = useMemo(() => {
    if (!inspectionChunkRef) return -1;
    return chunks.findIndex((chunk) => chunkRefCandidates(chunk).includes(inspectionChunkRef));
  }, [chunks, inspectionChunkRef]);

  const inspectionChunk = inspectionChunkIndex >= 0 ? chunks[inspectionChunkIndex] : null;
  const inspectionChunkSnippet = inspectionChunk?.evidence || inspectionChunk?.text || null;
  const canInspectPrevious = inspectionChunkIndex > 0;
  const canInspectNext = inspectionChunkIndex >= 0 && inspectionChunkIndex < chunks.length - 1;

  useEffect(() => {
    if (!inspectionChunkRef) return;

    const element = chunkRefs.current[inspectionChunkRef];
    if (!element) return;

    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [inspectionChunkRef, source]);

  if (!source) return null;

  function inspectChunkAt(index: number) {
    const chunk = chunks[index];
    if (!chunk) return;
    const ref = primaryChunkRef(chunk);
    if (!ref) return;
    setInspectionChunkRef(ref);
  }

  return (
    <aside className="wiki-source-preview-drawer" aria-label="Source preview drawer">
      <div className="wiki-source-preview-header">
        <div>
          <span className="wiki-source-preview-ref">[{source.ref}]</span>
          <h3>{source.filename || 'Source preview'}</h3>
          <p>{source.location || 'file-level source reference'}</p>
        </div>
        <button type="button" className="outline" onClick={onClose}>Close</button>
      </div>

      <div className="wiki-source-preview-actions">
        <button type="button" className="outline" onClick={() => onCopyCitation(source.ref)}>Copy citation</button>
        {source.absolute_path ? <button type="button" className="outline" onClick={() => onCopyPath(source.absolute_path)}>Copy path</button> : null}
      </div>

      <section className="wiki-citation-focus wiki-source-preview-focus" aria-label="Source citation focus">
        <div className="wiki-citation-focus-top">
          <span className="wiki-citation-focus-label">Pinned citation</span>
          {normalizedActiveChunkRef ? <span className="wiki-source-preview-focus-pill">[{source.ref}:{normalizedActiveChunkRef}]</span> : null}
        </div>
        <p className="wiki-citation-focus-copy">
          This drawer stays pinned to the citation so you can inspect source evidence without leaving the knowledge page.
        </p>
        <dl className="wiki-citation-focus-meta">
          <div>
            <dt>Source</dt>
            <dd>{source.filename || 'Source preview'}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{source.location || 'file-level source reference'}</dd>
          </div>
          <div>
            <dt>Citation</dt>
            <dd>{normalizedActiveChunkRef ? `[${source.ref}:${normalizedActiveChunkRef}]` : `[${source.ref}]`}</dd>
          </div>
          {normalizedActiveChunkRef ? <div>
            <dt>Chunk</dt>
            <dd>{normalizedActiveChunkRef}</dd>
          </div> : null}
        </dl>
        {activeChunkSnippet ? (
          <div className="wiki-source-preview-snippet">
            <span>Connected source snippet</span>
            <blockquote>{activeChunkSnippet}</blockquote>
          </div>
        ) : null}
      </section>

      {chunks.length ? (
        <section className="wiki-citation-focus" aria-label="Source chunk navigation">
          <div className="wiki-citation-focus-top">
            <span className="wiki-citation-focus-label">Browse source chunks</span>
            {inspectionChunkIndex >= 0 ? (
              <span className="wiki-source-preview-focus-pill">Chunk {inspectionChunkIndex + 1} of {chunks.length}</span>
            ) : null}
          </div>
          <p className="wiki-citation-focus-copy">
            Browse genuine stored chunks from this source. The pinned citation above does not change while you inspect neighboring evidence.
          </p>
          {inspectionChunk ? (
            <dl className="wiki-citation-focus-meta">
              <div>
                <dt>Inspecting</dt>
                <dd>{primaryChunkRef(inspectionChunk) || 'Stored chunk'}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{inspectionChunk.location || `Chunk ${inspectionChunk.chunk_number || inspectionChunkIndex + 1}`}</dd>
              </div>
            </dl>
          ) : null}
          {inspectionChunkSnippet ? (
            <div className="wiki-source-preview-snippet">
              <span>Inspected chunk evidence</span>
              <blockquote>{inspectionChunkSnippet}</blockquote>
            </div>
          ) : null}
          <div className="wiki-source-preview-actions" style={{ marginTop: '0.85rem', marginBottom: 0 }}>
            <button
              type="button"
              className="outline"
              aria-label="Previous chunk"
              disabled={!canInspectPrevious}
              onClick={() => inspectChunkAt(inspectionChunkIndex - 1)}
            >
              Previous chunk
            </button>
            <button
              type="button"
              className="outline"
              aria-label="Next chunk"
              disabled={!canInspectNext}
              onClick={() => inspectChunkAt(inspectionChunkIndex + 1)}
            >
              Next chunk
            </button>
          </div>
        </section>
      ) : null}

      {source.absolute_path ? (
        <div className="wiki-source-preview-path">
          <span>Path</span>
          <code>{source.absolute_path}</code>
        </div>
      ) : null}

      {source.id || source.source_hash ? (
        <div className="wiki-source-preview-path">
          <span>Durable source</span>
          <code>{source.id || source.source_hash}</code>
        </div>
      ) : null}

      {source.evidence ? (
        <section className="wiki-source-preview-section">
          <h4>Evidence</h4>
          <blockquote>{source.evidence}</blockquote>
        </section>
      ) : null}

      <section className="wiki-source-preview-section">
        <div className="wiki-source-preview-section-title-row">
          <h4>Chunks</h4>
          <span>{chunks.length} chunk(s)</span>
        </div>
        {chunks.length ? (
          <div className="wiki-source-preview-chunks">
            {chunks.map((chunk) => {
              const chunkRef = primaryChunkRef(chunk);
              const candidates = chunkRefCandidates(chunk);
              const isActive = Boolean(normalizedActiveChunkRef && candidates.includes(normalizedActiveChunkRef));
              const isInspected = Boolean(inspectionChunkRef && candidates.includes(inspectionChunkRef));
              const meta = chunkMeta(chunk);

              return (
                <article
                  key={chunk.id || chunkRef}
                  className={`wiki-source-preview-chunk${isActive ? ' active' : ''}`}
                  id={`chunk-${chunkRef}`}
                  ref={(el) => {
                    for (const candidate of candidates) {
                      chunkRefs.current[candidate] = el;
                    }
                  }}
                >
                  <div className="wiki-source-preview-chunk-top">
                    <strong>{chunkRef}</strong>
                    <span>{chunk.location || `Chunk ${chunk.chunk_number || ''}`}</span>
                    {isActive ? <span className="wiki-source-preview-active-badge">Active citation</span> : null}
                    {isInspected && !isActive ? <span className="wiki-source-preview-active-badge">Inspecting</span> : null}
                  </div>
                  {meta.length ? <div className="wiki-source-preview-chunk-meta">{meta.map((label) => <span key={label}>{label}</span>)}</div> : null}
                  {chunk.id ? <code className="wiki-source-preview-chunk-id">{chunk.id}</code> : null}
                  {chunk.evidence ? <p>{chunk.evidence}</p> : null}
                  {chunk.text && chunk.text !== chunk.evidence ? <pre>{chunk.text}</pre> : null}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="muted">No chunk-level preview is available for this source yet.</p>
        )}
      </section>
    </aside>
  );
}
