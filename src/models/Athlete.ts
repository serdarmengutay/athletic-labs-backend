import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

// TODO MVP: Simplified athlete model - removed club_id, measurement fields moved to Measurement model
interface AthleteAttributes {
  id: string;
  full_name: string;
  birth_date: Date | null;
  birth_year: number;
  created_at: Date;
  updated_at: Date;
}

interface AthleteCreationAttributes
  extends Optional<
    AthleteAttributes,
    "id" | "birth_date" | "created_at" | "updated_at"
  > {}

class Athlete
  extends Model<AthleteAttributes, AthleteCreationAttributes>
  implements AthleteAttributes
{
  public id!: string;
  public full_name!: string;
  public birth_date!: Date | null;
  public birth_year!: number;
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
