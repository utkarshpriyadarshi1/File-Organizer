# Contributing to File Organizer

First off, thank you for taking the time to contribute! Contributions are what make the open-source community such an amazing place to learn, inspire, and create.

All types of contributions are welcome:
*   Reporting a bug
*   Suggesting a feature
*   Improving documentation
*   Submitting a pull request

Please take a moment to review this document to make the contribution process smooth and efficient for everyone.

---

## Code of Conduct

By participating in this project, you agree to abide by the guidelines outlined in our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to the project maintainers.

---

## 🛠️ Getting Started

1.  **Fork** the repository on GitHub.
2.  **Clone** your fork locally:
    ```bash
    git clone https://github.com/your-username/File Organizer.git
    cd File Organizer
    ```
3.  Set up your local development environment by checking out the **Development Mode** section in the [README.md](README.md).
4.  Create a branch for your work:
    *   For features: `git checkout -b feature/amazing-feature`
    *   For bugs/fixes: `git checkout -b bugfix/critical-fix`
    *   For documentation: `git checkout -b docs/clarify-instructions`

---

## 📐 Code Guidelines

### Backend (Spring Boot / Java)
*   **Java Version:** Ensure you are using **JDK 21** or higher.
*   **Code Style:** Standard Java camelCase formatting. Avoid raw SQL queries when Spring Data JPA is sufficient.
*   **Thread Safety:** Since the database is SQLite (embedded), all write transactions must be submitted to the thread-safe `SqliteWriteQueueService` to avoid database locking issues (`SQLITE_BUSY`).
*   **Caching:** Use the local `RedisCacheService` to cache file details, hash mappings, and tag associations in memory. Do not add external Redis client dependencies.
*   **Lombok:** Use Lombok annotations (`@Getter`, `@Setter`, `@Builder`, `@RequiredArgsConstructor`) to reduce boilerplate code.

### Frontend (React / TypeScript)
*   **Component Logic:** Keep components modular and single-responsibility.
*   **Styling:** Use Vanilla Tailwind CSS class styles. Stick to standard components and maintain high-fidelity aesthetics.
*   **IPC Communication:** Never import Node native files directly in React components. Always use the context-bridge window mappings (see `preload.js` or `electron.js`) to request native resources (like open-file dialogs) from the Electron shell.

---

## 📝 Commit Messages

We encourage clear, structured commit messages. Use the following prefixes to classify your changes:

*   `feat:` A new feature or capability.
*   `fix:` A bug fix.
*   `docs:` Changes to documentation or comments.
*   `style:` Formatting, missing semi-colons, or visual tweaks (no code logic changes).
*   `refactor:` Refactoring code logic without changing behavior.
*   `test:` Adding missing tests or correcting existing tests.
*   `chore:` Updating build tasks, package configurations, etc.

*Example:* `feat: add tag search filter to document locker panel`

---

## 📥 Pull Request Process

1.  **Sync your branch:** Before submitting, pull the latest changes from the original repository:
    ```bash
    git pull origin main
    ```
2.  **Verify your code:** Ensure the backend builds cleanly and the React/Electron app boots up successfully. Run:
    ```bash
    # On Windows:
    .\build.bat

    # On macOS/Linux:
    ./build.sh
    ```
3.  **Submit the PR:** Create a pull request to the `main` branch. Complete the pull request checklist in the template provided.
4.  **Review:** A project maintainer will review your code. Address any requested changes or questions promptly.

Thank you again for contributing!
