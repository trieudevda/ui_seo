import axios from "axios";

export function readableError(
  err: unknown,
  fallback: string,
) {
  if (!axios.isAxiosError(err)) return fallback;

  const message: unknown = err.response?.data?.message;

  return typeof message === "string" && message.length < 180
    ? message
    : fallback;
}