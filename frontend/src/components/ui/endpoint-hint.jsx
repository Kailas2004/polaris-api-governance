import React from 'react';

const EndpointHint = ({ method, path, detail }) => {
  const ariaLabel = `${method} ${path}${detail ? ` (${detail})` : ''}`;
  return (
    <span className="endpoint-hint" tabIndex={0} aria-label={ariaLabel}>
      <span className="endpoint-pill">Endpoint</span>
      <span className="endpoint-tooltip">
        <strong>{method}</strong>
        <span>{path}</span>
        {detail ? <span className="endpoint-detail">{detail}</span> : null}
      </span>
    </span>
  );
};

export default EndpointHint;
