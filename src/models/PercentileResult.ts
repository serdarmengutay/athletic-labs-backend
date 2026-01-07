import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface PercentileResultAttributes {
  id: string;
  athlete_id: string;
  test_result_id: string;
  age_group: string;
  height_percentile: number;
  weight_percentile: number;
  bmi_percentile: number;
  ffmi_percentile: number;
  flexibility_percentile: number;
  sprint_30m_first_percentile: number;
  sprint_30m_second_percentile: number;
  fatigue_index_percentile: number;
  agility_percentile: number;
  vertical_jump_percentile: number;
  overall_percentile: number;
  height_score: number;
  weight_score: number;
  bmi_score: number;
  ffmi_score: number;
  flexibility_score: number;
  sprint_30m_first_score: number;
  sprint_30m_second_score: number;
  fatigue_index_score: number;
  agility_score: number;
  vertical_jump_score: number;
  created_at: Date;
  updated_at: Date;
}

interface PercentileResultCreationAttributes
  extends Optional<
    PercentileResultAttributes,
    "id" | "created_at" | "updated_at"
  > {}

class PercentileResult
  extends Model<PercentileResultAttributes, PercentileResultCreationAttributes>
  implements PercentileResultAttributes
{
  public id!: string;
  public athlete_id!: string;
  public test_result_id!: string;
  public age_group!: string;
  public height_percentile!: number;
  public weight_percentile!: number;
  public bmi_percentile!: number;
  public ffmi_percentile!: number;
  public flexibility_percentile!: number;
  public sprint_30m_first_percentile!: number;
  public sprint_30m_second_percentile!: number;
  public fatigue_index_percentile!: number;
  public agility_percentile!: number;
  public vertical_jump_percentile!: number;
  public overall_percentile!: number;
  public height_score!: number;
  public weight_score!: number;
  public bmi_score!: number;
  public ffmi_score!: number;
  public flexibility_score!: number;
  public sprint_30m_first_score!: number;
  public sprint_30m_second_score!: number;
  public fatigue_index_score!: number;
  public agility_score!: number;
  public vertical_jump_score!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

PercentileResult.init(
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
    test_result_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "test_results",
        key: "id",
      },
    },
    age_group: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    height_percentile: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    weight_percentile: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    bmi_percentile: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    ffmi_percentile: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    flexibility_percentile: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    sprint_30m_first_percentile: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    sprint_30m_second_percentile: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    fatigue_index_percentile: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    agility_percentile: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    vertical_jump_percentile: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    overall_percentile: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    height_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    weight_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    bmi_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    ffmi_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    flexibility_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    sprint_30m_first_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    sprint_30m_second_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    fatigue_index_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    agility_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    vertical_jump_score: {
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
    tableName: "percentile_results",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default PercentileResult;
