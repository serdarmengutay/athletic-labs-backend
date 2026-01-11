import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

// MVP: Standalone historical data for percentile calculations
interface HistoricalAthleteDataAttributes {
  id: string;
  birth_year: number;
  height: number | null;
  weight: number | null;
  bmi: number | null;
  flexibility: number | null;
  sprint_30m: number | null;
  sprint_30m_second: number | null;
  agility: number | null;
  vertical_jump: number | null;
  ffmi: number | null;
  created_at: Date;
  updated_at: Date;
}

interface HistoricalAthleteDataCreationAttributes
  extends Optional<
    HistoricalAthleteDataAttributes,
    | "id"
    | "height"
    | "weight"
    | "bmi"
    | "flexibility"
    | "sprint_30m"
    | "sprint_30m_second"
    | "agility"
    | "vertical_jump"
    | "ffmi"
    | "created_at"
    | "updated_at"
  > {}

class HistoricalAthleteData
  extends Model<
    HistoricalAthleteDataAttributes,
    HistoricalAthleteDataCreationAttributes
  >
  implements HistoricalAthleteDataAttributes
{
  public id!: string;
  public birth_year!: number;
  public height!: number | null;
  public weight!: number | null;
  public bmi!: number | null;
  public flexibility!: number | null;
  public sprint_30m!: number | null;
  public sprint_30m_second!: number | null;
  public agility!: number | null;
  public vertical_jump!: number | null;
  public ffmi!: number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

HistoricalAthleteData.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    birth_year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    height: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    weight: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    bmi: {
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
    ffmi: {
      type: DataTypes.DECIMAL(5, 2),
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
    tableName: "historical_athlete_data",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default HistoricalAthleteData;
