# File Organizer Boilerplate Code Setup Guide

Get a working base with all core technologies installed and ready for custom File Organizer features.

***

## 1. Project Structure

- **frontend/**: React app with Electron wrapper support.
- **backend/**: Spring Boot (Java) backend server managing local file metadata, hashes, backups, and caching.
- **docs/**: Project architecture and technical specification documents.
- **schema/**: SQLite database schema configurations.
- **builder/**: Build and run automation script controllers (Windows `.bat` files and cross-platform `.sh` scripts).

***

## 2. Spring Boot Backend Setup

The backend is built as a standalone Spring Boot application, using a custom source directory config in `pom.xml`.

### 2a. Maven Configuration (`pom.xml`)
We use Java 21 and specify the custom source directory (`src`) and resource inclusion directories:

```xml
    <properties>
        <java.version>21</java.version>
    </properties>
    
    <build>
        <sourceDirectory>src</sourceDirectory>
        <resources>
            <resource>
                <directory>src</directory>
                <includes>
                    <include>**/*.properties</include>
                    <include>**/*.yml</include>
                    <include>**/*.xml</include>
                </includes>
            </resource>
        </resources>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
```

### 2b. Database Configuration (`application.yml`)
The backend is configured with SQLite file database (`file-organizer.db`) for true offline local-only operation:

```yaml
spring:
  datasource:
    url: jdbc:sqlite:file-organizer.db
    driver-class-name: org.sqlite.JDBC
  jpa:
    database-platform: org.hibernate.community.dialect.SQLiteDialect
    hibernate:
      ddl-auto: update
    show-sql: true
    properties:
      hibernate:
        format_sql: true
```

### 2c. SQLite Serialized Database Write Queue
To avoid `database is locked` conflicts during multi-threaded batch operations on SQLite, all database writes must be sequentially executed using the `SqliteWriteQueueService`:

```java
@Service
public class SqliteWriteQueueService {
    private final BlockingQueue<Runnable> writeQueue = new LinkedBlockingQueue<>();
    private Thread consumerThread;
    
    @PostConstruct
    public void startConsumer() {
        consumerThread = new Thread(() -> {
            while (running) {
                try {
                    Runnable task = writeQueue.take();
                    task.run();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }, "sqlite-write-consumer");
        consumerThread.start();
    }

    public void submitWrite(Runnable task) {
        writeQueue.add(task);
    }
}
```

***

## 3. React + Electron Frontend Setup

The frontend is a TypeScript React app run inside an Electron desktop shell.

### 3a. Electron Main Script (`src/electron/app_on.js`)
Configured to load the React app and handle native IPC file dialogues using CommonJS imports:

```javascript
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");

let mainWindow = null;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, "electron.js"),
        },
    });
    mainWindow.loadURL("http://localhost:3000");
});

ipcMain.handle("select-folder", async () => {
    const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
    return result.filePaths[0] || "";
});
```

### 3b. Startup Configuration (`package.json`)
The React application starts concurrently with the Electron browser instance:

```json
  "main": "src/electron/app_on.js",
  "scripts": {
    "start": "react-scripts start",
    "electron": "electron .",
    "dev": "concurrently \"npm run start\" \"wait-on http://localhost:3000 && npm run electron\""
  }
```

***

## 4. REST & WebSocket Alignment

- **REST Endpoint**: The frontend views communicate with the backend via `http://localhost:8080/api/...`
- **CORS Support**: All backend REST controllers are annotated with `@CrossOrigin(origins = "*")`.
- **WebSocket Endpoint**: Real-time task progress notifications are broadcast by the backend to `ws://localhost:8080/ws/progress`.
