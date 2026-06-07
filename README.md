# 🪻 Nexus Spring of Code Initiative ⭐

# 🎮 TaskQuest (formerly Student Task Manager)

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/Sejal10406/student-task-manager?style=flat-square)](https://github.com/Sejal10406/student-task-manager/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/Sejal10406/student-task-manager?style=flat-square)](https://github.com/Sejal10406/student-task-manager/network)
[![GitHub issues](https://img.shields.io/github/issues/Sejal10406/student-task-manager?style=flat-square)](https://github.com/Sejal10406/student-task-manager/issues)
[![License](https://img.shields.io/github/license/Sejal10406/student-task-manager?style=flat-square)](./License.md)

**Level up your productivity! A gamified, interactive web application** designed to help students manage their daily tasks with XP, badges, and focus timers.

[🌐 Live Demo](#-live-preview) · [🐛 Report Bug](https://github.com/Sejal10406/student-task-manager/issues) · [✨ Request Feature](https://github.com/Sejal10406/student-task-manager/issues)

</div>

---

## 🚀 Epic Features

| Feature | Description |
|---|---|
| 🎮 **Gamification** | Earn XP, level up, and collect coins by completing tasks |
| 🍅 **Focus Mode** | Built-in Pomodoro timer (25 min study / 5 min break) |
| 🏅 **Achievements** | Unlock badges for streaks and productivity milestones |
| 📊 **Analytics** | View your progress with interactive Chart.js graphs |
| 💾 **Data Export** | Export your tasks to CSV, PNG, or PDF |
| 👥 **Study Together** | Collaborative study lobbies (coming soon) |
| 🎵 **Audio Feedback** | Subtle sound effects for task completion |
| 🎨 **Glassmorphism** | Stunning translucent UI with dynamic backgrounds |

---

## 💻 Tech Stack

- **HTML5** — Semantic markup and accessible structure
- **CSS3** — Glassmorphism, CSS Custom Properties, Animations
- **Vanilla JavaScript** — Zero framework dependencies
- **Chart.js & jsPDF** — Client-side analytics and exports

---

## 🏛️ System Architecture

TaskQuest is designed as a modular, client-side web application leveraging Vanilla JS:

```
[ UI Layer: HTML5/CSS3 ] <--> [ Controller: script.js ] <--> [ Storage: storage.js ]
                                   ^
                                   |
                       [ Modules: analytics.js, collaborative.js ]
```

- **Data Models**: Configured under versioned namespaces in LocalStorage (e.g. `taskquest_v1.tasks`, `taskquest_v1.notes`) using `storage.js`.
- **Theme Engine**: Centralized theme rules toggling matching HSL color maps variables inside `style.css`.
- **Prioritization Logic**: Managed in `prioritization.js` using weight factors on task deadlines.

---

## 📁 Project Structure

```
student-task-manager/
│
├── index.html              ← Main gamified dashboard
├── style.css               ← Core design system & glassmorphism
├── script.js               ← Task logic, XP, and local storage
│
├── focus.html              ← Dedicated Pomodoro focus mode
├── leaderboard.html        ← Global rankings and XP
├── collaborative.html      ← Multiplayer study lobbies
│
├── README.md               ← Project overview and setup guide
├── CONTRIBUTING.md         ← How to contribute to this project
├── CHANGELOG.md            ← Version history and release notes
└── License.md              ← Project license
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
