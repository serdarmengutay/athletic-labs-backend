import { Request, Response } from "express";
import { Op, QueryTypes } from "sequelize";
import {
  Athlete,
  AthleteTest,
  Measurement,
  sequelize,
  TestSession,
} from "../models";
import { ATHLETE_GENDERS } from "../config/gender";

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeTurkishPhone(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+90")) return `+90${digits.slice(2)}`;
  if (digits.startsWith("90")) return `+${digits}`;
  if (digits.startsWith("0")) return `+90${digits.slice(1)}`;
  if (digits.startsWith("5")) return `+90${digits}`;

  return trimmed;
}

function isValidTurkeyMobilePhone(value: string): boolean {
  return /^\+905\d{9}$/.test(value);
}

function parseBirthDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (date.toISOString().slice(0, 10) !== value) return null;
  if (value > new Date().toISOString().slice(0, 10)) return null;
  return date;
}

function inferGenderFromSportType(sportType: string) {
  const normalized = sportType.toLocaleLowerCase("tr");
  return normalized.includes("kız") ||
    normalized.includes("kadin") ||
    normalized.includes("kadın") ||
    normalized.includes("female")
    ? ATHLETE_GENDERS.FEMALE
    : ATHLETE_GENDERS.MALE;
}

export const registerPublicAthlete = async (req: Request, res: Response) => {
  try {
    const { testSessionSlug } = req.params;
    const fullName = normalizeWhitespace(String(req.body.fullName || ""));
    const birthDateValue = String(req.body.birthDate || "").trim();
    const parentPhone = normalizeTurkishPhone(
      String(req.body.parentPhone || ""),
    );
    const parsedBirthDate = parseBirthDate(birthDateValue);

    if (!testSessionSlug) {
      return res.status(400).json({
        success: false,
        message: "Test kayıt bağlantısı geçersiz.",
      });
    }

    if (!fullName || fullName.split(" ").filter(Boolean).length < 2) {
      return res.status(400).json({
        success: false,
        message: "Lütfen sporcu ad soyad bilgisini giriniz.",
      });
    }

    if (!parsedBirthDate) {
      return res.status(400).json({
        success: false,
        message: "Lütfen geçerli bir doğum tarihi giriniz.",
      });
    }

    if (!isValidTurkeyMobilePhone(parentPhone)) {
      return res.status(400).json({
        success: false,
        message: "Lütfen geçerli bir numara giriniz.",
      });
    }

    const result = await sequelize.transaction(async (transaction) => {
      const duplicateLockKey = [
        testSessionSlug,
        fullName.toLocaleLowerCase("tr"),
        birthDateValue,
        parentPhone,
      ].join("|");

      await sequelize.query(
        `SELECT pg_advisory_xact_lock(hashtext('public_registration'), hashtext(:duplicateLockKey))`,
        {
          replacements: { duplicateLockKey },
          transaction,
          type: QueryTypes.SELECT,
        },
      );

      // In the first production-safe version, the public link uses TestSession.id.
      // A separate public slug column can be added later without changing frontend shape.
      const testSession = await TestSession.findByPk(testSessionSlug, {
        transaction,
      });
      if (!testSession) {
        return {
          status: 404,
          body: {
            success: false,
            message: "Test kayıt bağlantısı bulunamadı.",
          },
        };
      }

      const existingAthleteTests = await AthleteTest.findAll({
        where: { test_session_id: testSession.id },
        include: [
          {
            association: "athlete",
            required: true,
            where: {
              full_name: { [Op.iLike]: fullName },
              birth_date: birthDateValue,
              parent_phone: parentPhone,
            },
          },
        ],
        limit: 1,
        transaction,
      });

      if (existingAthleteTests.length > 0) {
        return {
          status: 409,
          body: {
            success: false,
            message:
              "Bu kişi için bu test listesinde daha önce kayıt oluşturulmuştur.",
          },
        };
      }

      const athlete = await Athlete.create(
        {
          full_name: fullName,
          birth_date: parsedBirthDate,
          birth_year: parsedBirthDate.getUTCFullYear(),
          gender: inferGenderFromSportType(testSession.sport_type),
          parent_phone: parentPhone,
        },
        { transaction },
      );

      const athleteTest = await AthleteTest.create(
        {
          test_session_id: testSession.id,
          athlete_id: athlete.id,
          status: "active",
          is_completed: false,
        },
        { transaction },
      );

      await Measurement.create(
        {
          athlete_test_id: athleteTest.id,
        },
        { transaction },
      );

      if (testSession.status === "draft") {
        testSession.status = "in_progress";
        await testSession.save({ transaction });
      }

      return {
        status: 201,
        body: {
          success: true,
          data: {
            registrationId: athleteTest.id,
            athleteTestId: athleteTest.id,
            athleteId: athlete.id,
          },
          message: "Kaydınız alınmıştır.",
        },
      };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("registerPublicAthlete error:", error);
    return res.status(500).json({
      success: false,
      message: "Kayıt oluşturulurken hata oluştu.",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};
