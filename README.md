# Skill Tree

An offline skill tree and weekly planner. It shows branching roadmaps for exams and engineering skills, tracks progress as a percentage, and lets you plan each week from the roadmap steps.

## How to use it

Open `index.html` in a browser (double-click it). That is all. There is nothing to install, no build step, and it never goes online.

- **Overview** shows your current focus, today's tasks, every roadmap with its percentage, and what to do next.
- **A roadmap** (left sidebar) is a map of steps. A step unlocks when the steps above it are finished. Click a step to see what to do, where to learn it (books, websites, courses), and to tick tasks off. You can add your own tasks, sources, notes and extra steps to any step.
- **Weekly plan** has one column per day. Add, rename, move and remove tasks. The panel on the right suggests the next tasks from your roadmaps; ticking a task there also ticks it in the roadmap.
- **Timeline** holds intensive study blocks (for example four weeks of GRE). Each block tells you how many hours a week you need to finish that roadmap by its end date.

## Roadmaps included

| Group | Roadmap |
| --- | --- |
| Exams | GRE General Test, IELTS Academic, German for university (TestDaF or DSH) |
| Research | Academic research |
| Engineering | Electronics, PCB design, Computer engineering (hardware and software), Defense industry engineering, Embedded audio firmware, Digital hardware (FPGA and ASIC) |

The last two are ordered software-first: every step that can be done with simulators and free tools comes first, and steps that need a purchased board are on a separate "Needs hardware" branch at the end.

## Your data

Progress, tasks and notes are saved in the browser's local storage on your computer. Clearing the browser's site data erases them, and a different browser will not see them. Use **Backup and data** in the sidebar to download a backup file, and to restore it later or on another computer.

Links to websites need an internet connection when you click them. Everything else works offline.

## Changing the roadmaps

Each roadmap is one plain file in `js/data/`. A step looks like this:

```js
{ id: 'gre-format', title: 'Know the test', branch: 'plan', hours: 3, start: true,
  requires: [],                       // ids of the steps that must be finished first
  about: 'What this step is and why it matters.',
  tasks: ['First thing to do', 'Second thing to do'],
  resources: [['book', 'Title', 'Author or note', 'https://optional-link']] }
```

Resource types are `book`, `site`, `course`, `video`, `tool` and `practice`. Ticks are stored against the task text, so rewording a task clears its tick.

## Development

No dependencies. With Node.js 20 or later:

```
npm test                        # logic and roadmap data checks
node tests/browser-check.js     # optional end-to-end check; needs Playwright installed
```

Code layout: `js/core` is logic with no browser dependencies (progress, layout, saved state), `js/data` is roadmap content, `js/ui` draws the screens.
