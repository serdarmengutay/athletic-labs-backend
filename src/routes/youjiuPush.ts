import { Router } from "express";
import { receiveYoujiuReportPush } from "../controllers/youjiuPushController";

const router = Router();

router.post("/report", receiveYoujiuReportPush);
router.post("/reports", receiveYoujiuReportPush);

export default router;
