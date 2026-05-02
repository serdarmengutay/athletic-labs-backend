import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";
import { ATHLETE_GENDERS, AthleteGender } from "../config/gender";

// MVP: Standalone historical data for percentile calculations
interface HistoricalAthleteDataAttributes {
  id: string;
  full_name: string | null;
  club_name: string | null;
  country_code: string;
  country_name: string;
  birth_year: number;
  gender: AthleteGender;
  height: number | null;
  weight: number | null;
  bmi: number | null;
  flexibility: number | null;
  sprint_30m: number | null;
  sprint_30m_second: number | null;
  agility: number | null;
  vertical_jump: number | null;
  pass_count: number | null;
  ffmi: number | null;
  fatigue_index: number | null;
  created_at: Date;
  updated_at: Date;
}

interface HistoricalAthleteDataCreationAttributes
  extends Optional<
    HistoricalAthleteDataAttributes,
    | "id"
    | "full_name"
    | "club_name"
    | "country_code"
    | "country_name"
    | "gender"
    | "height"
    | "weight"
    | "bmi"
    | "flexibility"
    | "sprint_30m"
    | "sprint_30m_second"
    | "agility"
    | "vertical_jump"
    | "pass_count"
    | "ffmi"
    | "fatigue_index"
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
  public full_name!: string | null;
  public club_name!: string | null;
  public country_code!: string;
  public country_name!: string;
  public birth_year!: number;
  public gender!: AthleteGender;
  public height!: number | null;
  public weight!: number | null;
  public bmi!: number | null;
  public flexibility!: number | null;
  public sprint_30m!: number | null;
  public sprint_30m_second!: number | null;
  public agility!: number | null;
  public vertical_jump!: number | null;
  public pass_count!: number | null;
  public ffmi!: number | null;
  public fatigue_index!: number | null;
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
    full_name: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    club_name: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    country_code: {
      type: DataTypes.STRING(4),
      allowNull: false,
      defaultValue: "TR",
    },
    country_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: "Türkiye",
    },
    birth_year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    gender: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: ATHLETE_GENDERS.MALE,
      validate: {
        isIn: [[ATHLETE_GENDERS.MALE, ATHLETE_GENDERS.FEMALE]],
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
    pass_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ffmi: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    fatigue_index: {
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
    indexes: [{ fields: ["birth_year", "gender"] }],
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default HistoricalAthleteData;
