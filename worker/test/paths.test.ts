import { describe, expect, it } from 'vitest';
import { cacheClass, resolvePath } from '../src/paths';

describe('resolvePath', () => {
  it('maps the root to index.html', () => {
    expect(resolvePath('/')).toEqual({ kind: 'object', key: 'index.html' });
  });

  it('maps a trailing-slash path to its index.html', () => {
    expect(resolvePath('/de/')).toEqual({ kind: 'object', key: 'de/index.html' });
    expect(resolvePath('/work/case-study/')).toEqual({
      kind: 'object',
      key: 'work/case-study/index.html',
    });
  });

  it('keeps file paths as they are', () => {
    expect(resolvePath('/_astro/app.abc123.css')).toEqual({
      kind: 'object',
      key: '_astro/app.abc123.css',
    });
    expect(resolvePath('/404.html')).toEqual({ kind: 'object', key: '404.html' });
  });

  it('asks for a redirect check on extensionless paths without a slash', () => {
    expect(resolvePath('/de')).toEqual({
      kind: 'directory',
      key: 'de/index.html',
      location: '/de/',
    });
  });

  it.each(['/a/../b', '/%2e%2e/secret', '/a//b', '//', '/a/%2e/b', '/a%5cb', '/%00', '/%E0%A4%A'])(
    'rejects %s',
    (path) => {
      expect(resolvePath(path)).toEqual({ kind: 'invalid' });
    },
  );
});

describe('cacheClass', () => {
  it('classifies keys', () => {
    expect(cacheClass('_astro/app.abc.js')).toBe('immutable');
    expect(cacheClass('fonts/inter.woff2')).toBe('static');
    expect(cacheClass('cv/cv.pdf')).toBe('static');
    expect(cacheClass('index.html')).toBe('html');
    expect(cacheClass('robots.txt')).toBe('html');
  });
});
