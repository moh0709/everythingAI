import type { WikiSource } from './types';

type WikiSourcePreviewDrawerProps = {
  source: WikiSource | null;
  onClose: () => void;
  onCopyCitation: (ref?: string | null) => void;
  onCopyPath: (path?: string | null) => void;
};

export function WikiSourcePreviewDrawer({
  source,
  onClose,
  onCopyCitation,
  onCopyPath,
}: WikiSourcePreviewDrawerProps) {
  if (!source) return null;

  const chunks = source.chunks || [];

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
        <h4>Chunks</h4>
        {chunks.length ? (
          <div className="wiki-source-preview-chunks">
            {chunks.map((chunk) => (
              <article key={chunk.ref} className="wiki-source-preview-chunk" id={`chunk-${chunk.ref}`}>
                <div className="wiki-source-preview-chunk-top">
                  <strong>{chunk.ref}</strong>
                  <span>{chunk.location || `Chunk ${chunk.chunk_number || ''}`}</span>
                </div>
                {chunk.evidence ? <p>{chunk.evidence}</p> : null}
                {chunk.text && chunk.text !== chunk.evidence ? <pre>{chunk.text}</pre> : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">No chunk-level preview is available for this source yet.</p>
        )}
      </section>
    </aside>
  );
}
