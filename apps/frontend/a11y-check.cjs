const fs = require('node:fs');
const path = require('node:path');

const src = path.join(__dirname, 'src');
const read = (p) => fs.readFileSync(path.join(src, p), 'utf8');

let failures = 0;
function check(name, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}`);
  if (!cond) failures += 1;
}

const app = read('App.tsx');
const sidebar = read('layout/Sidebar.tsx');
const header = read('layout/Header.tsx');
const page = read('layout/Page.tsx');
const dialog = read('components/Dialog.tsx');
const toast = read('toast.tsx');
const css = read('index.css');
const pages = read('pages/pages.tsx');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const distHtml = fs.readFileSync(path.join(__dirname, 'dist', 'index.html'), 'utf8');

const expectedRoutes = ['dashboard', 'students', 'calendar', 'hours', 'tuition', 'reports', 'settings'];
const pageSources = {
  students: read('students/StudentsPage.tsx'),
  calendar: read('calendar/CalendarPage.tsx'),
  hours: read('hours/HoursPage.tsx'),
  tuition: read('tuition/TuitionPage.tsx'),
};
for (const r of expectedRoutes) {
  const src = pageSources[r] ?? pages;
  check(`route renders: ${r}`, app.includes(`route === '${r}'`) && src.includes(`export function ${r[0].toUpperCase()}${r.slice(1)}Page`));
}
check('html lang="vi"', html.includes('lang="vi"') && distHtml.includes('lang="vi"'));
check('skip link', page.includes('SkipLink') && app.includes('<SkipLink') && page.includes('href="#main"'));
check('main landmark with id', app.includes('id="main"'));
check('nav aria-label', sidebar.includes('aria-label'));
check('aria-current on active', sidebar.includes('aria-current') && app.includes('aria-current'));
check('dialog role + aria-modal + esc', dialog.includes('role="dialog"') && dialog.includes('aria-modal') && dialog.includes('Escape'));
check('toast aria-live', toast.includes('aria-live'));
check('alert role in error boundary', read('components/ErrorBoundary.tsx').includes('role="alert"'));
check('focus-visible styles', css.includes(':focus-visible'));
check('labels tied to inputs', read('students/StudentForm.tsx').includes('htmlFor="stu-name"') && read('students/StudentForm.tsx').includes('id="stu-name"'));
check('icon-only button has label', header.includes('aria-label={vi.theme}'));
check('decorative icons hidden', sidebar.includes('aria-hidden'));
check('responsive: sidebar collapses + mobile nav', app.includes('hidden w-60') && app.includes('sm:hidden'));
check('responsive: grid breakpoints', pages.includes('sm:grid-cols-2') && pages.includes('xl:grid-cols-4'));
check('dark theme toggle + classes', header.includes('useTheme') && css.includes('dark:'));
check('no console.log in src', !/\bconsole\.(log|error|warn)\b/.test(app + sidebar + header + pages + read('students/StudentsPage.tsx') + read('calendar/CalendarPage.tsx') + read('hours/HoursPage.tsx') + read('tuition/TuitionPage.tsx')));

process.exit(failures === 0 ? 0 : 1);
