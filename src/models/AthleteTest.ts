import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

// MVP: Bridge table between TestSession and Athlete
interface AthleteTestAttributes {
  id: string;
  test_session_id: string;
  athlete_id: string;
  status: "active" | "absent" | "skipped";
  is_completed: boolean;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface AthleteTestCreationAttributes
  extends Optional<
    AthleteTestAttributes,
    | "id"
    | "status"
    | "is_completed"
    | "completed_at"
    | "created_at"
    | "updated_at"
  > {}

class AthleteTest
  extends Model<AthleteTestAttributes, AthleteTestCreationAttributes>
  implements AthleteTestAttributes
{
  public id!: string;
  public test_session_id!: string;
  public athlete_id!: string;
  public status!: "active" | "absent" | "skipped";
  public is_completed!: boolean;
  public completed_at!: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

AthleteTest.init(
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
    status: {
      type: DataTypes.ENUM("active", "absent", "skipped"),
      allowNull: false,
      defaultValue: "active",
    },
    is_completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    completed_at: {
      type: DataTypes.DATE,
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
    tableName: "athlete_tests",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default AthleteTest;
