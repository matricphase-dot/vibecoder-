export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export function apiUrl(path) {
    return `${BACKEND_URL}${path}`;
}

export function wsUrl(path) {
    return `${WS_URL}${path}`;
}
