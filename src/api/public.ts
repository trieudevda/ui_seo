// src/lib/api/public.ts
import axios, { type AxiosRequestConfig } from 'axios';
import { API_CONFIG, type ApiResponse } from './config';

const client = axios.create(API_CONFIG);

/** Trả trực tiếp response.data.data theo ResponseInterceptor của NestJS. */
export const publicApi = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await client.get<ApiResponse<T>>(url, config);
    return response.data.data;
  },

  async post<T, B = unknown>(
    url: string,
    body?: B,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await client.post<ApiResponse<T>>(url, body, config);
    return response.data.data;
  },

  async patch<T, B = unknown>(
    url: string,
    body?: B,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await client.patch<ApiResponse<T>>(url, body, config);
    return response.data.data;
  },

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await client.delete<ApiResponse<T>>(url, config);
    return response.data.data;
  },
};
