'use client';

import { useState } from 'react';
import { css } from './style';

// Element that supports a hover style (CSS string), since React style objects
// can't express :hover. Use `as` to pick the tag (div / button / a ...).
export function Hov({ as = 'div', s, hover, children, style, ...rest }) {
  const [h, setH] = useState(false);
  const Tag = as;
  return (
    <Tag
      style={{ ...css(s), ...style, ...(h && hover ? css(hover) : {}) }}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// Render a raw inline-SVG (or any HTML) string, so we can keep the original
// kebab-cased SVG markup verbatim instead of hand-converting every attribute.
export function Raw({ html, style, className }) {
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', ...style }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
