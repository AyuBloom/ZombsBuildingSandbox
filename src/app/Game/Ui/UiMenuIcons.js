import _UiComponent from "./UiComponent";
import _UiTooltip from "./UiTooltip";
var Debugger = require("debug");
var debug = Debugger("Game:Ui/UiMenuIcons");
class UiMenuIcons extends _UiComponent {
  constructor(ui) {
    super(
      ui,
      '<div id="hud-menu-icons" class="hud-menu-icons">\n            <div class="hud-menu-icon" data-type="Settings">Settings</div>\n        </div>',
    );
    this.iconElems = [];
    this.componentElem.addEventListener(
      "mousedown",
      this.onMouseDown.bind(this),
    );
    this.componentElem.addEventListener("mouseup", this.onMouseUp.bind(this));
    var rawIconElements = this.componentElem.querySelectorAll(".hud-menu-icon");
    var self = this;
    function addIconElem(i) {
      self.iconElems[i] = rawIconElements[i];
      var clickHandler = self.onIconClick(i).bind(self);
      self.iconElems[i].addEventListener("click", clickHandler);
      self.iconElems[i].addEventListener("touchstart", function (e) {
        e.preventDefault();
        e.stopPropagation();
        clickHandler(e);
      }, { passive: false });
      new _UiTooltip(
        self.iconElems[i],
        function (elem) {
          return (
            '<div class="hud-tooltip-menu-icon">\n                    <h4>' +
            self.iconElems[i].innerHTML +
            "</h4>\n                </div>"
          );
        },
        "left",
      );
    }
    for (var i = 0; i < rawIconElements.length; i++) {
      addIconElem(i);
    }
  }
  onMouseDown(event) {
    event.stopPropagation();
  }
  onMouseUp(event) {
    event.stopPropagation();
  }
  onIconClick(i) {
    var self = this;
    return function (event) {
      var type = self.iconElems[i].getAttribute("data-type");
      var buildingOverlay = self.ui.getComponent("BuildingOverlay");
      var placementOverlay = self.ui.getComponent("PlacementOverlay");
      var menuSettings = self.ui.getComponent("MenuSettings");

      event.stopPropagation();
      buildingOverlay.stopWatching();
      placementOverlay.cancelPlacing();
      debug("Toggling menu: " + type);

      if (menuSettings.isVisible()) {
        menuSettings.hide();
      } else {
        menuSettings.show();
      }
    };
  }
}
export default UiMenuIcons;
