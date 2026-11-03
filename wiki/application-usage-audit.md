# Application Usage & UX Architecture Audit

## 1. System Context & Overview
**File Organizer** is a desktop application combining:
- **Desktop Shell**: Electron runtime (`ui/src/electron/`) managing system tray, native windowing, backend daemon spawning, and system dialog bridges.
- **Frontend Layer**: React 18 SPA built with Vite, Tailwind CSS, and Ant Design 5 (`ui/src/`).
- **Backend Core**: Spring Boot 3.4.3 (Java 21) running an embedded SQLite database with WAL mode and in-memory Redis-style concurrency caching (`server/`).
- **Communication Bridge**: HTTP REST endpoints on port 8080 and bidirectional real-time progress streaming over WebSocket (`ws://localhost:8080/ws/progress`).

---

## 2. Friction Points & UX Audit Findings

### 2.1 Abandoned Dashboard Overview Component (`Overview.jsx`)
- **Finding**: A rich, production-grade `Overview.jsx` view exists with live telemetry widgets, storage size breakdown, disk health statistics, quick-action shortcuts (Organize, Clean Duplicates, Deep Clean), and recent activity logs.
- **Problem**: In `Dashboard.jsx`, the active tab defaults directly to `"organizer"` and `Overview` is not imported or listed in navigation menu items. Clicking the "Home" icon redirects directly to Organizer rather than the high-level dashboard.
- **Impact**: First-time users and returning users are immediately dropped into an action form instead of seeing a cohesive system overview and quick-start actions.

### 2.2 Native Directory Selection Bypassed in Electron
- **Finding**: Electron's `contextBridge` in `ui/src/electron/electron.js` and `app_on.js` already implement native directory picker support via `window.electron.selectFolder()` -> `dialog.showOpenDialog({ properties: ['openDirectory'] })`.
- **Problem**: `TaskContext.jsx`'s `selectFolder()` method completely ignores `window.electron` and unconditionally invokes the custom REST-based modal `FolderSelectorDialog.jsx`.
- **Impact**: In Electron, users are forced to use a slow web-based directory tree that performs server-side folder walking instead of Windows Explorer's native directory picker with Quick Access, This PC, search, and network locations.

### 2.3 Standalone Scan Trigger Missing in Duplicate Finder (`Duplicates.jsx`)
- **Finding**: `Duplicates.jsx` has selection helpers (`keepOldest`, `keepLatest`, `selectAll`, skip/target patterns) and duplicate deletion tools.
- **Problem**: When a user selects "Duplicate Finder" from the sidebar navigation menu, the component provides no directory path input or "Scan" button—it only awaits an `externalScanTaskId` from `Organizer.jsx`.
- **Impact**: The user cannot initiate a duplicate scan from the Duplicate Finder tab itself; they must discover that they have to navigate to Organizer, tick "Clean Duplicates", and initiate a scan there.

### 2.4 WebSocket Reconnection & Connection Health Feedback
- **Finding**: When WebSocket drops or server is booting, `TaskContext.jsx` silently schedules a 5-second reconnect in `console.warn` without updating the UI state.
- **Problem**: The UI provides no visual feedback that tasks are disconnected or that background updates are paused, other than a small dot in the sidebar footer.
- **Impact**: If a user runs a long-running batch and the connection stutters, they are unaware if the task is still progressing or if the UI is frozen.

### 2.5 Component-Level Error Containment
- **Finding**: `ErrorBoundary.jsx` is configured at the root level of the app (`App.jsx`).
- **Problem**: If any individual view (e.g. `Duplicates.jsx` parsing an unexpected data format or `WorkspaceExplorer.jsx` encountering an unmapped drive) throws an unhandled render error, the entire application crashes to the red error boundary, unmounting the sidebar and top navigation.
- **Impact**: Users cannot switch to another tab or check task status without reloading the entire application.

---

## 3. Performance & Resource Consumption Audit

### 3.1 Unbounded LocalStorage Serialization in `TaskContext.jsx`
- **Finding**: All completed tasks and system toasts trigger `addNotification()`, prepending items to `notificationsHistory`.
- **Problem**: `notificationsHistory` is persisted directly to `localStorage["file_organizer_notifications_history"]` on every update without a maximum count limit.
- **Impact**: Over continuous usage, tens of thousands of notification objects accumulate, causing memory bloat and noticeable synchronous JSON serialization freezes on every toast.

### 3.2 Unpaginated DOM Rendering in `GenericResultViewer` & `Duplicates`
- **Finding**: `GenericResultViewer.jsx` and `Duplicates.jsx` render result arrays directly inside a scrollable `<div>` without pagination.
- **Problem**: When scanning large disks with 10,000+ files or duplicate groups, thousands of complex React DOM nodes are created simultaneously.
- **Impact**: Causes UI sluggishness, high memory usage, and slow tab switches.

### 3.3 Dashboard Heartbeat Polling Inefficiencies
- **Finding**: `Dashboard.jsx` polls `GET /api/telemetry/heartbeat` every 10 seconds and updates `serverStatus` state.
- **Problem**: Updating top-level state in `Dashboard.jsx` causes the navigation layout, header, and sider to re-evaluate on every tick.
- **Impact**: Minor but persistent CPU cycles even when the window is idle.

---

## 4. Quality of Life & Structural Flaws

### 4.1 Hardcoded Localhost API Endpoints
- **Finding**: Over 25 separate React components and services make direct `axios.get("http://localhost:8080/api/...")` calls.
- **Problem**: No centralized API client exists to configure timeouts, error logging, base URLs, or authentication tokens.
- **Impact**: Changing the backend port or supporting alternative host configurations requires modifying dozens of files.

### 4.2 Window Alert Overwrite in `useEffect`
- **Finding**: `TaskContext.jsx` monkey-patches `window.alert` during `useEffect`.
- **Problem**: Can interfere with testing libraries (Vitest/Jest) and external modals.
- **Impact**: Fragile pattern that causes unexpected side-effects during component remounts.

---

## 5. Enhancement Roadmap & Optimization Plan

| Phase | Category | Focus Area | Proposed Changes |
|---|---|---|---|
| **Phase 1** | QoL / Architecture | Centralized API Client | Create `ui/src/services/apiClient.js` configuring base URL from `app.config.json` with global error interceptor. |
| **Phase 2** | UX / Native Feel | Folder Selection Bridge | Update `TaskContext.jsx` to prioritize `window.electron.selectFolder()` when running in Electron, with graceful fallback to `FolderSelectorDialog`. |
| **Phase 3** | UX / Navigation | Integrated Dashboard Overview | Integrate `Overview.jsx` into `Dashboard.jsx` as the primary home view with active telemetry and quick actions. |
| **Phase 4** | UX / Usability | Standalone Duplicate Scanner | Add directory picker and scan trigger inside `Duplicates.jsx` so duplicate searches can be initiated directly. |
| **Phase 5** | Performance | Notification Capping & Virtualization | Cap `notificationsHistory` to 100 items in `TaskContext.jsx`. Introduce client-side pagination in `GenericResultViewer.jsx`. |
| **Phase 6** | UX / Resilience | Connection Banner & Error Containment | Add connection status banner in header and wrap tab views in localized error boundaries. |

