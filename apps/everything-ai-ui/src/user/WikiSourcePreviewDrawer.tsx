import { useEffect, useMemo, useRef } from 'react';
import type { WikiSource } from './types';

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

  useEffect(() => {
    if (!normalizedActiveChunkRef) return;

    const element = chunkRefs.current[normalizedActiveChunkRef];
    if (!element) return;

    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [normalizedActiveChunkRef, source]);

  if (!source) return null;

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

      {source.absolute_path ? (
        <div className="wiki-source-preview-path">
          <span>Path</span>
          <code>{source.absolute_path}</code>
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
              const isActive = normalizedActiveChunkRef === chunk.ref;

              return (
                <article
                  key={chunk.ref}
                  className={`wiki-source-preview-chunk${isActive ? ' active' : ''}`}
                  id={`chunk-${chunk.ref}`}
                  ref={(el) => { chunkRefs.current[chunk.ref] = el; }}
                >
                  <div className="wiki-source-preview-chunk-top">
                    <strong>{chunk.ref}</strong>
                    <span>{chunk.location || `Chunk ${chunk.chunk_number || ''}`}</span>
                  </div>
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
