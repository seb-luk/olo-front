import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Meta } from './meta.js';

describe('Meta', () => {
  let meta;
  
  beforeEach(() => {
    meta = new Meta();
    document.head.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize and get current URL', () => {
    const url = meta.getCurrentURL();
    expect(url.pathname).toBeDefined();
    expect(url.hostname).toBeDefined();
  });

  it('should get origin and href URL segments', () => {
    expect(meta.getURLSegment('origin')).toContain('http://');
    expect(meta.getURLSegment('href')).toContain('http://');
  });

  it('should update meta tags', () => {
    meta.updateMetaData({
      title: 'New Title',
      description: 'New Desc',
      author: 'Tester',
      canonicalUrl: 'http://test.com',
      language: 'en'
    });
    
    expect(document.head.querySelector('title').textContent).toBe('New Title');
    expect(document.head.querySelector('meta[name="description"]').getAttribute('content')).toBe('New Desc');
    expect(document.head.querySelector('link[rel="canonical"]').getAttribute('href')).toBe('http://test.com');
    expect(document.head.querySelector('meta[http-equiv="content-language"]').getAttribute('content')).toBe('en');

    // Update again to cover existing tags
    meta.updateMetaData({ title: 'Another Title' });
    expect(document.head.querySelector('title').textContent).toBe('Another Title');

    // Remove tags
    meta.updateMetaData({ description: undefined });
    expect(document.head.querySelector('meta[name="description"]')).toBeNull();
  });

  it('should extract metadata from html', () => {
    const div = document.createElement('div');
    div.innerHTML = `
      <title>Extracted Title</title>
      <meta name="description" content="Extracted Desc">
      <link rel="canonical" href="http://extract.com">
      <meta property="og:type" content="article">
      <meta name="unknown" content="skip">
    `;
    
    const extracted = meta.extractMetaData(div);
    expect(extracted.title).toBe('Extracted Title');
    expect(extracted.description).toBe('Extracted Desc');
    expect(extracted.canonicalUrl).toBe('http://extract.com');
    expect(extracted.type).toBe('article');
    
    // Empty extraction
    expect(meta.extractMetaData(null)).toEqual({});
  });

  it('should check isRootPage', () => {
    const div = document.createElement('div');
    div.innerHTML = '<meta name="root" content="true">';
    expect(meta.isRootPage(div)).toBe(true);
    
    div.innerHTML = '';
    expect(meta.isRootPage(div)).toBe(false);
  });

  it('should update current URL and push state', () => {
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
    meta.updateCurrentURL({ pathname: '/new-path' });
    expect(pushStateSpy).toHaveBeenCalled();
  });

  it('should catch error in updateCurrentURL with external origin', () => {
    const assignSpy = vi.spyOn(window.location, 'assign').mockImplementation(() => {});
    
    // Try to update with an external URL to trigger the origin check / catch
    meta.updateCurrentURL({ protocol: 'https:', hostname: 'external.com', pathname: '/' });
    expect(assignSpy).toHaveBeenCalled();
  });
});
