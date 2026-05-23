grouping: {
        loadedGrid: false,
        currentlyDisplaying: false,
        init: function() {
            game.network.addEnterWorldHandler(() => {
                if (this.loadedGrid) return;
                this.makeGrid();
            });
            document.addEventListener("keyup", function(e) {
                if (document.activeElement.tagName.toLowerCase() !== "input" && document.activeElement.tagName.toLowerCase() !== "textarea") {
                  if (e.key == "v") this.toggleGrid();
                };
            });
        },
        makeGrid: function() {
            this.loadedGrid = true;
            const blueCell = game.assetManager.models.rangeIndicatorModel({
                width: 196,
                height: 196,
            }, null, {r: 111, g: 208, b: 247}, 4);

            const purpleCell = game.assetManager.models.rangeIndicatorModel({
                width: 196,
                height: 196,
            }, null, {r: 213, g: 118, b: 211}, 4);

            this.blueGrid = new game.renderer.spriteType(blueCell.goldRegion.getTexture(), true);
            this.blueGrid.setDimensions(0, 0, 24000, 24000);
            this.blueGrid.setAnchor(0, 0);
            this.blueGrid.setAlpha(1.5);
            this.blueGrid.setVisible(this.currentlyDisplaying);

            this.purpleGrid = new game.renderer.spriteType(purpleCell.goldRegion.getTexture(), true);
            this.purpleGrid.setDimensions(48, 48, 23952, 23952);
            this.purpleGrid.setAnchor(0, 0);
            this.purpleGrid.setAlpha(1.75);
            this.purpleGrid.setVisible(this.currentlyDisplaying);

            game.renderer.ground.addAttachment(this.blueGrid);
            game.renderer.ground.addAttachment(this.purpleGrid);
        },
        toggleGrid: function() {
          this.currentlyDisplaying = !this.currentlyDisplaying;
            this.refreshGrid();
        }
    },
