import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface TestResultAttributes {
  id: string;
  athlete_id: string;
  test_session_id: string;
  flexibility: number;
  sprint_30m_first: number;
  sprint_30m_second: number;
  fatigue_index: number;
  agility: number;
  vertical_jump: number;
  ffmi: number;
  created_at: Date;
  updated_at: Date;
}

interface TestResultCreationAttributes
  extends Optional<TestResultAttributes, "id" | "created_at" | "updated_at"> {}

class TestResult
  extends Model<TestResultAttributes, TestResultCreationAttributes>
  implements TestResultAttributes
{
  public id!: string;
  public athlete_id!: string;
  public test_session_id!: string;
  public flexibility!: number;
  public sprint_30m_first!: number;
  public sprint_30m_second!: number;
  public fatigue_index!: number;
  public agility!: number;
  public vertical_jump!: number;
  public ffmi!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

TestResult.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    athlete_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "athletes",
        key: "id",
      },
    },
    test_session_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "test_sessions",
        key: "id",
      },
    },
    flexibility: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    sprint_30m_first: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    sprint_30m_second: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    fatigue_index: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    agility: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    vertical_jump: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    ffmi: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
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
    tableName: "test_results",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default TestResult;
