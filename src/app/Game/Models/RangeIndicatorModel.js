import _DrawEntity from "../../Engine/Entity/DrawEntity";
import _ModelEntity from "../../Engine/Entity/ModelEntity";
class RangeIndicatorModel extends _ModelEntity {
    constructor(args) {
        super();

        args.innerColor = args.innerColor || {r: 0xc8, g: 0xa0, b: 0x0};
        args.borderColor = args.borderColor || { r: 0xff, g: 0xc8, b: 0x0 };
        args.lineWidth = args.lineWidth === undefined ? 8 : args.lineWidth;

        this.isCircular = false;
        this.isCircular = args.isCircular || false;
        this.goldRegion = new _DrawEntity();
        this.goldRegion.setAlpha(0.1);
        if (this.isCircular) {
            this.goldRegion.drawCircle(0, 0, args.radius, args.innerColor, args.borderColor, args.lineWidth);
        } else {
            this.goldRegion.drawRect(-args.width / 2, -args.height / 2, args.width / 2, args.height / 2, args.innerColor, args.borderColor, args.lineWidth);
        }
        this.addAttachment(this.goldRegion);
    }
}
export default RangeIndicatorModel;
