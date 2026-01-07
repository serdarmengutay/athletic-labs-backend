import { Request, Response } from "express";
import QRCode from "qrcode";
import { Athlete, TestSession } from "../models";

export const generateQRCode = async (req: Request, res: Response) => {
  try {
    const { athlete_id, session_id } = req.body;

    // Sporcu ve oturum bilgilerini kontrol et
    const athlete = await Athlete.findOne({ where: { id: athlete_id } });
    const session = await TestSession.findOne({ where: { id: session_id } });

    if (!athlete) {
      return res.status(404).json({
        success: false,
        message: "Sporcu bulunamadı",
      });
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Test oturumu bulunamadı",
      });
    }

    // QR kod verisi
    const qrData = {
      athleteId: athlete.id,
      sessionId: session.id,
      athleteName: `${athlete.first_name} ${athlete.last_name}`,
      athleteCode: athlete.athlete_code,
    };

    // QR kod oluştur
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData));

    return res.status(200).json({
      success: true,
      data: {
        qrCode: qrCodeDataURL,
        qrData: qrData,
      },
      message: "QR kod başarıyla oluşturuldu",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "QR kod oluşturulurken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const validateQRCode = async (req: Request, res: Response) => {
  try {
    const { qrData } = req.body;

    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: "Geçersiz QR kod formatı",
      });
    }

    const { athleteId, sessionId } = parsedData;

    // Sporcu ve oturum bilgilerini kontrol et
    const athlete = await Athlete.findOne({ where: { id: athleteId } });
    const session = await TestSession.findOne({ where: { id: sessionId } });

    if (!athlete) {
      return res.status(404).json({
        success: false,
        message: "Sporcu bulunamadı",
      });
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Test oturumu bulunamadı",
      });
    }

    // Oturum aktif mi kontrol et
    if (session.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Test oturumu aktif değil",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        athlete: {
          id: athlete.id,
          name: `${athlete.first_name} ${athlete.last_name}`,
          birth_year: athlete.birth_year,
          height: athlete.height,
          weight: athlete.weight,
        },
        session: {
          id: session.id,
          test_date: session.test_date,
          status: session.status,
        },
      },
      message: "QR kod doğrulandı",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "QR kod doğrulanırken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const generateBulkQRCodes = async (req: Request, res: Response) => {
  try {
    const { session_id, athlete_ids } = req.body;

    const session = await TestSession.findOne({ where: { id: session_id } });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Test oturumu bulunamadı",
      });
    }

    const athletes = await Athlete.findAll({
      where: { id: athlete_ids },
    });

    const qrCodes = [];

    for (const athlete of athletes) {
      const qrData = {
        athleteId: athlete.id,
        sessionId: session.id,
        athleteName: `${athlete.first_name} ${athlete.last_name}`,
        athleteCode: athlete.athlete_code,
      };

      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData));

      qrCodes.push({
        athlete_id: athlete.id,
        athlete_name: `${athlete.first_name} ${athlete.last_name}`,
        qr_code: qrCodeDataURL,
        qr_data: qrData,
      });
    }

    return res.status(200).json({
      success: true,
      data: qrCodes,
      message: `${qrCodes.length} adet QR kod oluşturuldu`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Toplu QR kod oluşturulurken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};
