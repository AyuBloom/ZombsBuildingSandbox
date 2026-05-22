import _UiComponent from "./UiComponent";
class UiMenuSettings extends _UiComponent {
    constructor(ui) {
        super(ui, "<div id=\"hud-menu-settings\" class=\"hud-menu hud-menu-settings\">\n            <a class=\"hud-menu-close\"></a>\n            <h3>Settings</h3>\n            <div class=\"hud-settings-grid\">\n                <label>\n                    <span>Controls</span>\n                    <ul class=\"hud-settings-controls\">\n                        <li>Movement: <strong>W, A, S, D</strong></li>\n                        <li>Unselect: <strong>Esc or Right-Click</strong></li>\n                        <li>Quick Upgrade: <strong>E</strong></li>\n                        <li>Quick Sell: <strong>T</strong></li>\n                    </ul>\n                </label>\n                <label>\n                    <span>Indicators</span>\n                    <input class=\"hud-settings-obstacle-indicators\" type=\"checkbox\"> Show obstacle indicators\n                </label>\n            </div>\n        </div>");
        this.closeElem = this.componentElem.querySelector(".hud-menu-close");
        this.gridElem = this.componentElem.querySelector(".hud-settings-grid");
        this.obstacleIndicatorsElem = this.componentElem.querySelector(".hud-settings-obstacle-indicators");
        this.componentElem.addEventListener("mousedown", this.onMouseDown.bind(this));
        this.componentElem.addEventListener("mouseup", this.onMouseUp.bind(this));
        this.componentElem.addEventListener("wheel", this.onWheel.bind(this));
        this.closeElem.addEventListener("click", this.hide.bind(this));
        this.obstacleIndicatorsElem.addEventListener("change", this.onObstacleIndicatorsChange.bind(this));
    }
    show() {
        this.obstacleIndicatorsElem.checked = !!this.ui.getOption("obstacleIndicators");
        super.show();
    }
    onObstacleIndicatorsChange(event) {
        this.ui.setOption("obstacleIndicators", event.target.checked);
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
