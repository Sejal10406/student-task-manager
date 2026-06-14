# 🪻 Nexus Spring of Code Initiative ⭐

# 🎮 TaskQuest (formerly Student Task Manager)

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/Sejal10406/student-task-manager?style=flat-square)](https://github.com/Sejal10406/student-task-manager/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/Sejal10406/student-task-manager?style=flat-square)](https://github.com/Sejal10406/student-task-manager/network)
[![GitHub issues](https://img.shields.io/github/issues/Sejal10406/student-task-manager?style=flat-square)](https://github.com/Sejal10406/student-task-manager/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/Sejal10406/student-task-manager?style=flat-square)](https://github.com/Sejal10406/student-task-manager/pulls)
[![License](https://img.shields.io/github/license/Sejal10406/student-task-manager?style=flat-square)](./License.md)
[![Contributors](https://img.shields.io/github/contributors/Sejal10406/student-task-manager?style=flat-square)](https://github.com/Sejal10406/student-task-manager/graphs/contributors)
[![Last Commit](https://img.shields.io/github/last-commit/Sejal10406/student-task-manager?style=flat-square)](https://github.com/Sejal10406/student-task-manager/commits/main)
[![CodeQL](https://img.shields.io/github/actions/workflow/status/Sejal10406/student-task-manager/codeql-analysis.yml?style=flat-square&label=CodeQL)](https://github.com/Sejal10406/student-task-manager/actions/workflows/codeql-analysis.yml)
[![Deploy](https://img.shields.io/github/actions/workflow/status/Sejal10406/student-task-manager/deploy.yml?style=flat-square&label=Deploy)](https://github.com/Sejal10406/student-task-manager/actions/workflows/deploy.yml)

**Level up your productivity! A gamified, interactive web application** designed to help students manage their daily tasks with XP, badges, and focus timers.

[🌐 Live Demo](#-live-preview) · [🐛 Report Bug](https://github.com/Sejal10406/student-task-manager/issues) · [✨ Request Feature](https://github.com/Sejal10406/student-task-manager/issues)

</div>

---

## 🚀 Epic Features

| Feature | Description |
|---|---|
| 🎮 **Gamification** | Earn XP, level up, and collect coins by completing tasks |
| 🍅 **Focus Mode** | Built-in Pomodoro timer (25 min study / 5 min break) with Web Worker |
| 🏅 **Achievements** | Unlock badges for streaks and productivity milestones |
| 📊 **Analytics** | View your progress with interactive Chart.js graphs |
| 💾 **Data Export** | Export your tasks to CSV, JSON, PNG, or PDF |
| 👥 **Study Together** | Collaborative study lobbies via BroadcastChannel API |
| 📝 **Revision Notes** | Rich text notes with localStorage persistence |
| 🎯 **Task Prioritization** | Eisenhower matrix with smart sorting |
| 🔗 **Task Dependencies** | Define prerequisites with cycle detection |
| 🔄 **Recurring Tasks** | Daily, weekly, and monthly task repetition |
| 📅 **Calendar View** | Visual calendar with timetable scheduling |
| 🎮 **Study Games** | Interactive games (Word Scramble, Math Blitz) |
| 🏆 **Challenges** | Weekly/monthly challenges with milestone tracking |
| ⚡ **Keyboard Shortcuts** | Power-user shortcuts for common actions |
| 🎨 **Theme Customizer** | Multiple themes (Cosmic, Aurora, Cyberpunk, Sunset) |
| 🔊 **Audio Feedback** | Subtle sound effects for task completion |
| 🔔 **Notifications** | Browser notifications for deadlines and reminders |
| 📱 **PWA Support** | Installable as native app with offline caching |
| 🗂️ **Files Vault** | Store and organize study materials |
| 🎯 **Daily Goals** | Set and track daily productivity goals |
| 🧠 **Flashcards** | Create and review study flashcards |
| 🏃 **Streak Tracking** | Weekly streak grid with visual progression |

---

## 💻 Tech Stack

- **HTML5** — Semantic markup and accessible structure (30+ pages)
- **CSS3** — Glassmorphism, CSS Custom Properties, Animations, Grid/Flexbox
- **Vanilla JavaScript** — Zero framework dependencies (ES2021+)
- **Chart.js & jsPDF** — Client-side analytics and exports
- **Service Worker API** — Offline caching and PWA support
- **BroadcastChannel API** — Cross-tab real-time collaboration
- **Web Audio API** — Subtle sound effects and audio feedback
- **Web Workers** — Pomodoro timer drift correction
- **GitHub Actions** — 20+ CI/CD workflows for quality assurance

---

## 🏛️ System Architecture

TaskQuest is designed as a modular, client-side web application leveraging Vanilla JS:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        UI LAYER (HTML5/CSS3)                        │
│  index.html · pages/*.html · css/style.css · css/collaborative.css  │
└────────────────────────────┬────────────────────────────────────────┘
                             │ DOM events
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      CONTROLLER LAYER (script.js)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────────────┐  │
│  │ tasks.js │  │ tabs.js  │  │ toast.js │  │ badges.js           │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────────────┐  │
│  │ fab.js   │  │ sidebar  │  │ prioriti │  │ analytics.js        │  │
│  │          │  │ toggle   │  │ zation   │  │ correlationEngine   │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  collaborative.js · collab-utils.js · leaderboard.js         │   │
│  │  Challenge.js · Games.js · correlationEngine.js              │   │
│  └──────────────────────────────────────────────────────────────┘   │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ API calls
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       STORAGE LAYER (storage.js)                     │
│  LocalStorage (taskquest_v1.*) · IndexedDB (backup)                  │
│  BroadcastChannel (cross-tab sync) · Service Worker (offline cache)  │
└──────────────────────────────────────────────────────────────────────┘
```

### Key Modules

| Module | Path | Responsibility |
|--------|------|----------------|
| **Controller** | `js/script.js` | Task CRUD, XP, gamification, DOM rendering, event handling |
| **Storage** | `js/storage.js` | LocalStorage + IndexedDB with checksum verification |
| **Analytics** | `js/analytics.js` | Chart.js dashboards, CSV/PNG/PDF export |
| **Badges** | `js/badges.js` | Achievement system with celebration effects |
| **Prioritization** | `js/prioritization.js` | Eisenhower matrix & smart sorting |
| **Tabs** | `js/tabs.js` | Tab switching with lazy initialization |
| **Collaboration** | `js/collaborative.js` | BroadcastChannel-based real-time sync |
| **Toast** | `js/toast.js` | Notification queue with screen-reader support |
| **Games** | `js/Games.js` | Interactive study games |
| **Challenges** | `js/Challenge.js` | Challenge and milestone tracking |
| **Leaderboard** | `js/leaderboard.js` | Rankings and XP leaderboard |
| **FAB** | `js/fab.js` | Floating action button |
| **Sidebar** | `js/sidebar-toggle.js` | Collapsible sidebar |
| **SW** | `sw.js` | Service Worker for offline PWA support |

### Data Flow

```
User Action → DOM Event → script.js handler → storage.js write
                                                    │
                          ┌─────────────────────────┘
                          ▼
                    storage.js read → renderTasks() → DOM update
                                                    │
                          ┌─────────────────────────┘
                          ▼
                    badges.js check → analytics.js update → UI refresh
```

### Cross-Tab Sync

```
Tab A: saveTasks() → localStorage.setItem() → storage event fires
                                                    │
                          ┌─────────────────────────┘
                          ▼
                    Tab B: storage event listener → renderTasks() → sync UI
```

---

## 📁 Project Structure

```
student-task-manager/
│
├── index.html              ← Main gamified dashboard
├── style.css               ← Core design system & glassmorphism
├── script.js               ← Task logic, XP, and local storage
├── manifest.json           ← PWA manifest for installable app
├── sw.js                   ← Service Worker for offline caching
├── robots.txt              ← Search engine crawling rules
├── sitemap.xml             ← XML sitemap for SEO
├── 404.html                ← Custom 404 error page
│
├── css/
│   ├── style.css           ← Design system & all component styles
│   ├── collaborative.css   ← Study Together theme
│   ├── Challenge.css       ← Challenge page styles
│   └── Games.css           ← Games page styles
│
├── js/
│   ├── script.js           ← Core controller & task logic
│   ├── storage.js          ← LocalStorage + IndexedDB with checksums
│   ├── analytics.js        ← Chart.js dashboards & exports
│   ├── badges.js           ← Achievement system
│   ├── tabs.js             ← Tab switching with lazy init
│   ├── toast.js            ← Notification queue system
│   ├── fab.js              ← Floating action button
│   ├── sidebar-toggle.js   ← Collapsible sidebar
│   ├── priorization.js     ← Eisenhower matrix & smart sort
│   ├── collaborative.js    ← BroadcastChannel real-time sync
│   ├── collab-utils.js     ← Shared collaboration helpers
│   ├── leaderboard.js      ← XP leaderboard & rankings
│   ├── Challenge.js        ← Challenge milestones
│   ├── Games.js            ← Interactive study games
│   ├── correlationEngine.js← Study correlation analytics
│
├── pages/
│   ├── notes.html          ← Revision notes with rich text
│   ├── Challenge.html      ← Challenges & milestones
│   ├── leaderboard.html    ← Global rankings and XP
│   ├── focus.html          ← Dedicated Pomodoro mode
│   ├── Reflection.html     ← Reflective journal
│   ├── docs.html           ← Project documentation
│   ├── faq.html            ← Frequently asked questions
│   ├── privacy.html        ← Privacy policy
│   ├── terms.html          ← Terms of service
│   ├── profile.html        ← User profile & Failure Vault
│   ├── Games.html          ← Study games hub
│   ├── Performance.html    ← Performance analytics
│   ├── milestone.html      ← Milestone center
│   ├── report.html         ← Study reports
│   ├── coding.html         ← Coding workspace
│   ├── battle.html         ← Battle mode
│   ├── Tournament.html     ← Tournament mode
│   ├── Spin.html           ← Spin wheel rewards
│   ├── chatbot.html        ← AI study assistant
│   ├── mastery.html        ← Subject mastery tracking
│   ├── journey.html        ← Learning journey
│   ├── velocity.html       ← Velocity metrics
│   ├── history.html        ← Activity history
│   └── achievement.html    ← Achievement showcase
│
├── .github/
│   ├── workflows/          ← GitHub Actions CI/CD (20+ workflows)
│   ├── ISSUE_TEMPLATE/     ← Bug report & feature request forms
│   └── CODEOWNERS          ← Auto-review assignments
│
├── README.md               ← Project overview and setup guide
├── CONTRIBUTING.md         ← How to contribute
├── CHANGELOG.md            ← Version history and release notes
├── CODE_OF_CONDUCT.md      ← Community guidelines
├── Security.md             ← Security policy & reporting
└── License.md              ← MIT License
```

---

## 📱 Live Preview

> 🔗 *(Add your deployed link here after hosting on GitHub Pages or Netlify)*

To host on GitHub Pages:
1. Go to your repository **Settings → Pages**
2. Set **Source** to `main` branch, root `/`
3. Your app will be live at `https://YOUR-USERNAME.github.io/student-task-manager/`

---

## 🚀 Getting Started

### 1️⃣ Fork the Repository

Click the **Fork** button (top-right on GitHub) to create your own copy.

### 2️⃣ Clone Your Fork

```bash
git clone https://github.com/your-username/student-task-manager.git
cd student-task-manager
```

### 3️⃣ Open the Project

```bash
# No build step required — just open the file!
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

### 4️⃣ Verify Environment Setup

We provide a built-in diagnostic checker to verify file integrity, schema versions, and JavaScript syntax:

```bash
node verify-env.js
```

---

## 🤝 How to Contribute

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full contribution guide including commit conventions, coding standards, and PR guidelines.

> ***🧭 Discipline is the bridge between goals and accomplishment***

---

## 💖 Show Your Support

- ⭐ Star this repository
- 🍴 Fork and contribute improvements
- 🐛 Report bugs or issues
- 💬 Share feedback and suggestions

> ***Let's grow this project together and make it better with every update 🚀***

---

## 📝 License

This project is open-source and available under the [MIT License](./License.md).

## 💬 Community
Join our community and help us build a better task manager for students.

---

## 🛠️ Troubleshooting & Setup Guide

If you encounter issues during setup or use, please refer to the cases below:

### 1. LocalStorage Quota Exceeded
* **Symptom:** Saving tasks or sessions fails with warnings or errors.
* **Resolution:** Clear older tasks or clear your browser cache for the site. Alternatively, you can use the **Files Vault** to export your reflections/tasks as `.txt` files to preserve data, and then use the **Clear All** button in the dashboard to free up space.

### 2. Multi-Tab Collaboration (BroadcastChannel) in Incognito Mode
* **Symptom:** Tabs do not sync task updates or chat messages.
* **Explanation:** Most modern browsers restrict the `BroadcastChannel` API inside Private/Incognito browsing sessions for security reasons. To use multi-tab features, run the app in a normal browser window.

### 3. PDF/PNG Export Failures
* **Symptom:** Clicking "Export PDF" or "Export Charts" fails silently or prints warning messages to the console.
* **Resolution:** Ensure all resources (e.g. avatar images, Chart.js libraries) are fully loaded before exporting. If hosting locally, run a lightweight local server (e.g., `npx http-server` or `python -m http.server`) rather than double-clicking the HTML file directly, as browsers restrict some canvas functions for local `file://` protocols.
