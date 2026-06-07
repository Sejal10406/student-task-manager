# 🤝 Contributing to Student Task Manager

Thank you for your interest in contributing! This document outlines everything you need to get started as a contributor to this beginner-friendly open-source project.

---

## 📋 Table of Contents

1. [Code of Conduct](#-code-of-conduct)
2. [Getting Started](#-getting-started)
3. [Development Workflow](#-development-workflow)
4. [Commit Message Guidelines](#-commit-message-guidelines)
5. [Pull Request Process](#-pull-request-process)
6. [What to Work On](#-what-to-work-on)
7. [Coding Standards](#-coding-standards)
8. [Need Help?](#-need-help)

---

## 🛡️ Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors. Be kind, constructive, and collaborative.

---

## 🚀 Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge, Safari)
- A text editor or IDE (VS Code recommended)
- Git installed on your machine

### Setup

1. **Fork** the repository using the GitHub Fork button (top-right of the repository page).

2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/student-task-manager.git
   cd student-task-manager
   ```

3. **Open the project** in your browser:
   ```
   Open index.html directly in your browser — no build step required!
   ```

4. **Add the upstream remote** to stay in sync:
   ```bash
   git remote add upstream https://github.com/Sejal10406/student-task-manager.git
   ```

---

## 🔄 Development Workflow

1. **Sync with upstream** before starting any new work:
   ```bash
   git checkout main
   git fetch upstream
   git merge upstream/main
   git push origin main
   ```

2. **Create a dedicated branch** for your contribution following these conventions:
   * **Rule 1:** Use lowercase letters only.
   * **Rule 2:** Use hyphen-separated words (e.g., `improve-spacing` instead of `improve_spacing` or `improveSpacing`).
   * **Rule 3:** Prefix the branch name based on the contribution type:
     * `feat/` for new features
     * `fix/` for bug fixes
     * `docs/` for documentation
     * `style/` for code styling/formatting
     * `refactor/` for structural refactorings
     * `accessibility/` for accessibility improvements
     * `enhancement/` for general UI/UX polish
   
   ```bash
   git checkout -b feat/add-task-due-date
   # or
   git checkout -b fix/toast-animation-overlap
   # or
   git checkout -b accessibility/improve-button-contrast
   ```

3. **Make your changes** — keep them focused on a single concern.

4. **Test your changes** by opening `index.html` in the browser and verifying:
   - Feature works as expected
   - No console errors
   - Responsive on mobile (resize window to < 480px)
   - LocalStorage keys persist state values correctly (verify via DevTools Application tab)

5. **Commit your changes** with a descriptive message (see below).

6. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request** on GitHub against the `main` branch.

---

## 📝 Commit Message Guidelines

Use the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>: <short description>
```

### Types

| Type       | When to use                                    |
|------------|------------------------------------------------|
| `feat`     | A new feature                                  |
| `fix`      | A bug fix                                      |
| `docs`     | Documentation changes only                     |
| `style`    | Formatting, whitespace, no logic change        |
| `refactor` | Code restructuring without changing behavior   |
| `perf`     | Performance improvements                       |
| `test`     | Adding or updating tests                       |
| `chore`    | Maintenance, dependency updates, config        |

### Examples

```bash
feat: add task priority selector to task form
fix: resolve mobile header overflow on small screens
docs: expand contributing guide with workflow steps
style: improve task list item spacing on mobile
refactor: extract task rendering into a helper function
```

---

## 🔀 Pull Request Process

1. **Reference the issue** your PR addresses with `Closes #ISSUE_NUMBER` in the PR description.
2. **Fill out the PR template** completely.
3. **Keep the PR focused** — one feature or fix per PR.
4. **Include screenshots** if your changes affect the UI.
5. **Respond to review comments** promptly and respectfully.

### PR Title Examples

- `feat: add task priority selector`
- `fix: resolve empty-task validation error message`
- `docs: improve installation steps in README`

---

## 💡 What to Work On

Check the [Issues tab](https://github.com/Sejal10406/student-task-manager/issues) for open issues. Good first issues are labeled **`good first issue`**.

### Good Contribution Areas

- 🐛 Bug fixes (broken UI, JS errors, edge cases)
- ♿ Accessibility improvements (ARIA labels, keyboard navigation, focus styles)
- 📱 Responsive design improvements (mobile/tablet layout)
- 🎨 UI/UX enhancements (animations, transitions, empty states)
- 📝 Documentation improvements (README, JSDoc comments)
- ⚡ Performance optimizations
- 🔍 Search/filter enhancements

### What NOT to Submit

- ❌ Cosmetic-only changes with no functional value
- ❌ Multiple unrelated changes in one PR
- ❌ Duplicate of an existing PR or open issue
- ❌ Changes that break existing functionality

---

## 🧑‍💻 Coding Standards

Since this project uses plain HTML, CSS, and JavaScript:

### HTML
- Use semantic elements (`<main>`, `<header>`, `<footer>`, `<nav>`, etc.)
- Include `alt` attributes on all images
- Use `aria-*` attributes for interactive elements without implicit roles

### CSS
- Follow the existing CSS variable system in `:root`
- Use `var(--variable-name)` instead of hardcoded colors
- Mobile-first: add responsive styles inside `@media (max-width: 480px)`

### JavaScript
- Use `const` and `let` — avoid `var`
- Keep functions small and single-purpose
- Add a JSDoc comment for non-obvious functions
- Avoid inline event handlers in JS-generated HTML where possible

---

## ❓ Need Help?

- Browse existing [Issues](https://github.com/Sejal10406/student-task-manager/issues) and [Pull Requests](https://github.com/Sejal10406/student-task-manager/pulls) for examples
- Leave a comment on the issue you want to work on
- Be patient — maintainers are volunteers!

---

*Thank you for helping make Student Task Manager better for everyone. Happy coding! 🚀*
## Development Setup
1. Clone the repository to your local machine.
2. Open `index.html` in your favorite browser to test changes locally.
