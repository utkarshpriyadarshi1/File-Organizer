import axios from "axios";
import appConfig from "../app.config.json";

export const API_BASE_URL = appConfig.apiBaseUrl || "http://localhost:8080/api";
export const WS_BASE_URL = appConfig.wsBaseUrl || "ws://localhost:8080/ws/progress";

/**
 * Pre-configured Axios instance for all application REST API communication.
 */
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        "Content-Type": "application/json",
    },
});

// Response interceptor for consistent network error logging
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (!error.response) {
            console.warn(`[API] Network failure or server unreachable at ${API_BASE_URL}:`, error.message);
        } else {
            console.error(`[API] HTTP ${error.response.status} from ${error.config?.url}:`, error.response.data);
        }
        return Promise.reject(error);
    }
);

export default apiClient;

