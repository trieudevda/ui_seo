import { API_CONFIG } from "./api/config";

const ADMIN_PATH = '/admin';
const PUBLIC_PATH = `${ADMIN_PATH}/(public)`;
const API_PATH = `${API_CONFIG}/api`;
const AUTH = {
    SIGNIN: () => `${ADMIN_PATH}/auth/signin`,
}
const PATH = {
    DASHBOARD: {
        INDEX: () => `${ADMIN_PATH}/dashboard`
    },
    USER: {
        INDEX: () => `${ADMIN_PATH}/user`
    },
}
const API = {
    ADMIN: {
        USER: {
            FIND_ALL: () => `/users`,
        }
    }
}
export {
    AUTH,
    PATH,
    API
}