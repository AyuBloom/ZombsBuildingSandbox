import _UiComponent from "./UiComponent";
class UiMenuSettings extends _UiComponent {
    constructor(ui) {
        super(ui, "<div id=\"hud-menu-settings\" class=\"hud-menu hud-menu-settings\">\n            <a class=\"hud-menu-close\"></a>\n            <h3>Settings</h3>\n            <div class=\"hud-settings-grid\">\n                <div class=\"hud-settings-group\">\n                    <span>Controls</span>\n                    <ul class=\"hud-settings-controls\">\n                        <li>Move (Fast): <strong>(Shift) + W, A, S, D</strong></li>\n                        <li>Unselect: <strong>Esc or Right-Click</strong></li>\n                        <li>Teleport: <strong>Alt or Meta + Click on World</strong></li>\n                        <li>Quick Teleport: <strong>Click on Map</strong></li>\n                        <li>Quick Upgrade (All): <strong>(Shift) + E</strong></li>\n                        <li>Quick Sell (All): <strong>(Shift) + T</strong></li>\n                    </ul>\n                </div>\n                <div class=\"hud-settings-group\">\n                    <span>Indicators</span>\n                    <ul class=\"hud-settings-indicators\">\n                        <li>\n                            <label class=\"hud-settings-label\">\n                                <input class=\"hud-settings-obstacle-indicators\" type=\"checkbox\"> Show resource bounding boxes\n                            </label>\n                        </li>\n                        <li>\n                            <label class=\"hud-settings-label\">\n                                <input class=\"hud-settings-resource-collisions\" type=\"checkbox\"> Show resource collision debug\n                            </label>\n                        </li>\n                        <li>\n                            <label class=\"hud-settings-label\">\n                                <input class=\"hud-settings-grouping-grid\" type=\"checkbox\"> Show grouping grid\n                            </label>\n                        </li>\n                        <li>\n                            <label class=\"hud-settings-label\">\n                                <input class=\"hud-settings-show-ground\" type=\"checkbox\"> Show ground\n                            </label>\n                        </li>\n                    </ul>\n                </div>\n            </div>\n        </div>");
        this.closeElem = this.componentElem.querySelector(".hud-menu-close");
        this.gridElem = this.componentElem.querySelector(".hud-settings-grid");
        this.obstacleIndicatorsElem = this.componentElem.querySelector(".hud-settings-obstacle-indicators");
        this.resourceCollisionsElem = this.componentElem.querySelector(".hud-settings-resource-collisions");
        this.groupingGridElem = this.componentElem.querySelector(".hud-settings-grouping-grid");
        this.showGroundElem = this.componentElem.querySelector(".hud-settings-show-ground");
        this.componentElem.addEventListener("mousedown", this.onMouseDown.bind(this));
        this.componentElem.addEventListener("mouseup", this.onMouseUp.bind(this));
        this.componentElem.addEventListener("wheel", this.onWheel.bind(this));
        this.closeElem.addEventListener("click", this.hide.bind(this));
        this.obstacleIndicatorsElem.addEventListener("change", this.onObstacleIndicatorsChange.bind(this));
        this.resourceCollisionsElem.addEventListener("change", this.onResourceCollisionsChange.bind(this));
        this.groupingGridElem.addEventListener("change", this.onGroupingGridChange.bind(this));
        this.showGroundElem.addEventListener("change", this.onShowGroundChange.bind(this));
    }
    show() {
        this.obstacleIndicatorsElem.checked = !!this.ui.getOption("obstacleIndicators");
        this.resourceCollisionsElem.checked = !!this.ui.getOption("showResourceCollisions");
        this.groupingGridElem.checked = !!this.ui.getOption("showGroupingGrid");
        this.showGroundElem.checked = !!this.ui.getOption("showGround");
        super.show();
    }
    onObstacleIndicatorsChange(event) {
        this.ui.setOption("obstacleIndicators", event.target.checked);
    }
    onResourceCollisionsChange(event) {
        this.ui.setOption("showResourceCollisions", event.target.checked);
    }
    onGroupingGridChange(event) {
        this.ui.setOption("showGroupingGrid", event.target.checked);
    }
    onShowGroundChange(event) {
        this.ui.setOption("showGround", event.target.checked);
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
