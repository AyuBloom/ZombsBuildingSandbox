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
  bindInputEvents() {
    var This = this;
    this.targetElem.addEventListener("mouseenter", function (event) {
      if (This.hideTimeout) {
        clearTimeout(This.hideTimeout);
        This.hideTimeout = null;
      }
      if (This.tooltipElem) return;

      var tooltipHtml =
        '\n            <div id="hud-tooltip" class="hud-tooltip">\n                ' +
        This.callback(This.targetElem) +
        "\n            </div>\n            ";
      document.body.insertAdjacentHTML("beforeend", tooltipHtml);
      This.tooltipElem = document.getElementById("hud-tooltip");

      // Bind hover events on the tooltip itself to allow interaction
      This.tooltipElem.addEventListener("mouseenter", function () {
        if (This.hideTimeout) {
          clearTimeout(This.hideTimeout);
          This.hideTimeout = null;
        }
      });
      This.tooltipElem.addEventListener("mouseleave", function () {
        This.hide();
      });

      var elementOffset = This.targetElem.getBoundingClientRect();
      var tooltipOffset = {
        left: 0,
        top: 0,
      };
      if (This.anchor == "top") {
        tooltipOffset.left =
          elementOffset.left +
          elementOffset.width / 2 -
          This.tooltipElem.offsetWidth / 2;
        tooltipOffset.top =
          elementOffset.top - This.tooltipElem.offsetHeight - 20;
      } else if (This.anchor == "bottom") {
        tooltipOffset.left =
          elementOffset.left +
          elementOffset.width / 2 -
          This.tooltipElem.offsetWidth / 2;
        tooltipOffset.top = elementOffset.top + elementOffset.height + 20;
      } else if (This.anchor == "left") {
        tooltipOffset.left =
          elementOffset.left - This.tooltipElem.offsetWidth - 20;
        tooltipOffset.top =
          elementOffset.top +
          elementOffset.height / 2 -
          This.tooltipElem.offsetHeight / 2;
      } else if (This.anchor == "right") {
        tooltipOffset.left = elementOffset.left + elementOffset.width + 20;
        tooltipOffset.top =
          elementOffset.top +
          elementOffset.height / 2 -
          This.tooltipElem.offsetHeight / 2;
      }
      This.tooltipElem.className = "hud-tooltip hud-tooltip-" + This.anchor;
      This.tooltipElem.style.left = tooltipOffset.left + "px";
      This.tooltipElem.style.top = tooltipOffset.top + "px";
    });
    this.targetElem.addEventListener("mouseleave", function (event) {
      This.hideTimeout = setTimeout(function () {
        This.hide();
      }, 150); // 150ms grace period to move mouse into tooltip
    });
  }
}
export default UiTooltip;
