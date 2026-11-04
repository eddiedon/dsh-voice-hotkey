/**
 * Voice-input shortcut.
 *
 * The shipped voice-input plugin registers no keyboard command, so this bundle
 * adds one: an editable DSH shortcut that presses the same microphone control a
 * pointer would press in the composer. Recording, transcription and draft
 * insertion stay inside that plugin; this file only owns the key.
 *
 * Locating the control: the voice row carries `data-voice-activity` while a
 * capture or result is shown, which is stable. The idle microphone button has no
 * such hook, so it is located by its trigger wrapper class first and by the
 * plugin's own aria-label (read live from its `voice-input` locale namespace)
 * second.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-voice-hotkey',
  factory() {
    /** Locale namespace this bundle contributes. */
    const NS = 'voice-hotkey';

    /** Chinese dictionary (key-set source). */
    const zh = {
      label: '语音输入：开始或停止录音',
      unavailable: '语音输入不可用：没有找到麦克风控件',
      busy: '语音输入正在处理中',
    };

    /** English dictionary with the same key set. */
    const en = {
      label: 'Voice input: start or stop recording',
      unavailable: 'Voice input is unavailable: no microphone control was found',
      busy: 'Voice input is busy',
    };

    /**
     * Last-resort labels for the shipped controls. The live `voice-input`
     * namespace is consulted first, so these literals only matter if that plugin
     * renames its namespace or changes its CSS class names.
     */
    const START_LABELS = new Set(['开始录音', 'Start recording']);
    const STOP_LABELS = new Set(['停止并识别', 'Stop and transcribe']);
    const RETRY_LABELS = new Set(['重新录音', 'Record again']);

    /** The composer's capture/result row; absent while the microphone button is idle. */
    function voiceRow() {
      return document.querySelector('[data-voice-activity]');
    }

    /** Whether one button carries the expected aria-label. */
    function hasLabel(button, live, fallback) {
      const label = button.getAttribute('aria-label');
      if (label === null) return false;
      return label === live || fallback.has(label);
    }

    /** The last matching button inside a container, or null. */
    function lastMatching(root, live, fallback) {
      const buttons = root.querySelectorAll('button');
      for (let index = buttons.length - 1; index >= 0; index -= 1) {
        if (hasLabel(buttons[index], live, fallback)) return buttons[index];
      }
      return null;
    }

    /** The idle microphone button in the composer. */
    function triggerButton(live) {
      const anchored = document.querySelector('[class*="triggerAnchor"] button');
      if (anchored !== null) return anchored;
      for (const button of document.querySelectorAll('button[aria-label]')) {
        if (hasLabel(button, live, START_LABELS)) return button;
      }
      return null;
    }

    /**
     * Resolve the keypress into the control it should press.
     * @param t - this bundle's translate function.
     * @param tVoice - the voice-input plugin's translate function, for label matching.
     * @returns shortcut resolution: handled with the click, blocked with a reason, or pass.
     */
    function resolveShortcut(t, tVoice) {
      if (typeof document === 'undefined') return { status: 'pass' };
      const liveStart = tVoice('start');
      const row = voiceRow();
      if (row !== null) {
        const phase = row.getAttribute('data-voice-activity');
        if (phase === 'recording') {
          const stop = lastMatching(row, tVoice('stop'), STOP_LABELS);
          return stop === null
            ? { status: 'blocked', reason: t('unavailable') }
            : { status: 'handled', run: () => stop.click() };
        }
        if (phase === 'feedback') {
          const retry = lastMatching(row, tVoice('retryRecording'), RETRY_LABELS);
          if (retry !== null) return { status: 'handled', run: () => retry.click() };
        }
        return { status: 'blocked', reason: t('busy') };
      }
      const trigger = triggerButton(liveStart);
      if (trigger === null) return { status: 'blocked', reason: t('unavailable') };
      if (trigger.disabled === true) return { status: 'blocked', reason: t('busy') };
      return { status: 'handled', run: () => trigger.click() };
    }

    /** Client plugin body: dictionaries plus one editable shortcut command. */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'voice-hotkey: dictionaries');
      const t = ctx.locale.bind(NS);
      const tVoice = ctx.locale.bind('voice-input');
      ctx.effect(() => ctx.shortcuts.register({
        id: 'voice.input.record',
        label: () => t('label'),
        aliases: ['voice input', 'dictate', 'record', '语音输入', '听写', '录音'],
        defaults: {
          'web:windows': { code: 'KeyV', modifiers: ['primary', 'alt'] },
          'web:linux': { code: 'Comma', modifiers: ['primary', 'shift'] },
          'web:macos': { code: 'KeyV', modifiers: ['primary', 'shift'] },
        },
        regions: ['page', 'editable'],
        modals: [],
        resolve: () => resolveShortcut(t, tVoice),
      }), 'voice-hotkey: shortcut');
    }

    return { inject: ['shortcuts', 'locale'], apply };
  },
});
