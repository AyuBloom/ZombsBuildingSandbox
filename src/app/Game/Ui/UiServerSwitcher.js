import _UiComponent from "./UiComponent";

class UiServerSwitcher extends _UiComponent {
  constructor(ui) {
    super(
      ui,
      '<div id="hud-server-switcher" class="hud-server-switcher"><button id="hud-server-copy" class="hud-server-copy">Copy</button><select class="hud-server-switcher-select"></select></div>',
    );
    this.copyElem = this.componentElem.querySelector(".hud-server-copy");
    this.selectElem = this.componentElem.querySelector(
      ".hud-server-switcher-select",
    );
    this.componentElem.addEventListener(
      "mousedown",
      this.onMouseDown.bind(this),
    );
    this.componentElem.addEventListener("mouseup", this.onMouseUp.bind(this));
    this.componentElem.addEventListener("wheel", this.onWheel.bind(this));
    this.copyElem.addEventListener("click", this.onCopy.bind(this));
    this.selectElem.addEventListener("change", this.onServerChange.bind(this));
    this.updateServerList();
  }
  updateServerList() {
    this.selectElem.innerHTML = "";
    var currentServerId = this.ui.getOption("serverId");
    var servers = this.ui.getOption("servers");
    if (servers && window.serverspots) {
      var groups = {};
      for (var serverId in servers) {
        if (
          window.serverspots[serverId] &&
          window.serverspots[serverId].spotEncoded
        ) {
          var server = servers[serverId];
          var region = server.region || "Other";
          if (!groups[region]) {
            groups[region] = document.createElement("optgroup");
            groups[region].label = region;
            this.selectElem.appendChild(groups[region]);
          }
          var option = document.createElement("option");
          option.value = serverId;
          option.innerText = server.name || serverId;
          if (serverId === currentServerId) {
            option.selected = true;
          }
          groups[region].appendChild(option);
        }
      }
    }
    this.selectElem.value = currentServerId;
  }
  async onCopy() {
    try {
      await navigator.clipboard.writeText(
        `https://zombs.io/#/${this.selectElem.value}/sandbox`,
      );
      this.ui.components.PopupOverlay.showHint(
        "Copied server link to clipboard.",
        2000,
      );
    } catch (err) {
      this.ui.components.PopupOverlay.showHint(
        "Failed to copy server link.",
        2000,
      );
    }
  }
  onServerChange(event) {
    this.ui.switchServer(event.target.value);
  }
  onMouseDown(event) {
    event.stopPropagation();
  }
  onMouseUp(event) {
    event.stopPropagation();
  }
  onWheel(event) {
    event.stopPropagation();
  }
}

export default UiServerSwitcher;
