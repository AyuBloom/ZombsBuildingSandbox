import _Game from "../../Engine/Game/Game";
import _UiComponent from "./UiComponent";
import _UiToolbarBuilding from "./UiToolbarBuilding";
var Debugger = require("debug");
var debug = Debugger("Game:Ui/UiToolbar");
class UiToolbar extends _UiComponent {
    constructor(ui) {
        super(ui, "<div id=\"hud-toolbar\" class=\"hud-toolbar\">\n            <div class=\"hud-toolbar-buildings\"></div>\n        </div>");
        this.toolbarBuildings = {};
        this.buildingsElem = this.componentElem.querySelector(".hud-toolbar-buildings");
        var buildingSchema = this.ui.getBuildingSchema();
        for (var buildingId in buildingSchema) {
            this.toolbarBuildings[buildingId] = new _UiToolbarBuilding(this.ui, buildingId);
            this.toolbarBuildings[buildingId].on("startPlacingBuilding", this.onStartPlacingBuilding.bind(this));
            this.toolbarBuildings[buildingId].on("placeBuilding", this.onPlaceBuilding.bind(this));
            this.buildingsElem.appendChild(this.toolbarBuildings[buildingId].getComponentElem());
        }
    }
    onStartPlacingBuilding(buildingId) {
        var buildingOverlay = this.ui.getComponent("BuildingOverlay");
        var placementOverlay = this.ui.getComponent("PlacementOverlay");
        var spellOverlay = this.ui.getComponent("SpellOverlay");
        buildingOverlay.stopWatching();
        placementOverlay.startPlacing(buildingId);
    }
    onPlaceBuilding() {
        var placementOverlay = this.ui.getComponent("PlacementOverlay");
        placementOverlay.placeBuilding();
    }
}
export default UiToolbar;
