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
  tc_no_hash: string | null;
  created_at: Date;
  updated_at: Date;
}

interface AthleteCreationAttributes
  extends Optional<
    AthleteAttributes,
    | "id"
    | "birth_date"
    | "gender"
    | "parent_phone"
    | "tc_no_hash"
    | "created_at"
    | "updated_at"
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
  public tc_no_hash!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // tc_no_hash never leaves the backend, even when an instance was loaded with it.
  public toJSON(): object {
    const { tc_no_hash: _tcNoHash, ...values } = super.toJSON() as AthleteAttributes;
    return values;
  }
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
    // HMAC-SHA256 of the TCKN (see services/identity/tcknService). Written only by the identity flow.
    tc_no_hash: {
      type: DataTypes.STRING(64),
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
    // Excluded from every query (including includes) unless a scope explicitly asks for it.
    defaultScope: {
      attributes: { exclude: ["tc_no_hash"] },
    },
    scopes: {
      withTcNoHash: {
        attributes: { include: ["tc_no_hash"] },
      },
    },
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Athlete;
