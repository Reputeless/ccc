(() => {
  const key = "ccc:v1:theme";
  const preference = localStorage.getItem(key);
  const prefersDark = typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const normalized = preference === "light" || preference === "dark" || preference === "frost" || preference === "system"
    ? preference
    : "light";
  const resolved = normalized === "dark" || (normalized === "system" && prefersDark)
    ? "dark"
    : normalized === "frost"
      ? "frost"
      : "light";

  document.documentElement.dataset.theme = resolved;
})();
