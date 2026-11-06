import React from 'react';
import { ArrowLeft } from 'lucide-react';

/**
 * The one header every screen uses: optional back button on the left, the
 * page title, and an optional action (button/element) on the right.
 * Tab screens (Today, Cats, Vet, More) pass no onBack.
 */
export function PageHeader({ title, subtitle, onBack, action, onTitleTap }) {
  return (
    <header className="pageHeader">
      {onBack ? (
        <button type="button" className="pageHeaderBack" onClick={onBack} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
      ) : (
        <span className="pageHeaderSpacer" />
      )}
      <div className="pageHeaderTitle" onClick={onTitleTap}>
        <h1>{title}</h1>
        {subtitle && <small>{subtitle}</small>}
      </div>
      <div className="pageHeaderAction">{action || null}</div>
    </header>
  );
}
