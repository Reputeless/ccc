document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("teacher-guide-body");
  if (!container) {
    return;
  }

  if (window.Prism?.highlightAllUnder) {
    window.Prism.highlightAllUnder(container);
  }
});
