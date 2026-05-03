import { DataTypes } from "sequelize";
import { sequelize } from "../db/db.js";

const MobileSession = sequelize.define("MobileSession", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    refresh_token_hash: { type: DataTypes.STRING(64), allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    device_id: { type: DataTypes.STRING(128), allowNull: true }
}, {
    tableName: "mobile_sessions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
        { fields: ["user_id"] },
        { unique: true, fields: ["refresh_token_hash"], name: "uq_mobile_session_refresh_hash" }
    ]
});

export default MobileSession;
