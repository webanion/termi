import { Fragment, type ReactNode } from 'react';
import logoMark from '../../assets/logo-mark.svg';
import { closeOverlay, runAction, setGuidePage } from './appStore';
import { GUIDE_PAGES } from './guidePages';
import { parseGuide, type Inline } from './guideMarkdown';
import { HelpKeys } from './HelpKeys';
import { CloseIcon } from './Icons';
import { useAppState } from './useAppState';
import { useModal } from './useModal';

function inlines(parts: Inline[], platform: string): ReactNode {
  return parts.map((part, i) => {
    if (part.kind === 'code') return <code key={i}>{part.text}</code>;
    if (part.kind === 'strong') return <strong key={i}>{part.text}</strong>;
    if (part.kind === 'keys') return <HelpKeys key={i} name={part.name} platform={platform} />;
    return <Fragment key={i}>{part.text}</Fragment>;
  });
}

// The guide: short pages read in order, each with something to try in Termi itself. It opens
// once by itself on the first launch, and from the Help menu at any time.
export function GuideDialog() {
  const open = useAppState((s) => s.overlay === 'guide');
  const pageIndex = useAppState((s) => s.guidePage);
  const platform = useAppState((s) => s.info.platform);
  const ref = useModal(open, { focusSelf: true });

  const index = Math.min(pageIndex, GUIDE_PAGES.length - 1);
  const page = GUIDE_PAGES[index];
  const blocks = page ? parseGuide(page.source) : [];
  const title = blocks.find((b) => b.kind === 'title');
  const last = index === GUIDE_PAGES.length - 1;

  return (
    <dialog
      ref={ref}
      className="dialog help-dialog"
      tabIndex={-1}
      id="guide-dialog"
      aria-labelledby="guide-title"
      onCancel={(event) => {
        event.preventDefault();
        closeOverlay();
      }}
    >
      {open && page && (
        <div className="help-body">
          <div className="dialog-head">
            <img src={logoMark} alt="" className="dialog-logo" />
            <h2 id="guide-title">{title?.kind === 'title' ? title.text : 'Termi'}</h2>
            <span className="help-step">
              {index + 1} of {GUIDE_PAGES.length}
            </span>
            <button className="icon-btn" aria-label="Close the guide" onClick={closeOverlay}>
              <CloseIcon />
            </button>
          </div>
          <div className="guide-text">
            {blocks.map((block, i) => {
              if (block.kind === 'title') return null;
              if (block.kind === 'heading') return <h3 key={i}>{block.text}</h3>;
              if (block.kind === 'paragraph')
                return <p key={i}>{inlines(block.inlines, platform)}</p>;
              return (
                <ul key={i}>
                  {block.items.map((item, j) => (
                    <li key={j}>{inlines(item, platform)}</li>
                  ))}
                </ul>
              );
            })}
          </div>
          <div className="dialog-actions">
            {page.tryIt && (
              <button
                className="btn"
                id="guide-try"
                onClick={() => {
                  const action = page.tryIt?.action;
                  closeOverlay();
                  if (action) runAction(action);
                }}
              >
                {page.tryIt.label}
              </button>
            )}
            <span className="grow" />
            <button className="btn" disabled={index === 0} onClick={() => setGuidePage(index - 1)}>
              Back
            </button>
            <button
              className="btn primary"
              id="guide-next"
              onClick={() => (last ? closeOverlay() : setGuidePage(index + 1))}
            >
              {last ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
