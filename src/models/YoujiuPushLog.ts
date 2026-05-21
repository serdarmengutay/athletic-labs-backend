import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface YoujiuPushLogAttributes {
  id: string;
  report_id: string | null;
  device_sn: string | null;
  merchant: string | null;
  status: "received" | "processed" | "ignored" | "failed";
  raw_payload: Record<string, any>;
  request_headers: Record<string, any> | null;
  received_at: Date;
  created_at: Date;
  updated_at: Date;
}

interface YoujiuPushLogCreationAttributes
  extends Optional<
    YoujiuPushLogAttributes,
    | "id"
    | "report_id"
    | "device_sn"
    | "merchant"
    | "status"
    | "request_headers"
    | "received_at"
    | "created_at"
    | "updated_at"
  > {}

class YoujiuPushLog
  extends Model<YoujiuPushLogAttributes, YoujiuPushLogCreationAttributes>
  implements YoujiuPushLogAttributes
{
  public id!: string;
  public report_id!: string | null;
  public device_sn!: string | null;
  public merchant!: string | null;
  public status!: "received" | "processed" | "ignored" | "failed";
  public raw_payload!: Record<string, any>;
  public request_headers!: Record<string, any> | null;
  public received_at!: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

YoujiuPushLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    report_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    device_sn: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    merchant: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("received", "processed", "ignored", "failed"),
      allowNull: false,
      defaultValue: "received",
    },
    raw_payload: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    request_headers: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    received_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "youjiu_push_logs",
    indexes: [
      { fields: ["report_id"] },
      { fields: ["device_sn"] },
      { fields: ["received_at"] },
    ],
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

export default YoujiuPushLog;
