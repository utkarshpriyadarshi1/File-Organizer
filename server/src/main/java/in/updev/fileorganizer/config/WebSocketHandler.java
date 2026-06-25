package in.updev.fileorganizer.config;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.*;

public class WebSocketHandler extends TextWebSocketHandler {

    private static final Set<WebSocketSession> sessions = Collections.synchronizedSet(new HashSet<>());
    private static final List<String> messageQueue = Collections.synchronizedList(new ArrayList<>());

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.add(session);
    }

    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) {
        // Handle incoming messages if needed
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, org.springframework.web.socket.CloseStatus status) {
        sessions.remove(session);
    }

    public static void broadcastMessage(String message) {
        synchronized (sessions) {
            for (WebSocketSession session : sessions) {
                try {
                    session.sendMessage(new TextMessage(message));
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }
    }

    public static void broadcastMessage1(String message) {
        messageQueue.add(message);
    }

    @Scheduled(fixedRate = 2000) // Send updates every 2 seconds
    public void sendBatchedMessages() {
        if (!messageQueue.isEmpty()) {
            String combinedMessage = String.join("\n", messageQueue);
            synchronized (sessions) {
                for (WebSocketSession session : sessions) {
                    try {
                        session.sendMessage(new TextMessage(combinedMessage));
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            }
            messageQueue.clear();
        }
    }
}