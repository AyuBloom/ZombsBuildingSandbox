class UiTooltip {
  constructor(targetElem, callback, anchor = "top") {
    this.targetElem = targetElem;
    this.callback = callback;
    this.anchor = anchor;
    this.hideTimeout = null;
    this.bindInputEvents();
  }
  getTargetElem() {
    return this.targetElem;
  }
  setAnchor(anchor) {
    this.anchor = anchor;
  }
  hide() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    if (this.tooltipElem) {
      this.tooltipElem.remove();
      delete this.tooltipElem;
    }
  }
  showTooltip() {
    if (this.tooltipElem) return;

    var This = this;
    var tooltipHtml =
      '\n            <div id="hud-tooltip" class="hud-tooltip">\n                ' +
      this.callback(this.targetElem) +
      "\n            </div>\n            ";
    document.body.insertAdjacentHTML("beforeend", tooltipHtml);
    this.tooltipElem = document.getElementById("hud-tooltip");

    var isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (!isMobile) {
      // Bind hover events on the tooltip itself to allow interaction (only on desktop)
      this.tooltipElem.addEventListener("mouseenter", function () {
        if (This.hideTimeout) {
          clearTimeout(This.hideTimeout);
          This.hideTimeout = null;
        }
      });
      this.tooltipElem.addEventListener("mouseleave", function () {
        This.hide();
      });
    }

    var elementOffset = this.targetElem.getBoundingClientRect();
    var tooltipOffset = {
      left: 0,
      top: 0,
    };
    if (this.anchor == "top") {
      tooltipOffset.left =
        elementOffset.left +
        elementOffset.width / 2 -
        this.tooltipElem.offsetWidth / 2;
      tooltipOffset.top =
        elementOffset.top - this.tooltipElem.offsetHeight - 20;
    } else if (this.anchor == "bottom") {
      tooltipOffset.left =
        elementOffset.left +
        elementOffset.width / 2 -
        this.tooltipElem.offsetWidth / 2;
      tooltipOffset.top = elementOffset.top + elementOffset.height + 20;
    } else if (this.anchor == "left") {
      tooltipOffset.left =
        elementOffset.left - this.tooltipElem.offsetWidth - 20;
      tooltipOffset.top =
        elementOffset.top +
        elementOffset.height / 2 -
        this.tooltipElem.offsetHeight / 2;
    } else if (this.anchor == "right") {
      tooltipOffset.left = elementOffset.left + elementOffset.width + 20;
      tooltipOffset.top =
        elementOffset.top +
        elementOffset.height / 2 -
        this.tooltipElem.offsetHeight / 2;
    }
    this.tooltipElem.className = "hud-tooltip hud-tooltip-" + this.anchor;
    this.tooltipElem.style.left = tooltipOffset.left + "px";
    this.tooltipElem.style.top = tooltipOffset.top + "px";
  }

  bindInputEvents() {
    var This = this;
    var isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    // Skip building toolbar, item toolbar and settings icon tooltips entirely on mobile
    var isToolbarOrMenu = this.targetElem.classList.contains("hud-toolbar-building") ||
                          this.targetElem.classList.contains("hud-toolbar-item") ||
                          this.targetElem.classList.contains("hud-menu-icon");

    if (isMobile) {
      if (isToolbarOrMenu) {
        return; // No tooltips for these selectors on mobile viewports
      }

      // Dynamic toggle for sharing popover and other non-toolbar tooltips
      this.targetElem.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (This.tooltipElem) {
          This.hide();
        } else {
          This.showTooltip();
        }
      });

      // Close popover if tapping outside
      document.addEventListener("touchstart", function (event) {
        if (This.tooltipElem && 
            !This.targetElem.contains(event.target) && 
            !This.tooltipElem.contains(event.target)) {
          This.hide();
        }
      });
    } else {
      // Standard desktop hover triggers
      this.targetElem.addEventListener("mouseenter", function (event) {
        if (This.hideTimeout) {
          clearTimeout(This.hideTimeout);
          This.hideTimeout = null;
        }
        This.showTooltip();
      });
      this.targetElem.addEventListener("mouseleave", function (event) {
        This.hideTimeout = setTimeout(function () {
          This.hide();
        }, 150);
      });
    }
  }
}
export default UiTooltip;
