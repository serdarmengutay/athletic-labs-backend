import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";
import type { CalendarNoteCategory } from "../utils/calendarNoteInput";

interface CalendarNoteAttributes {
  id: string;
  note_date: string;
  note_time: string | null;
  test_session_id: string | null;
  text: string;
  category: CalendarNoteCategory;
  is_done: boolean;
  created_by_uid: string | null;
  created_by_email: string | null;
  updated_by_email: string | null;
  created_at: Date;
  updated_at: Date;
}

interface CalendarNoteCreationAttributes
  extends Optional<
    CalendarNoteAttributes,
    | "id"
    | "note_time"
    | "test_session_id"
    | "category"
    | "is_done"
    | "created_by_uid"
    | "created_by_email"
    | "updated_by_email"
    | "created_at"
    | "updated_at"
  > {}

class CalendarNote
  extends Model<CalendarNoteAttributes, CalendarNoteCreationAttributes>
  implements CalendarNoteAttributes
{
  public id!: string;
  public note_date!: string;
  public note_time!: string | null;
  public test_session_id!: string | null;
  public text!: string;
  public category!: CalendarNoteCategory;
  public is_done!: boolean;
  public created_by_uid!: string | null;
  public created_by_email!: string | null;
  public updated_by_email!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

CalendarNote.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    note_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    note_time: {
      type: DataTypes.STRING(5),
      allowNull: true,
    },
    test_session_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "test_sessions",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "note",
    },
    is_done: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    created_by_uid: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    created_by_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    updated_by_email: {
      type: DataTypes.STRING(255),
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
    tableName: "calendar_notes",
    indexes: [
      { name: "calendar_notes_note_date_idx", fields: ["note_date"] },
      {
        name: "calendar_notes_test_session_id_idx",
        fields: ["test_session_id"],
      },
    ],
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

export default CalendarNote;
