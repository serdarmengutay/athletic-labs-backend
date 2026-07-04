import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";
import { ATHLETE_GENDERS, AthleteGender } from "../config/gender";

// TODO MVP: Simplified athlete model - removed club_id, measurement fields moved to Measurement model
interface AthleteAttributes {
  id: string;
  full_name: string;
  birth_date: Date | null;
  birth_year: number;
  gender: AthleteGender;
  parent_phone: string | null;
  created_at: Date;
  updated_at: Date;
}

interface AthleteCreationAttributes
  extends Optional<
    AthleteAttributes,
    "id" | "birth_date" | "gender" | "parent_phone" | "created_at" | "updated_at"
  > {}

class Athlete
  extends Model<AthleteAttributes, AthleteCreationAttributes>
  implements AthleteAttributes
{
  public id!: string;
  public full_name!: string;
  public birth_date!: Date | null;
  public birth_year!: number;
  public gender!: AthleteGender;
  public parent_phone!: string | null;
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
    full_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    birth_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
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
    parent_phone: {
      type: DataTypes.STRING(20),
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
    tableName: "athletes",
    indexes: [{ fields: ["birth_year", "gender"] }],
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Athlete;
