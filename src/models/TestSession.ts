import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

// TODO MVP: Refactored for MVP - removed club_id reference, added inline club info
interface TestSessionAttributes {
  id: string;
  club_name: string;
  club_responsible_name: string;
  club_responsible_email: string | null;
  club_responsible_phone: string | null;
  city: string;
  sport_type: string;
  test_date: Date;
  status: "draft" | "in_progress" | "completed";
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

interface TestSessionCreationAttributes
  extends Optional<
    TestSessionAttributes,
    | "id"
    | "club_responsible_email"
    | "club_responsible_phone"
    | "status"
    | "notes"
    | "created_at"
    | "updated_at"
  > {}

class TestSession
  extends Model<TestSessionAttributes, TestSessionCreationAttributes>
  implements TestSessionAttributes
{
  public id!: string;
  public club_name!: string;
  public club_responsible_name!: string;
  public club_responsible_email!: string | null;
  public club_responsible_phone!: string | null;
  public city!: string;
  public sport_type!: string;
  public test_date!: Date;
  public status!: "draft" | "in_progress" | "completed";
  public notes!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

TestSession.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    club_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    club_responsible_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    club_responsible_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    club_responsible_phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    sport_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    test_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("draft", "in_progress", "completed"),
      allowNull: false,
      defaultValue: "draft",
    },
    notes: {
      type: DataTypes.TEXT,
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
    tableName: "test_sessions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default TestSession;
