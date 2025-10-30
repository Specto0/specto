import { buildApiUrl } from "./api";

const ABSOLUTE_PATTERN = /^https?:\/\//i;

const normalizeValue = (input?: unknown): string | null => {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  return trimmed.length ? trimmed : null;
};

export const resolveAvatarUrl = (raw?: unknown): string | null => {
  const value = normalizeValue(raw);
  if (!value) return null;

  if (
    value.startsWith("data:") ||
    value.startsWith("blob:") ||
    ABSOLUTE_PATTERN.test(value)
  ) {
    return value;
  }

  const normalized = value.startsWith("static/")
    ? value
    : `static/${value.replace(/^\/+/, "")}`;

  return buildApiUrl(`/${normalized}`);
};
