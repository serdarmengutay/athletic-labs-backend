import { Request, Response } from "express";
import multer from "multer";
import xlsx from "xlsx";
import { Athlete, Club, TestSession, Station } from "../models";
import { generateAthleteCode, getAgeGroup } from "../utils/calculations";

// Multer konfigürasyonu
const storage = multer.memoryStorage();
export const upload = multer({ storage });

// Excel dosyasından sporcu listesi import et
export const importAthletesFromExcel = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel dosyası yüklenmedi",
      });
    }

    const { clubId, sessionId } = req.body;

    if (!clubId || !sessionId) {
      return res.status(400).json({
        success: false,
        message: "Kulüp ID ve oturum ID gerekli",
      });
    }

    // Kulüp ve oturum kontrolü
    const club = await Club.findOne({ where: { id: clubId } });
    const session = await TestSession.findOne({ where: { id: sessionId } });

    if (!club) {
      return res.status(404).json({
        success: false,
        message: "Kulüp bulunamadı",
      });
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Test oturumu bulunamadı",
      });
    }

    // Excel dosyasını oku
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Excel dosyası boş veya geçersiz format",
      });
    }

    // Mevcut sporcuları getir (sporcu kodu oluşturmak için)
    const existingAthletes = await Athlete.findAll();

    const importedAthletes = [];
    const errors = [];

    // İlk satırı header olarak atla, veri satırlarını işle
    const rows = data.slice(1) as any[][];

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        // Sütun sırasına göre: 1. sütun=Ad, 2. sütun=Soyad, 3. sütun=Doğum Yılı
        const name = row[0]; // A sütunu
        const surname = row[1]; // B sütunu
        const birth_year = row[2]; // C sütunu

        // Boş satırları atla
        if (!name && !surname && !birth_year) {
          continue;
        }

        // Gerekli alanları kontrol et
        if (!name || !surname || !birth_year) {
          errors.push({
            row: i + 2, // Excel'de satır numarası (header + 1)
            error: "Ad, Soyad ve Doğum Yılı alanları gerekli",
          });
          continue;
        }

        // Doğum yılını parse et
        let birthYear: number;
        if (typeof birth_year === "number") {
          birthYear = birth_year;
        } else {
          birthYear = parseInt(birth_year.toString());
        }

        if (
          isNaN(birthYear) ||
          birthYear < 1900 ||
          birthYear > new Date().getFullYear()
        ) {
          errors.push({
            row: i + 2,
            error: "Geçersiz doğum yılı formatı",
          });
          continue;
        }

        // Sporcu kodunu oluştur
        const athleteCode = generateAthleteCode(birthYear, existingAthletes);

        // Sporcu oluştur
        const athlete = await Athlete.create({
          athlete_code: athleteCode,
          first_name: name.toString().trim(),
          last_name: surname.toString().trim(),
          birth_year: birthYear,
          height: 0, // Varsayılan değer, sonradan güncellenecek
          weight: 0, // Varsayılan değer, sonradan güncellenecek
          club_id: clubId,
        });

        importedAthletes.push({
          id: athlete.id,
          athlete_code: athlete.athlete_code,
          name: `${athlete.first_name} ${athlete.last_name}`,
          birth_year: athlete.birth_year,
          age_group: getAgeGroup(athlete.birth_year),
        });

        // Yeni oluşturulan sporcuyu existingAthletes listesine ekle
        existingAthletes.push(athlete);
      } catch (error) {
        errors.push({
          row: i + 2,
          error: error instanceof Error ? error.message : "Bilinmeyen hata",
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        imported_count: importedAthletes.length,
        error_count: errors.length,
        athletes: importedAthletes,
        errors: errors,
      },
      message: `${importedAthletes.length} sporcu başarıyla import edildi`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Excel import işlemi sırasında hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

// Excel template indir
export const downloadExcelTemplate = async (req: Request, res: Response) => {
  try {
    // Template verisi - Sütun sırasına göre: Ad, Soyad, Doğum Yılı
    const templateData = [
      ["Ahmet", "Yılmaz", 2010],
      ["Ayşe", "Demir", 2011],
      ["Mehmet", "Kaya", 2009],
    ];

    // Header ekle
    const headerRow = ["Ad", "Soyad", "Doğum Yılı"];
    const allData = [headerRow, ...templateData];

    // Excel dosyası oluştur
    const worksheet = xlsx.utils.aoa_to_sheet(allData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Sporcular");

    // Buffer oluştur
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=sporcu_listesi_template.xlsx"
    );
    res.send(buffer);
    return;
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Excel template oluşturulurken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

// Kulüp sporcularını Excel olarak export et
export const exportAthletesToExcel = async (req: Request, res: Response) => {
  try {
    const { clubId, sessionId } = req.params;

    const athletes = await Athlete.findAll({
      where: { club_id: clubId },
      include: [{ model: Club, as: "club" }],
    });

    if (athletes.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Kulüpte sporcu bulunamadı",
      });
    }

    // Export verisi hazırla - Sütun sırasına göre: Ad, Soyad, Doğum Yılı
    const exportData = athletes.map((athlete) => [
      athlete.first_name,
      athlete.last_name,
      athlete.birth_year,
      getAgeGroup(athlete.birth_year),
      athlete.height,
      athlete.weight,
      athlete.bmi,
      athlete.ffmi,
      athlete.athlete_code,
    ]);

    // Header ekle
    const headerRow = [
      "Ad",
      "Soyad",
      "Doğum Yılı",
      "Yaş Grubu",
      "Boy (cm)",
      "Kilo (kg)",
      "BMI",
      "FFMI",
      "Sporcu Kodu",
    ];
    const allData = [headerRow, ...exportData];

    // Excel dosyası oluştur
    const worksheet = xlsx.utils.aoa_to_sheet(allData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Sporcular");

    // Buffer oluştur
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=sporcu_listesi_${clubId}.xlsx`
    );
    res.send(buffer);
    return;
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Excel export işlemi sırasında hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};
