import _UiComponent from "./UiComponent";
class UiMenuSettings extends _UiComponent {
    constructor(ui) {
        super(ui, "<div id=\"hud-menu-settings\" class=\"hud-menu hud-menu-settings\">\n            <a class=\"hud-menu-close\"></a>\n            <h3>Settings</h3>\n            <div class=\"hud-settings-grid\">\n                <label>\n                    <span>Controls</span>\n                    <ul class=\"hud-settings-controls\">\n                        <li>Movement: <strong>W, A, S, D</strong></li>\n                        <li>Unselect: <strong>Esc or Right-Click</strong></li>\n                        <li>Quick Upgrade: <strong>E</strong></li>\n                        <li>Quick Sell: <strong>T</strong></li>\n                    </ul>\n                </label>\n                <label class=\"hud-settings-server-switcher\">\n                    <span>Active Server</span>\n                    <select class=\"hud-settings-select\"></select>\n                </label>\n            </div>\n        </div>");
        this.closeElem = this.componentElem.querySelector(".hud-menu-close");
        this.gridElem = this.componentElem.querySelector(".hud-settings-grid");
        this.selectElem = this.componentElem.querySelector(".hud-settings-select");
        this.componentElem.addEventListener("mousedown", this.onMouseDown.bind(this));
        this.componentElem.addEventListener("mouseup", this.onMouseUp.bind(this));
        this.componentElem.addEventListener("wheel", this.onWheel.bind(this));
        this.closeElem.addEventListener("click", this.hide.bind(this));
        if (this.selectElem) {
            this.selectElem.addEventListener("change", (event) => {
                var serverId = event.target.value;
                this.ui.switchServer(serverId);
            });
        }
    }
    show() {
        super.show();
        this.updateServerList();
    }
    updateServerList() {
        if (!this.selectElem) return;
        this.selectElem.innerHTML = "";
        var currentServerId = this.ui.getOption("serverId");
        var servers = this.ui.getOption("servers");
        if (servers && window.serverspots) {
            for (var serverId in servers) {
                if (window.serverspots[serverId] && window.serverspots[serverId].spotEncoded) {
                    var server = servers[serverId];
                    var option = document.createElement("option");
                    option.value = serverId;
                    option.innerText = server.name || serverId;
                    if (serverId === currentServerId) {
                        option.selected = true;
                    }
                    this.selectElem.appendChild(option);
                }
            }
        }
        this.selectElem.value = currentServerId;
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
export default UiMenuSettings;
