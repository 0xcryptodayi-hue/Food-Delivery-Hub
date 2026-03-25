import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const uploadDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const router = Router();

router.post("/", requireAuth, upload.single("image"), (req: AuthRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const domain = process.env["REPLIT_DEV_DOMAIN"] ?? "localhost:8080";
  const url = `https://${domain}/api/uploads/${req.file.filename}`;
  res.json({ url });
});

export default router;
