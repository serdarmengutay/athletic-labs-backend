import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface CoachAttributes {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: "admin" | "station_coach" | "supervisor";
  assigned_stations: string[];
  created_at: Date;
  updated_at: Date;
}

interface CoachCreationAttributes
  extends Optional<
    CoachAttributes,
    "id" | "assigned_stations" | "created_at" | "updated_at"
  > {}

class Coach
  extends Model<CoachAttributes, CoachCreationAttributes>
  implements CoachAttributes
{
  public id!: string;
  public name!: string;
  public email!: string;
  public password_hash!: string;
  public role!: "admin" | "station_coach" | "supervisor";
  public assigned_stations!: string[];
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Coach.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("admin", "station_coach", "supervisor"),
      allowNull: false,
    },
    assigned_stations: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
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
    tableName: "coaches",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Coach;
