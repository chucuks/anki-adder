import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsView } from '../../../../src/ui/components/views/settings-view';
import { AppSettings } from '../../../../src/domain/entities';

describe('SettingsView', () => {
  let view: SettingsView;
  const mockSettings: AppSettings = {
    theme: 'dracula',
    font: 'roboto',
    fontSize: 18,
    language: 'tr',
    showIdioms: true,
    audioMode: 'native',
    autoSearchEnabled: false,
    autoSearchDelay: 1000,
    frontSideMode: 'example',
    allTags: [],
    tagGroups: [],
    deckTags: {},
    autoPosTagging: false,
    hideSingularTags: false,
    deckTagGroupHistory: {},
    hideExistingResults: false,
    autoSearchDelayUnit: 'ms'
  };

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="settingsOverlay"></div>
      <div class="theme-opt" data-theme="dracula"></div>
      <div class="theme-opt" data-theme="standard"></div>
      <select id="fontSelect">
        <option value="roboto">Roboto</option>
        <option value="outfit">Outfit</option>
      </select>
      <input id="fontSizeInput" value="16" />
      <select id="langSelect">
        <option value="tr">TR</option>
        <option value="en">EN</option>
      </select>
      <input id="showIdiomsSwitch" type="checkbox" />
      <select id="audioModeSelect"></select>
      <select id="frontSideSelect"></select>
      <input id="autoSearchSwitch" type="checkbox" />
      <input id="autoSearchDelayInput" value="1000" />
      <input id="hideSingularTagsSwitch" type="checkbox" />
      <input id="autoPosTaggingSwitch" type="checkbox" />
      <button id="decreaseFont"></button>
      <button id="increaseFont"></button>
    `;
    view = new SettingsView();
  });

  it('should toggle overlay', () => {
    view.toggleOverlay(true);
    expect(document.getElementById('settingsOverlay')!.classList.contains('open')).toBe(true);
    expect(document.body.classList.contains('no-scroll')).toBe(true);

    view.toggleOverlay(false);
    expect(document.getElementById('settingsOverlay')!.classList.contains('open')).toBe(false);
  });

  it('should update UI based on settings', () => {
    view.updateSettingsUI(mockSettings);
    expect(document.documentElement.style.getPropertyValue('--font-size-base')).toBe('');
    expect((document.getElementById('fontSizeInput') as HTMLInputElement).value).toBe('18');
  });

  it('should handle setting changes', () => {
    const spy = vi.fn();
    view.onSettingChange = spy;
    view.render();

    const langSelect = document.getElementById('langSelect') as HTMLSelectElement;
    langSelect.value = 'en';
    langSelect.dispatchEvent(new Event('change'));
    expect(spy).toHaveBeenCalledWith('language', 'en');

    const themeOpt = document.querySelector('.theme-opt[data-theme="dracula"]') as HTMLElement;
    themeOpt.click();
    expect(spy).toHaveBeenCalledWith('theme', 'dracula');
  });

  it('should handle font size buttons', () => {
    const spy = vi.fn();
    view.onSettingChange = spy;
    view.render();

    (document.getElementById('increaseFont') as HTMLElement).click();
    expect(spy).toHaveBeenCalledWith('fontSize', 17);

    (document.getElementById('decreaseFont') as HTMLElement).click();
    expect(spy).toHaveBeenCalledWith('fontSize', 15);
  });
});
