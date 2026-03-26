(function initCccTooltip(global) {
  let tooltipElement = null;
  let activeTarget = null;
  let bound = false;
  let hideTimer = 0;

  function ensureTooltipElement() {
    if (tooltipElement) {
      return tooltipElement;
    }

    tooltipElement = document.createElement("div");
    tooltipElement.className = "ccc-tooltip";
    tooltipElement.setAttribute("aria-hidden", "true");
    tooltipElement.setAttribute("role", "tooltip");
    document.body.appendChild(tooltipElement);
    return tooltipElement;
  }

  function getTooltipTarget(node) {
    return node instanceof Element ? node.closest("[data-tooltip]") : null;
  }

  function setTooltip(target, text) {
    if (!(target instanceof Element)) {
      return;
    }

    target.removeAttribute("title");
    const value = String(text ?? "").trim();
    if (value === "") {
      target.removeAttribute("data-tooltip");
      if (activeTarget === target) {
        hideTooltip();
      }
      return;
    }

    target.setAttribute("data-tooltip", value);
  }

  function showTooltip(target) {
    const text = target?.getAttribute("data-tooltip")?.trim() ?? "";
    if (text === "") {
      hideTooltip();
      return;
    }

    if (hideTimer) {
      window.clearTimeout(hideTimer);
      hideTimer = 0;
    }

    const tooltip = ensureTooltipElement();
    tooltip.textContent = text;
    tooltip.setAttribute("aria-hidden", "false");
    activeTarget = target;
    positionTooltip();
    window.requestAnimationFrame(() => {
      tooltip.classList.add("is-visible");
      positionTooltip();
    });
  }

  function hideTooltip() {
    if (!tooltipElement) {
      activeTarget = null;
      return;
    }

    tooltipElement.classList.remove("is-visible");
    tooltipElement.setAttribute("aria-hidden", "true");
    activeTarget = null;

    if (hideTimer) {
      window.clearTimeout(hideTimer);
    }
    hideTimer = window.setTimeout(() => {
      if (tooltipElement && tooltipElement.getAttribute("aria-hidden") === "true") {
        tooltipElement.textContent = "";
      }
      hideTimer = 0;
    }, 140);
  }

  function positionTooltip() {
    if (!activeTarget || !tooltipElement || tooltipElement.getAttribute("aria-hidden") === "true") {
      return;
    }

    const gapAbove = 4;
    const gapBelow = 12;
    const margin = 8;
    const targetRect = activeTarget.getBoundingClientRect();

    tooltipElement.style.left = "0px";
    tooltipElement.style.top = "0px";

    const tooltipRect = tooltipElement.getBoundingClientRect();
    const maxLeft = window.innerWidth - tooltipRect.width - margin;
    const centeredLeft = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
    const left = Math.min(Math.max(margin, centeredLeft), Math.max(margin, maxLeft));

    let top = targetRect.top - tooltipRect.height - gapAbove;
    if (top < margin) {
      top = targetRect.bottom + gapBelow;
    }
    if (top + tooltipRect.height > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - tooltipRect.height - margin);
    }

    tooltipElement.style.left = `${Math.round(left)}px`;
    tooltipElement.style.top = `${Math.round(top)}px`;
  }

  function handleMouseOver(event) {
    const target = getTooltipTarget(event.target);
    if (!target || target.contains(event.relatedTarget)) {
      return;
    }
    showTooltip(target);
  }

  function handleMouseOut(event) {
    const target = getTooltipTarget(event.target);
    if (!target || target.contains(event.relatedTarget)) {
      return;
    }
    if (activeTarget === target) {
      hideTooltip();
    }
  }

  function handleFocusIn(event) {
    const target = getTooltipTarget(event.target);
    if (target) {
      showTooltip(target);
    }
  }

  function handleFocusOut(event) {
    const target = getTooltipTarget(event.target);
    if (!target || target.contains(event.relatedTarget)) {
      return;
    }
    if (activeTarget === target) {
      hideTooltip();
    }
  }

  function initTooltips() {
    if (bound || !document.body) {
      return;
    }

    bound = true;
    ensureTooltipElement();
    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    document.addEventListener("scroll", hideTooltip, true);
    window.addEventListener("resize", positionTooltip);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTooltips, { once: true });
  } else {
    initTooltips();
  }

  global.CCCTooltip = {
    initTooltips,
    setTooltip,
    hideTooltip,
  };
})(window);
