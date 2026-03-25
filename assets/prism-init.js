window.Prism = window.Prism || {};
window.Prism.manual = true;

document.addEventListener("DOMContentLoaded", () => {
  if (window.Prism?.plugins?.autoloader) {
    window.Prism.plugins.autoloader.languages_path = "https://cdn.jsdelivr.net/npm/prismjs@1/components/";
  }
});
