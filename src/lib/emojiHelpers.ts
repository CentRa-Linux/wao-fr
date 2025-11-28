export const sanitizeShortcodeInput = (value: string) =>
  value.replace(/[:\s]/g, (match) => (match === ":" ? "" : "_"));

export const formatShortcodeForSave = (value: string) => {
  const core = sanitizeShortcodeInput(value).trim();
  if (!core) return "";
  return `:${core}:`;
};
