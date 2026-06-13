import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

// MVP: All measurement data for an athlete test
interface MeasurementAttributes {
  id: string;
  athlete_test_id: string;
  height: number | null;
  weight: number | null;
  flexibility: number | null;
  sprint_30m: number | null;
  sprint_30m_second: number | null;
  agility: number | null;
  vertical_jump: number | null;
  pass_count: number | null;
  handgrip: number | null;
  ffmi: number | null;
  bmi: number | null;
  fatigue_index: number | null;
  created_at: Date;
  updated_at: Date;
}

interface MeasurementCreationAttributes
  extends Optional<
    MeasurementAttributes,
    | "id"
    | "height"
    | "weight"
    | "flexibility"
    | "sprint_30m"
    | "sprint_30m_second"
    | "agility"
    | "vertical_jump"
    | "pass_count"
    | "handgrip"
    | "ffmi"
    | "bmi"
    | "fatigue_index"
    | "created_at"
    | "updated_at"
  > {}

class Measurement
  extends Model<MeasurementAttributes, MeasurementCreationAttributes>
  implements MeasurementAttributes
{
  public id!: string;
  public athlete_test_id!: string;
  public height!: number | null;
  public weight!: number | null;
  public flexibility!: number | null;
  public sprint_30m!: number | null;
  public sprint_30m_second!: number | null;
  public agility!: number | null;
  public vertical_jump!: number | null;
  public pass_count!: number | null;
  public handgrip!: number | null;
  public ffmi!: number | null;
  public bmi!: number | null;
  public fatigue_index!: number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Measurement.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    athlete_test_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true, // One-to-one relationship
      references: {
        model: "athlete_tests",
        key: "id",
      },
    },
    height: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    weight: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    flexibility: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    sprint_30m: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    sprint_30m_second: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    agility: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    vertical_jump: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    pass_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    handgrip: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    ffmi: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true, // Computed later
    },
    bmi: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true, // Computed later
    },
    fatigue_index: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true, // Computed later
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
    tableName: "measurements",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Measurement;
