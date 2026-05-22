obstacleIndicators: {
        allIndicators: {},
        STASH_COLOR: {r: 0x98, g: 0xfb, b: 0xcb}, // change this red
        OBSTACLE_COLOR: {r: 0xff, g: 0x00, b: 0x00}, // change this to yellow
        onEntityCreated: function(t) {
            if (this.allIndicators[t.uid]) return;

            const schema = game.ui.buildingSchema;

            let width = 0;
            let height = 0;
            let posX = 0;
            let posY = 0;
            let color = this.OBSTACLE_COLOR;

            if (t.model in schema) {
                if (t.model === "Harvester" || t.model === "SlowTrap") return;

                width = schema[t.model].gridWidth * 48;
                height = schema[t.model].gridHeight * 48;
                posX = t.position.x + 24;
                posY = t.position.y + 24;
                if (t.model === "GoldStash") {
                    color = this.STASH_COLOR;
                }
            } else if (["Tree", "Stone", "NeutralCamp"].indexOf(t.model) > -1) {
                let minCx, maxCx, minCy, maxCy;

                if (t.model === "NeutralCamp") {
                    const cx = Math.floor(t.position.x / 48);
                    const cy = Math.floor(t.position.y / 48);
                    minCx = maxCx = cx;
                    minCy = maxCy = cy;
                } else {
                    const rad = t.model === "Tree" ? 70 : 50;
                    minCx = Math.floor((t.position.x - rad) / 48);
                    maxCx = Math.floor((t.position.x + rad) / 48);
                    minCy = Math.floor((t.position.y - rad) / 48);
                    maxCy = Math.floor((t.position.y + rad) / 48);
                }

                const minX = minCx * 48;
                const maxX = (maxCx + 1) * 48;
                const minY = minCy * 48;
                const maxY = (maxCy + 1) * 48;

                width = maxX - minX;
                height = maxY - minY;
                posX = (minX + maxX) * 0.5 + 24;
                posY = (minY + maxY) * 0.5 + 24;
            } else return;

            const obstacleIndicator = game.assetManager.models.rangeIndicatorModel({width, height}, color, color, 0);
            obstacleIndicator.setVisible(game.options.options.obstacleIndicators);
            obstacleIndicator.setPosition(posX, posY);

            this.allIndicators[t.uid] = obstacleIndicator;
            game.renderer.ground.addAttachment(obstacleIndicator);
        },
        onEntityRemoved: function(t) {
            if (this.allIndicators[t]) {
                game.renderer.ground.removeAttachment(this.allIndicators[t]);
                delete this.allIndicators[t];
            };
        },
    },
