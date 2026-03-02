import React from 'react';

export const Button = ({ variant = 'default', className = '', ...props }) => {
  const classes = ['ui-button', `ui-button--${variant}`, className].filter(Boolean).join(' ');
  return <button {...props} className={classes} />;
};
