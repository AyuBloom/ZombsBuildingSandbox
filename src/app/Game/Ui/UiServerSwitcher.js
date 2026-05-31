import _UiComponent from "./UiComponent";
import _UiTooltip from "./UiTooltip";

class UiServerSwitcher extends _UiComponent {
  constructor(ui) {
    super(
      ui,
      '<div id="hud-server-switcher" class="hud-server-switcher">' +
        '<button id="hud-server-copy" class="hud-server-copy">Share</button>' +
        '<select class="hud-server-switcher-select"></select>' +
      '</div>',
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
    this.selectElem.addEventListener("change", this.onServerChange.bind(this));

    // Instantiate native game tooltip for interactive sharing dropdown!
    this.tooltip = new _UiTooltip(
      this.copyElem,
      (elem) => {
        return (
          '<div class="hud-share-popover">' +
            '<button type="button" class="share-option-btn btn btn-blue" data-type="server">Copy Game Server</button>' +
            '<button type="button" class="share-option-btn btn btn-blue" data-type="spot">Copy Server & Spot</button>' +
          '</div>'
        );
      },
      "bottom",
    );

    // Event delegation on body to catch clicks inside the dynamic tooltip buttons
    this.onPopoverClick = (e) => {
      var btn = e.target.closest(".share-option-btn");
      if (btn) {
        var type = btn.getAttribute("data-type");
        this.onShare(type);
        if (this.tooltip) {
          this.tooltip.hide();
        }
      }
    };
    document.addEventListener("click", this.onPopoverClick);

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

  getPlayerPosition() {
    var world = this.ui.getBuildings() ? this.ui : null; // check if game objects exist
    var globalGame = window.game || (this.ui && this.ui.game);
    // Standard engine access
    var gameInstance = globalGame || (window.Game && window.Game.currentGame);
    if (gameInstance && gameInstance.world) {
      var localPlayer = gameInstance.world.getLocalPlayer();
      if (localPlayer) {
        var localEntity = localPlayer.getEntity();
        if (localEntity) {
          return {
            x: Math.round(localEntity.getPositionX()),
            y: Math.round(localEntity.getPositionY())
          };
        }
      }
    }
    return null;
  }
  generateShareLink(type) {
    var serverId = this.selectElem.value;
    var baseUrl = window.location.origin + window.location.pathname;
    if (type === "server") {
      return `https://zombs.io/#/${serverId}/sandbox`;
    } else {
      var x = 12000;
      var y = 12000;
      var pos = this.getPlayerPosition();
      if (pos) {
        x = pos.x;
        y = pos.y;
      } else if (window.customSpawnPoint) {
        x = window.customSpawnPoint.x;
        y = window.customSpawnPoint.y;
      }
      return `${baseUrl}?server=${serverId}&x=${x}&y=${y}`;
    }
  }
  async onShare(type) {
    var link = this.generateShareLink(type);
    try {
      await navigator.clipboard.writeText(link);
      this.ui.components.PopupOverlay.showHint(
        type === "server"
          ? "Copied server share link!"
          : "Copied server and spot share link!",
        2000,
      );
    } catch (err) {
      this.ui.components.PopupOverlay.showHint(
        "Failed to copy share link.",
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
