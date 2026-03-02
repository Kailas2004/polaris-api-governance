import React from 'react';

export const Card = ({ className = '', ...props }) => {
  const classes = ['ui-card', className].filter(Boolean).join(' ');
  return <section {...props} className={classes} />;
};

export const CardHeader = ({ className = '', ...props }) => {
  const classes = ['ui-card-header', className].filter(Boolean).join(' ');
  return <div {...props} className={classes} />;
};

export const CardTitle = ({ className = '', ...props }) => {
  const classes = ['ui-card-title', className].filter(Boolean).join(' ');
  return <h3 {...props} className={classes} />;
};

export const CardDescription = ({ className = '', ...props }) => {
  const classes = ['ui-card-description', className].filter(Boolean).join(' ');
  return <p {...props} className={classes} />;
};

export const CardContent = ({ className = '', ...props }) => {
  const classes = ['ui-card-content', className].filter(Boolean).join(' ');
  return <div {...props} className={classes} />;
};
