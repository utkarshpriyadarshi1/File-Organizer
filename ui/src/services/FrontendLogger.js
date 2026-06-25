// frontend/src/services/FrontendLogger.js

const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error
};

const frontendLogs = [];
const listeners = new Set();

const addLog = (level, args) => {
    const message = args.map(arg => {
        if (arg instanceof Error) {
            return arg.stack || arg.message;
        }
        if (typeof arg === 'object') {
            try {
                return JSON.stringify(arg);
            } catch (e) {
                return String(arg);
            }
        }
        return String(arg);
    }).join(' ');

    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
        timestamp,
        level, // "INFO" or "ERROR"
        type: "FRONTEND",
        status: level,
        message,
        raw: message
    };

    frontendLogs.push(logEntry);
    if (frontendLogs.length > 1000) {
        frontendLogs.shift();
    }

    listeners.forEach(listener => {
        try {
            listener(logEntry);
        } catch (e) {
            originalConsole.error("[FrontendLogger] Subscriber error:", e);
        }
    });
};

// Override console methods to capture them
console.log = (...args) => {
    originalConsole.log.apply(console, args);
    addLog("INFO", args);
};

console.info = (...args) => {
    originalConsole.info.apply(console, args);
    addLog("INFO", args);
};

console.warn = (...args) => {
    originalConsole.warn.apply(console, args);
    addLog("INFO", args); // Map warnings as INFO or warning
};

console.error = (...args) => {
    originalConsole.error.apply(console, args);
    addLog("ERROR", args);
};

export const FrontendLogger = {
    getLogs: () => [...frontendLogs],
    subscribe: (listener) => {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    },
    clear: () => {
        frontendLogs.length = 0;
    }
};
