/* eslint-disable @typescript-eslint/no-require-imports -- Node CJS harness transpiles the real TSX modules. */
// Run: pnpm test. happy-dom provides the DOM; application modules are transpiled with the workspace TypeScript compiler.
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
require.extensions['.tsx'] = require.extensions['.ts'] = (module, filename) => {
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env', '({})'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
};
const { Window } = require('happy-dom');
const window = new Window({ url: 'http://localhost/' });
for (const key of [
  'window',
  'document',
  'HTMLElement',
  'KeyboardEvent',
  'MouseEvent',
  'localStorage',
])
  global[key] = key === 'window' ? window : window[key];
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const { renderToStaticMarkup } = require('react-dom/server');
let root;
afterEach(() => {
  if (root) act(() => root.unmount());
  root = undefined;
  document.body.innerHTML = '';
});
function mount(element) {
  const container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(element));
  return container;
}

test('custom field classes preserve shared field styling', () => {
  const { Input, Select, Textarea } = require('./Field.tsx');
  for (const Component of [Input, Select, Textarea]) {
    const html = renderToStaticMarkup(React.createElement(Component, { className: 'w-40' }));
    assert.match(html, /tm-field/);
    assert.match(html, /w-40/);
  }
});

test('buttons do not submit forms unless explicitly requested', () => {
  const { Button } = require('./Button.tsx');
  assert.match(renderToStaticMarkup(React.createElement(Button, null, 'Close')), /type="button"/);
  assert.match(
    renderToStaticMarkup(React.createElement(Button, { type: 'submit' }, 'Save')),
    /type="submit"/,
  );
});

test('dashboard preserves all ten API metrics, including planned, scheduled and bonus', () => {
  const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
  const { DashboardPage } = require('../dashboard/DashboardPage.tsx');
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const overview = {
    range: { from: '2026-11-01T00:00:00Z', to: '2026-11-30T23:59:59Z' },
    activeStudents: 7,
    scheduledLessons: 13,
    completedLessons: 9,
    plannedMinutes: 321,
    actualMinutes: 123,
    bonusMinutes: 42,
    billableMinutes: 165,
    tuitionVnd: 100000,
    collectedVnd: 40000,
    outstandingVnd: 60000,
    upcoming: [],
  };
  client.setQueryData(['reports', 'overview', { preset: 'month' }], overview);
  const html = renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client }, React.createElement(DashboardPage)),
  );
  try {
    for (const label of [
      'Học sinh đang học',
      'Buổi đã lên lịch',
      'Buổi đã hoàn thành',
      'Đã thu học phí',
      'Thời gian dự kiến',
      'Thời gian thực dạy',
      'Giờ thưởng',
      'Thời gian tính phí',
      'Tổng học phí',
      'Học phí còn nợ',
    ])
      assert.ok(html.includes(label), `missing metric: ${label}`);
    for (const value of ['13', '5h 21p', '0h 42p'])
      assert.ok(html.includes(value), `missing API value: ${value}`);
  } finally {
    client.clear();
  }
});

test('custom date ranges reject missing and reversed dates and include the whole local final day', () => {
  assert.ok(
    fs.existsSync(require('node:path').join(__dirname, 'DateRange.tsx')),
    'shared date-range validation is required',
  );
  const { customRange } = require('./DateRange.tsx');
  assert.ok(customRange('', '2026-11-12').error);
  assert.ok(customRange('2026-11-13', '2026-11-12').error);
  assert.ok(customRange('2026-02-31', '2026-03-01').error);
  const result = customRange('2026-11-12', '2026-11-12');
  assert.equal(result.error, undefined);
  assert.equal(new Date(result.params.from).getHours(), 0);
  assert.equal(new Date(result.params.to).getHours(), 23);
  assert.equal(new Date(result.params.to).getMilliseconds(), 999);
});

test('skip link focuses main without replacing the current application route', () => {
  const { SkipLink } = require('../layout/Page.tsx');
  window.location.hash = '#/reports';
  const main = document.createElement('main');
  main.id = 'main';
  main.tabIndex = -1;
  document.body.append(main);
  const container = mount(React.createElement(SkipLink));
  const event = new MouseEvent('click', { bubbles: true, cancelable: true });
  act(() => container.querySelector('a').dispatchEvent(event));
  assert.ok(event.defaultPrevented, 'hash navigation must be prevented');
  assert.ok(document.activeElement === main, 'main receives keyboard focus');
  assert.equal(window.location.hash, '#/reports');
});

test('notifications can be dismissed without waiting for their timeout', () => {
  const { ToastProvider, useToast } = require('../toast.tsx');
  function Trigger() {
    const { push } = useToast();
    return React.createElement('button', { onClick: () => push('Saved') }, 'Notify');
  }
  const container = mount(React.createElement(ToastProvider, null, React.createElement(Trigger)));
  act(() => container.querySelector('button').click());
  const dismiss = document.querySelector('button[aria-label="Đóng thông báo"]');
  assert.ok(dismiss, 'notification needs a dismiss button');
  act(() => dismiss.click());
  assert.equal(document.querySelector('[role="status"]'), null);
});

test('theme stays usable when browser storage is unavailable', () => {
  const { ThemeProvider } = require('../theme.tsx');
  const storage = global.localStorage;
  global.localStorage = {
    getItem: () => {
      throw new Error('Storage denied');
    },
    setItem: () => {
      throw new Error('Storage denied');
    },
  };
  try {
    assert.doesNotThrow(() =>
      mount(React.createElement(ThemeProvider, null, React.createElement('span', null, 'Theme'))),
    );
  } finally {
    global.localStorage = storage;
  }
});

test('dialog contains keyboard focus, restores opener, and keeps input focus after rerender', () => {
  const { Dialog } = require('./Dialog.tsx');
  const trigger = document.createElement('button');
  document.body.append(trigger);
  trigger.focus();
  let closes = 0;
  const element = () =>
    React.createElement(
      Dialog,
      { open: true, title: 'Edit', onClose: () => closes++ },
      React.createElement('input', { 'aria-label': 'Name' }),
    );
  mount(element());
  const input = document.querySelector('input');
  const buttons = document.querySelectorAll('[role="dialog"] button');
  const last = buttons[buttons.length - 1];
  input.focus();
  act(() => root.render(element()));
  assert.ok(document.activeElement === input, 'focus remains on the input');
  last.focus();
  act(() =>
    last.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    ),
  );
  assert.ok(document.activeElement === input, 'focus remains on the input');
  act(() =>
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }),
    ),
  );
  assert.equal(document.activeElement, last);
  act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  assert.equal(closes, 1);
  act(() =>
    root.render(React.createElement(Dialog, { open: false, title: 'Edit', onClose: () => {} })),
  );
  assert.equal(document.activeElement, trigger);
});

test('failed payment and bonus reports show a retryable error, never an empty result', () => {
  const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
  const { ReportsPage } = require('../reports/ReportsPage.tsx');
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, enabled: false, gcTime: Infinity } },
  });
  for (const kind of ['payments', 'bonus'])
    client
      .getQueryCache()
      .build(client, { queryKey: ['reports', kind, { preset: 'month' }] })
      .setState({ status: 'error', error: new Error('Unavailable'), fetchStatus: 'idle' });
  try {
    const container = mount(
      React.createElement(QueryClientProvider, { client }, React.createElement(ReportsPage)),
    );
    for (const label of ['Thanh toán', 'Giờ thưởng']) {
      const button = Array.from(container.querySelectorAll('button')).find(
        (button) => button.textContent === label,
      );
      act(() => button.click());
      assert.ok(container.querySelector('[role="alert"]'), `${label} must show an error`);
      assert.ok(container.textContent.includes('Thử lại'), 'failed report is retryable');
    }
  } finally {
    act(() => root.unmount());
    root = undefined;
    client.clear();
  }
});

test('settings do not claim a successful save for an unconnected integration', () => {
  const { SettingsPage } = require('../pages/pages.tsx');
  const html = renderToStaticMarkup(React.createElement(SettingsPage));
  assert.ok(
    !html.includes('type="submit"'),
    'unimplemented integration must not present a fake save',
  );
  assert.ok(html.includes('Chưa được kết nối'), 'integration availability must be explicit');
});
