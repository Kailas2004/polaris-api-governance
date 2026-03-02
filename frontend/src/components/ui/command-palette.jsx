import React, { useEffect, useMemo, useRef, useState } from 'react';

const normalize = (value) => value.toLowerCase();

const CommandPalette = ({ open, onClose, actions }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const filteredActions = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) {
      return actions;
    }
    return actions.filter((action) => normalize(`${action.label} ${action.description || ''}`).includes(q));
  }, [actions, query]);

  useEffect(() => {
    if (activeIndex >= filteredActions.length) {
      setActiveIndex(Math.max(0, filteredActions.length - 1));
    }
  }, [activeIndex, filteredActions.length]);

  if (!open) {
    return null;
  }

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      onClose();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => (filteredActions.length ? (prev + 1) % filteredActions.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => (filteredActions.length ? (prev - 1 + filteredActions.length) % filteredActions.length : 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      filteredActions[activeIndex]?.run();
      onClose();
    }
  };

  return (
    <div className="command-overlay" role="presentation" onClick={onClose}>
      <section className="command-palette" role="dialog" aria-label="Command palette" onClick={(event) => event.stopPropagation()}>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search commands..."
          className="command-input"
        />
        <div className="command-results">
          {filteredActions.length === 0 && <p className="command-empty">No matching actions.</p>}
          {filteredActions.map((action, index) => (
            <button
              key={action.id}
              type="button"
              className={`command-item ${index === activeIndex ? 'is-active' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => {
                action.run();
                onClose();
              }}
            >
              <span className="command-label">{action.label}</span>
              {action.description && <span className="command-description">{action.description}</span>}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default CommandPalette;
