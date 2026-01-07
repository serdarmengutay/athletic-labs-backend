import { Request, Response } from "express";
import { Club } from "../models";

export const getAllClubs = async (req: Request, res: Response) => {
  try {
    const clubs = await Club.findAll({
      include: ["athletes"],
      order: [["created_at", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: clubs,
      count: clubs.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Kulüpler getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const getClubById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const club = await Club.findOne({
      where: { id },
      include: ["athletes"],
    });

    if (!club) {
      return res.status(404).json({
        success: false,
        message: "Kulüp bulunamadı",
      });
    }

    return res.status(200).json({
      success: true,
      data: club,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Kulüp getirilirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const createClub = async (req: Request, res: Response) => {
  try {
    const { name, city, contact_person, contact_email, contact_phone } =
      req.body;

    if (!name || !city) {
      return res.status(400).json({
        success: false,
        message: "Kulüp adı ve şehir gerekli",
      });
    }

    const club = await Club.create({
      name,
      city,
      contact_person,
      contact_email,
      contact_phone,
    });

    return res.status(201).json({
      success: true,
      data: club,
      message: "Kulüp başarıyla oluşturuldu",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Kulüp oluşturulurken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const updateClub = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, city, contact_person, contact_email, contact_phone } =
      req.body;

    const club = await Club.findOne({ where: { id } });

    if (!club) {
      return res.status(404).json({
        success: false,
        message: "Kulüp bulunamadı",
      });
    }

    // Güncelle
    if (name) club.name = name;
    if (city) club.city = city;
    if (contact_person) club.contact_person = contact_person;
    if (contact_email) club.contact_email = contact_email;
    if (contact_phone) club.contact_phone = contact_phone;

    await club.save();

    return res.status(200).json({
      success: true,
      data: club,
      message: "Kulüp güncellendi",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Kulüp güncellenirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const deleteClub = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const club = await Club.findOne({ where: { id } });

    if (!club) {
      return res.status(404).json({
        success: false,
        message: "Kulüp bulunamadı",
      });
    }

    await club.destroy();

    return res.status(200).json({
      success: true,
      message: "Kulüp silindi",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Kulüp silinirken hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};
