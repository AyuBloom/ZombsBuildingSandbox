import _Game from "../../Engine/Game/Game";
import _SpriteEntity from "../../Engine/Entity/SpriteEntity";
import _TextEntity from "../../Engine/Entity/TextEntity";
import _CharacterModel from "./CharacterModel";
import _HealthBar from "./HealthBar";
import _ShieldBar from "./ShieldBar";
import _Util from "../../Engine/Util/Util";
class PlayerModel extends _CharacterModel {
  constructor() {
    super();
    this.base = new _SpriteEntity(
      "/asset/image/entity/pet-ghost/pet-ghost-t1-base.svg",
    );
    this.addAttachment(this.base, 2);
  }
  update(dt, user) {
    var tick = user;
    var networkEntity = this.getParent();
    if (tick) {
      this.updateRotationWithLocalData(networkEntity);

      const aimingYaw = _Util.interpolateYaw(
        networkEntity.getTargetTick().aimingYaw,
        networkEntity.getFromTick().aimingYaw,
      );
      this.base.setRotation(aimingYaw - tick.interpolatedYaw);

      if (tick.timeDead || tick.health <= 0) {
        this.setVisible(false);
      } else {
        this.setVisible(true);
      }
    }
    super.update.call(this, dt, user);
  }
  updateRotationWithLocalData(entity) {
    if (entity.isLocal()) {
      entity.getTargetTick().aimingYaw = entity.getFromTick().aimingYaw =
        _Game.currentGame.inputPacketCreator.getLastAnyYaw();
    }
  }
}
export default PlayerModel;
