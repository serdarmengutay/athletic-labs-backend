import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface ValdResultImportAttributes {
  id: string;
  test_session_id: string;
  athlete_test_id: string;
  provider: string;
  source: "api" | "file" | "manual";
  external_athlete_id: string | null;
  external_test_id: string | null;
  test_type: string | null;
  measured_at: Date | null;
  import_status: "pending" | "imported" | "failed";
  raw_payload: Record<string, any> | null;
  normalized_metrics: Record<string, number | string | null>;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ValdResultImportCreationAttributes
  extends Optional<
    ValdResultImportAttributes,
    | "id"
    | "provider"
    | "source"
    | "external_athlete_id"
    | "external_test_id"
    | "test_type"
    | "measured_at"
    | "import_status"
    | "raw_payload"
    | "normalized_metrics"
    | "error_message"
    | "created_at"
    | "updated_at"
  > {}

class ValdResultImport
  extends Model<
    ValdResultImportAttributes,
    ValdResultImportCreationAttributes
  >
  implements ValdResultImportAttributes
{
  public id!: string;
  public test_session_id!: string;
  public athlete_test_id!: string;
  public provider!: string;
  public source!: "api" | "file" | "manual";
  public external_athlete_id!: string | null;
  public external_test_id!: string | null;
  public test_type!: string | null;
  public measured_at!: Date | null;
  public import_status!: "pending" | "imported" | "failed";
  public raw_payload!: Record<string, any> | null;
  public normalized_metrics!: Record<string, number | string | null>;
  public error_message!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ValdResultImport.init(
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
    athlete_test_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "athlete_tests",
        key: "id",
      },
    },
    provider: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "vald",
    },
    source: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "api",
    },
    external_athlete_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    external_test_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    test_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    measured_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    import_status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending",
    },
    raw_payload: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    normalized_metrics: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    error_message: {
      type: DataTypes.TEXT,
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
    tableName: "vald_result_imports",
    indexes: [
      { fields: ["test_session_id", "athlete_test_id"] },
      { fields: ["external_athlete_id"] },
      { fields: ["external_test_id"] },
      { fields: ["measured_at"] },
    ],
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

export default ValdResultImport;
