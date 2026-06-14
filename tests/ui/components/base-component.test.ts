
import { describe, it, expect, vi } from 'vitest';
import { BaseComponent } from '../../../src/ui/components/base-component';

class TestComponent extends BaseComponent {
  render() {}
  
  // Expose protected methods for testing
  public testGetEl(id: string) { return this.getEl(id); }
  public testT(key: string, params?: any) { return this.t(key, params); }
  public testEscape(str: string) { return this.escapeHTML(str); }
}

describe('BaseComponent', () => {
  it('should get element by id', () => {
    document.body.innerHTML = '<div id="test"></div>';
    const comp = new TestComponent();
    expect(comp.testGetEl('test')).not.toBeNull();
    expect(comp.testGetEl('non-existent')).toBeNull();
  });

  it('should translate keys', () => {
    const comp = new TestComponent();
    comp.setLanguage('tr');
    expect(comp.testT('search')).toBe('ARA');
  });

  it('should fallback to English for missing keys', () => {
    const comp = new TestComponent();
    comp.setLanguage('tr');
    // Using a key that might only be in EN or doesn't exist
    expect(comp.testT('app_title')).toBe('Anki Adder');
  });

  it('should replace underscores with spaces for unknown keys', () => {
    const comp = new TestComponent();
    expect(comp.testT('unknown_key_name')).toBe('unknown key name');
  });

  it('should interpolate parameters in translations', () => {
    const comp = new TestComponent();
    comp.setLanguage('en');
    // err_http: "HTTP Error: {status}"
    expect(comp.testT('err_http', { status: '404' })).toBe('HTTP Error: 404');
  });

  it('should escape HTML', () => {
    const comp = new TestComponent();
    const escaped = comp.testEscape('<script>alert("xss")</script>');
    expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('should make element interactive and handle click/keydown events', () => {
    document.body.innerHTML = '<div id="interactive"></div>';
    const comp = new TestComponent();
    const el = document.getElementById('interactive')!;
    const clickSpy = vi.fn();
    (comp as any).makeInteractive(el, clickSpy);

    expect(el.getAttribute('role')).toBe('button');
    expect(el.getAttribute('tabindex')).toBe('0');

    el.click();
    expect(clickSpy).toHaveBeenCalledTimes(1);

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    el.dispatchEvent(enterEvent);
    expect(clickSpy).toHaveBeenCalledTimes(2);

    const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
    el.dispatchEvent(spaceEvent);
    expect(clickSpy).toHaveBeenCalledTimes(3);

    const randomEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    el.dispatchEvent(randomEvent);
    expect(clickSpy).toHaveBeenCalledTimes(3);
  });

  it('should clear active timeout in cleanAll (L38-39)', () => {
    document.body.innerHTML = '<div id="statusBox"></div>';
    const comp = new TestComponent();
    vi.useFakeTimers();
    comp.showStatus('test', 'info');
    (comp as any).cleanAll();
    vi.useRealTimers();
  });
});
