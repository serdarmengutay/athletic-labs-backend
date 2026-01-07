import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface AthleteAttributes {
  id: string;
  athlete_code: string; // Doğum yılı + sıra numarası (örn: 201400512)
  first_name: string;
  last_name: string;
  birth_year: number;
  height: number; // cm
  weight: number; // kg
  bmi: number; // calculated
  ffmi: number; // Fat-Free Mass Index
  club_id: string;
  created_at: Date;
  updated_at: Date;
}

interface AthleteCreationAttributes
  extends Optional<
    AthleteAttributes,
    "id" | "bmi" | "ffmi" | "created_at" | "updated_at"
  > {}

class Athlete
  extends Model<AthleteAttributes, AthleteCreationAttributes>
  implements AthleteAttributes
{
  public id!: string;
  public athlete_code!: string;
  public first_name!: string;
  public last_name!: string;
  public birth_year!: number;
  public height!: number;
  public weight!: number;
  public bmi!: number;
  public ffmi!: number;
  public club_id!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Athlete.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    athlete_code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    first_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    birth_year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    height: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    weight: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    bmi: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
    },
    ffmi: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
    },
    club_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "clubs",
        key: "id",
      },
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
    tableName: "athletes",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Athlete;
