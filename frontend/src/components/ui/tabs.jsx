import React from 'react';
import { Button } from './button';

const toIdPart = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-');

export const getTabId = (idPrefix, item) => `${idPrefix}-tab-${toIdPart(item)}`;
export const getPanelId = (idPrefix, item) => `${idPrefix}-panel-${toIdPart(item)}`;

export const Tabs = ({ items, value, onChange, ariaLabel, idPrefix = 'tabs' }) => {
  const onKeyDown = (event) => {
    const currentIndex = items.findIndex((item) => item === value);
    if (currentIndex < 0) {
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      onChange(items[(currentIndex + 1) % items.length]);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onChange(items[(currentIndex - 1 + items.length) % items.length]);
    } else if (event.key === 'Home') {
      event.preventDefault();
      onChange(items[0]);
    } else if (event.key === 'End') {
      event.preventDefault();
      onChange(items[items.length - 1]);
    }
  };

  return (
    <div className="ui-tabs" role="tablist" aria-label={ariaLabel}>
      {items.map((item) => (
        <Button
          key={item}
          type="button"
          variant={value === item ? 'tab-active' : 'tab'}
          id={getTabId(idPrefix, item)}
          role="tab"
          aria-controls={getPanelId(idPrefix, item)}
          aria-selected={value === item}
          tabIndex={value === item ? 0 : -1}
          onKeyDown={onKeyDown}
          onClick={() => onChange(item)}
        >
          {item}
        </Button>
      ))}
    </div>
  );
};
