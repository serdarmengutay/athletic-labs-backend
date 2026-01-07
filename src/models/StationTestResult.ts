import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface StationTestResultAttributes {
  id: string;
  test_session_id: string;
  athlete_id: string;
  station_id: string;
  metric: string;
  value: number;
  coach_id: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  completed_at: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

interface StationTestResultCreationAttributes
  extends Optional<
    StationTestResultAttributes,
    "id" | "status" | "completed_at" | "notes" | "created_at" | "updated_at"
  > {}

class StationTestResult
  extends Model<
    StationTestResultAttributes,
    StationTestResultCreationAttributes
  >
  implements StationTestResultAttributes
{
  public id!: string;
  public test_session_id!: string;
  public athlete_id!: string;
  public station_id!: string;
  public metric!: string;
  public value!: number;
  public coach_id!: string;
  public status!: "pending" | "in_progress" | "completed" | "skipped";
  public completed_at!: Date | null;
  public notes!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

StationTestResult.init(
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
    station_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "stations",
        key: "id",
      },
    },
    metric: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    coach_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "coaches",
        key: "id",
      },
    },
    status: {
      type: DataTypes.ENUM("pending", "in_progress", "completed", "skipped"),
      allowNull: false,
      defaultValue: "pending",
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    notes: {
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
    tableName: "station_test_results",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default StationTestResult;
