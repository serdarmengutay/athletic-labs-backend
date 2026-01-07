import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface StationTestAttributes {
  id: string;
  session_id: string;
  athlete_id: string;
  station_id: string;
  value: number | null;
  coach_id: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  completed_at: Date | null;
  notes: string | null;
  created_at: Date;
}

interface StationTestCreationAttributes
  extends Optional<
    StationTestAttributes,
    "id" | "value" | "status" | "completed_at" | "notes" | "created_at"
  > {}

class StationTest
  extends Model<StationTestAttributes, StationTestCreationAttributes>
  implements StationTestAttributes
{
  public id!: string;
  public session_id!: string;
  public athlete_id!: string;
  public station_id!: string;
  public value!: number | null;
  public coach_id!: string;
  public status!: "pending" | "in_progress" | "completed" | "skipped";
  public completed_at!: Date | null;
  public notes!: string | null;
  public readonly created_at!: Date;
}

StationTest.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    session_id: {
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
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
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
  },
  {
    sequelize,
    tableName: "station_tests",
    timestamps: false,
  }
);

export default StationTest;
