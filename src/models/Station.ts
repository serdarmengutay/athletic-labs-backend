import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface StationAttributes {
  id: string;
  name: string;
  description: string;
  metrics: string[]; // JSON array of metrics this station measures
  created_at: Date;
  updated_at: Date;
}

interface StationCreationAttributes
  extends Optional<StationAttributes, "id" | "created_at" | "updated_at"> {}

class Station
  extends Model<StationAttributes, StationCreationAttributes>
  implements StationAttributes
{
  public id!: string;
  public name!: string;
  public description!: string;
  public metrics!: string[];
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Station.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metrics: {
      type: DataTypes.JSON,
      allowNull: false,
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
    tableName: "stations",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Station;
