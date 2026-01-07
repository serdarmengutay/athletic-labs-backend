import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

interface TestSessionAttributes {
  id: string;
  club_id: string;
  test_date: Date;
  status: "preparing" | "active" | "completed" | "cancelled";
  notes: string;
  created_at: Date;
  updated_at: Date;
}

interface TestSessionCreationAttributes
  extends Optional<
    TestSessionAttributes,
    "id" | "status" | "notes" | "created_at" | "updated_at"
  > {}

class TestSession
  extends Model<TestSessionAttributes, TestSessionCreationAttributes>
  implements TestSessionAttributes
{
  public id!: string;
  public club_id!: string;
  public test_date!: Date;
  public status!: "preparing" | "active" | "completed" | "cancelled";
  public notes!: string;
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
    club_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "clubs",
        key: "id",
      },
    },
    test_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("preparing", "active", "completed", "cancelled"),
      allowNull: false,
      defaultValue: "preparing",
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
