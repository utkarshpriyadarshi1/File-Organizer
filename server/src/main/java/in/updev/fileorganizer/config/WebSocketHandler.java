package in.updev.fileorganizer.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.*;
import java.util.concurrent.CopyOnWriteArraySet;

@Component
public class WebSocketHandler extends TextWebSocketHandler {
    private static final Logger logger = LoggerFactory.getLogger(WebSocketHandler.class);

    private static final Set<WebSocketSession> sessions = new CopyOnWriteArraySet<>();
    private static final List<String> messageQueue = Collections.synchronizedList(new ArrayList<>());
    private static final int SEND_TIME_LIMIT_MS = 10000;
    private static final int SEND_BUFFER_SIZE_LIMIT = 512 * 1024; // 512 KB

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        WebSocketSession concurrentSession = new ConcurrentWebSocketSessionDecorator(
                session, SEND_TIME_LIMIT_MS, SEND_BUFFER_SIZE_LIMIT);
        sessions.add(concurrentSession);
        logger.debug("WebSocket connection established (decorated for concurrency): {}", session.getId());
    }

    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) {
        // Handle incoming messages if needed
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.removeIf(s -> s.getId().equals(session.getId()));
        logger.debug("WebSocket connection closed: {}", session.getId());
    }

    public static void broadcastMessage(String message) {
        if (message == null || sessions.isEmpty()) return;
        List<WebSocketSession> closedSessions = new ArrayList<>();
        TextMessage textMessage = new TextMessage(message);

        for (WebSocketSession session : sessions) {
            try {
                if (session.isOpen()) {
                    synchronized (session) {
                        session.sendMessage(textMessage);
                    }
                } else {
                    closedSessions.add(session);
                }
            } catch (Exception e) {
                logger.warn("Failed to send WebSocket message to session {}: {}", session.getId(), e.getMessage());
                closedSessions.add(session);
            }
        }
        if (!closedSessions.isEmpty()) {
            sessions.removeAll(closedSessions);
        }
    }

    public static void broadcastMessage1(String message) {
        messageQueue.add(message);
    }

    @Scheduled(fixedRate = 2000) // Send updates every 2 seconds
    public void sendBatchedMessages() {
        if (!messageQueue.isEmpty()) {
            List<String> copy;
            synchronized (messageQueue) {
                copy = new ArrayList<>(messageQueue);
                messageQueue.clear();
            }
            if (!copy.isEmpty()) {
                String combinedMessage = String.join("\n", copy);
                broadcastMessage(combinedMessage);
            }
        }
    }
}