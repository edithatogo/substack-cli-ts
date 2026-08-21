// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { captureSettingsDiagnostics } from './diagnostics.js';
import * as localBrowser from './local-browser.js';

describe('captureSettingsDiagnostics', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    document.title = '';

    // reset location.href for test
    const oldLocation = window.location;
    delete (window as any).location;
    window.location = { ...oldLocation, href: 'https://example.com/settings' } as any;
  });

  it('should capture settings diagnostics from evaluated DOM', async () => {
    const mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockImplementation(async (fn) => {
        return fn();
      }),
    };

    const mockBrowser = {
      page: mockPage,
      close: vi.fn().mockResolvedValue(undefined),
    };

    vi.spyOn(localBrowser, 'createLocalBrowserSession').mockResolvedValue(mockBrowser as any);

    // Provide content > 200 chars to pass the loaded check
    document.body.innerHTML = `${'a'.repeat(250)}
      <section class="settings-section">
        <h2>General Settings</h2>
        <form action="/api/settings">
          <input name="email" type="email" />
          <select name="timezone">
            <option>UTC</option>
          </select>
        </form>
        <button class="btn" id="save-btn" data-testid="save-button">Save Changes</button>
      </section>

      <section>
        <legend>Advanced</legend>
        <textarea name="bio"></textarea>
        <a class="button" href="#">Delete</a>
      </section>
    `;
    document.title = 'Publication Settings';

    const result = await captureSettingsDiagnostics('https://example.com');

    expect(result).toBeDefined();

    // Check form extraction
    expect(result.forms).toHaveLength(1);
    expect(result.forms[0].action).toBe('/api/settings');
    expect(result.forms[0].fields).toContain('email');
    expect(result.forms[0].fields).toContain('timezone');

    // Check buttons extraction
    expect(result.buttons).toHaveLength(2);
    expect(result.buttons.find((b) => b.text === 'Save Changes')).toMatchObject({
      selector: "button#save-btn"
    });
    expect(result.buttons.find((b) => b.text === 'Delete')).toMatchObject({
      selector: "a.button"
    });

    // Check sections extraction
    expect(result.sections).toHaveLength(2);
    expect(result.sections.find(s => s.heading === 'General Settings')?.fields).toEqual(['email', 'timezone']);
    expect(result.sections.find(s => s.heading === 'Advanced')?.fields).toEqual(['bio']);
  });

  it('should fallback to reading url if no pattern is loaded', async () => {
    const mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockImplementation(async (fn) => {
        // Here we simulate the page loading failing by returning short text content
        const result = fn();
        if (typeof result === 'boolean') {
          return false; // For the 'loaded' check
        }
        return result;
      }),
    };

    const mockBrowser = {
      page: mockPage,
      close: vi.fn().mockResolvedValue(undefined),
    };

    vi.spyOn(localBrowser, 'createLocalBrowserSession').mockResolvedValue(mockBrowser as any);

    // Mock an unloaded page (too short content)
    document.body.innerHTML = '<p>Too short</p>';
    window.location = { ...window.location, href: 'https://example.com/other' } as any;

    const result = await captureSettingsDiagnostics('https://example.com');

    expect(result.url).toBe('https://example.com/other');
  });

  it('should handle 404 pages in loaded check', async () => {
    const mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockImplementation(async (fn) => {
        return fn();
      }),
    };

    const mockBrowser = {
      page: mockPage,
      close: vi.fn().mockResolvedValue(undefined),
    };

    vi.spyOn(localBrowser, 'createLocalBrowserSession').mockResolvedValue(mockBrowser as any);

    document.body.innerHTML = 'a'.repeat(250);
    document.title = 'Page Not Found';

    const result = await captureSettingsDiagnostics('https://example.com');

    // Result won't match a pattern because of the 404 title, so it falls back to current location
    expect(result.url).toBe('https://example.com/settings');
  });
});
