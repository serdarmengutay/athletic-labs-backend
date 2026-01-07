import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface ClubAttributes {
  id: string;
  name: string;
  city: string;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ClubCreationAttributes
  extends Optional<
    ClubAttributes,
    | "id"
    | "contact_person"
    | "contact_email"
    | "contact_phone"
    | "created_at"
    | "updated_at"
  > {}

class Club
  extends Model<ClubAttributes, ClubCreationAttributes>
  implements ClubAttributes
{
  public id!: string;
  public name!: string;
  public city!: string;
  public contact_person!: string | null;
  public contact_email!: string | null;
  public contact_phone!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Club.init(
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
    city: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    contact_person: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    contact_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    contact_phone: {
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
    tableName: "clubs",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Club;
