import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface XOneReportImportAttributes {
  id: string;
  test_session_id: string;
  athlete_id: string;
  athlete_test_id: string;
  report_id: string;
  agent_id: string | null;
  qr_token: string | null;
  qr_url: string;
  raw_payload: Record<string, any>;
  composition: Record<string, any> | null;
  measurement: Record<string, any> | null;
  posture: Record<string, any> | null;
  balance: Record<string, any> | null;
  measurement_time: Date | null;
  body_fat_percent: number | null;
  mineral_amount: number | null;
  protein_amount: number | null;
  device_serial: string | null;
  created_at: Date;
  updated_at: Date;
}

interface XOneReportImportCreationAttributes
  extends Optional<
    XOneReportImportAttributes,
    | "id"
    | "agent_id"
    | "qr_token"
    | "composition"
    | "measurement"
    | "posture"
    | "balance"
    | "measurement_time"
    | "body_fat_percent"
    | "mineral_amount"
    | "protein_amount"
    | "device_serial"
    | "created_at"
    | "updated_at"
  > {}

class XOneReportImport
  extends Model<
    XOneReportImportAttributes,
    XOneReportImportCreationAttributes
  >
  implements XOneReportImportAttributes
{
  public id!: string;
  public test_session_id!: string;
  public athlete_id!: string;
  public athlete_test_id!: string;
  public report_id!: string;
  public agent_id!: string | null;
  public qr_token!: string | null;
  public qr_url!: string;
  public raw_payload!: Record<string, any>;
  public composition!: Record<string, any> | null;
  public measurement!: Record<string, any> | null;
  public posture!: Record<string, any> | null;
  public balance!: Record<string, any> | null;
  public measurement_time!: Date | null;
  public body_fat_percent!: number | null;
  public mineral_amount!: number | null;
  public protein_amount!: number | null;
  public device_serial!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

XOneReportImport.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    test_session_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "test_sessions",
        key: "id",
      },
    },
    athlete_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "athletes",
        key: "id",
      },
    },
    athlete_test_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "athlete_tests",
        key: "id",
      },
    },
    report_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    agent_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    qr_token: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    qr_url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    raw_payload: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    composition: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    measurement: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    posture: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    balance: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    measurement_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    body_fat_percent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    mineral_amount: {
      type: DataTypes.DECIMAL(7, 2),
      allowNull: true,
    },
    protein_amount: {
      type: DataTypes.DECIMAL(7, 2),
      allowNull: true,
    },
    device_serial: {
      type: DataTypes.STRING(255),
      allowNull: true,
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
    tableName: "x_one_report_imports",
    indexes: [
      { unique: true, fields: ["report_id"] },
      { fields: ["test_session_id", "athlete_id"] },
      { fields: ["athlete_test_id"] },
    ],
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

export default XOneReportImport;
