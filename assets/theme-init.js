(() => {
  const key = "ccc:v1:theme";
  const preference = localStorage.getItem(key);
  const prefersDark = typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = preference === "dark" || (preference !== "light" && prefersDark)
    ? "dark"
    : "light";

  document.documentElement.dataset.theme = resolved;
})();
