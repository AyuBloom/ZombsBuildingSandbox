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
    function addIconElem(i) {
      This.iconElems[i] = rawIconElements[i];
      This.iconElems[i].addEventListener(
        "click",
        This.onIconClick(i).bind(This),
      );
      new _UiTooltip(
        This.iconElems[i],
        function (elem) {
          return (
            '<div class="hud-tooltip-menu-icon">\n                    <h4>' +
            This.iconElems[i].innerHTML +
            "</h4>\n                </div>"
          );
        },
        "left",
      );
    }
    var This = this;
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
    var This = this;
    return function (event) {
      var type = This.iconElems[i].getAttribute("data-type");
      var buildingOverlay = This.ui.getComponent("BuildingOverlay");
      var placementOverlay = This.ui.getComponent("PlacementOverlay");
      var spellOverlay = This.ui.getComponent("SpellOverlay");
      var menuSettings = This.ui.getComponent("MenuSettings");

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
