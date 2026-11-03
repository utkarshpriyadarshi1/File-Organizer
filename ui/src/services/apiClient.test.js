import { describe, it, expect } from "vitest";
import apiClient, { API_BASE_URL, WS_BASE_URL } from "./apiClient";
import appConfig from "../app.config.json";

describe("apiClient service", () => {
    it("should export API_BASE_URL configured from app.config.json", () => {
        expect(API_BASE_URL).toBe(appConfig.apiBaseUrl);
    });

    it("should export WS_BASE_URL configured from app.config.json", () => {
        expect(WS_BASE_URL).toBe(appConfig.wsBaseUrl);
    });

    it("should configure Axios instance with matching baseURL", () => {
        expect(apiClient.defaults.baseURL).toBe(API_BASE_URL);
    });
});

