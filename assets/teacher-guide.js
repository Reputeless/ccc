document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("teacher-guide-body");
  if (!container) {
    return;
  }

  const sections = Array.from(container.children).filter((element) => element.tagName === "H3");
  sections.forEach((heading) => {
    const accordion = document.createElement("details");
    accordion.className = "teacher-guide-accordion";

    const summary = document.createElement("summary");
    summary.className = "teacher-guide-summary";
    summary.innerHTML = heading.innerHTML;
    accordion.appendChild(summary);

    const content = document.createElement("div");
    content.className = "teacher-guide-accordion-content";

    let node = heading.nextElementSibling;
    while (node && node.tagName !== "H3") {
      const nextNode = node.nextElementSibling;
      content.appendChild(node);
      node = nextNode;
    }

    accordion.appendChild(content);
    heading.replaceWith(accordion);
  });

  if (window.Prism?.highlightAllUnder) {
    window.Prism.highlightAllUnder(container);
  }
});
