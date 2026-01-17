import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Use the Cloudflare tunnel URL for production/device
// Use localhost for emulator (10.0.2.2 for Android emulator)
const BASE_URL = 'https://myday.progenicslabs.com';
// const BASE_URL = 'http://10.0.2.2:5000'; // For Android Emulator local dev

const TOKEN_KEY = 'auth_token';

export const ApiService = {
    async getToken() {
        return await SecureStore.getItemAsync(TOKEN_KEY);
    },

    async setToken(token: string) {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
    },

    async removeToken() {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
    },

    async request(endpoint: string, options: RequestInit = {}) {
        const token = await this.getToken();

        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        };

        const response = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (response.status === 401) {
            // Handle unauthorized (logout)
            await this.removeToken();
            // You might want to trigger a navigation to login here
        }

        return response;
    },

    async post(endpoint: string, data: any) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async get(endpoint: string) {
        return this.request(endpoint, {
            method: 'GET',
        });
    },

    async put(endpoint: string, data: any) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }
};
