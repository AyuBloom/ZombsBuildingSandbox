import _UiComponent from "./UiComponent";

class UiBaseCostCounter extends _UiComponent {
  constructor(ui) {
    super(
      ui,
      '<div class="hud-base-cost-counter">\n' +
      '  <div class="hud-cost-item wood">\n' +
      '    <div class="icon"></div>\n' +
      '    <span class="value">0</span>\n' +
      '  </div>\n' +
      '  <div class="hud-cost-item stone">\n' +
      '    <div class="icon"></div>\n' +
      '    <span class="value">0</span>\n' +
      '  </div>\n' +
      '  <div class="hud-cost-item gold">\n' +
      '    <div class="icon"></div>\n' +
      '    <span class="value">0</span>\n' +
      '  </div>\n' +
      '</div>'
    );

    this.woodValElem = this.componentElem.querySelector(".hud-cost-item.wood .value");
    this.stoneValElem = this.componentElem.querySelector(".hud-cost-item.stone .value");
    this.goldValElem = this.componentElem.querySelector(".hud-cost-item.gold .value");
    
    this.woodContainer = this.componentElem.querySelector(".hud-cost-item.wood");
    this.stoneContainer = this.componentElem.querySelector(".hud-cost-item.stone");
    this.goldContainer = this.componentElem.querySelector(".hud-cost-item.gold");

    // Start with 0 / hidden if needed
    this.updateCosts();

    // Listen to updates
    this.ui.on("buildingsUpdate", this.updateCosts.bind(this));
    this.ui.on("buildingSchemaUpdate", this.updateCosts.bind(this));
  }

  updateCosts() {
    var buildings = this.ui.getBuildings();
    var schema = this.ui.getBuildingSchema();

    var totalWood = 0;
    var totalStone = 0;
    var totalGold = 0;

    for (var uid in buildings) {
      var building = buildings[uid];
      if (!building || building.dead) continue;

      var type = building.type;
      var tier = building.tier || 1;
      var schemaData = schema[type];

      if (schemaData) {
        if (schemaData.woodCosts) {
          totalWood += schemaData.woodCosts.slice(0, tier).reduce((a, b) => a + b, 0);
        }
        if (schemaData.stoneCosts) {
          totalStone += schemaData.stoneCosts.slice(0, tier).reduce((a, b) => a + b, 0);
        }
        if (schemaData.goldCosts) {
          totalGold += schemaData.goldCosts.slice(0, tier).reduce((a, b) => a + b, 0);
        }
      }
    }

    this.woodValElem.textContent = totalWood.toLocaleString();
    this.stoneValElem.textContent = totalStone.toLocaleString();
    this.goldValElem.textContent = totalGold.toLocaleString();

    // Toggle individual resource item visibility
    if (totalWood > 0) {
      this.woodContainer.style.display = "flex";
    } else {
      this.woodContainer.style.display = "none";
    }

    if (totalStone > 0) {
      this.stoneContainer.style.display = "flex";
    } else {
      this.stoneContainer.style.display = "none";
    }

    if (totalGold > 0) {
      this.goldContainer.style.display = "flex";
    } else {
      this.goldContainer.style.display = "none";
    }

    // Toggle parent container visibility
    if (totalWood > 0 || totalStone > 0 || totalGold > 0) {
      this.componentElem.style.display = "flex";
    } else {
      this.componentElem.style.display = "none";
    }
  }
}

export default UiBaseCostCounter;
