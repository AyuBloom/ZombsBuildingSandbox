game.assetManager.models.rangeIndicatorModel = function(e, innerRGB = {r: 0xc8, g: 0xa0, b: 0x0}, borderRGB = {r: 0xff, g: 0xc8, b: 0x0}, lineWidth = 8) {
    const container = new game.renderer.nodeType();
    container.isCircular = e.isCircular || false;
    container.goldRegion = new game.renderer.graphicsType();
    container.goldRegion.setAlpha(0.1);

    if (container.isCircular) {
        container.goldRegion.drawCircle(0, 0, e.radius, innerRGB, borderRGB, lineWidth);
    } else {
        container.goldRegion.drawRect(-e.width / 2, -e.height / 2, e.width / 2, e.height / 2, innerRGB, borderRGB, lineWidth);
    };

    container.addAttachment(container.goldRegion);
    return container;
};
