import { Router } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import productsRouter from "./products.js";
import sellersRouter from "./sellers.js";
import ordersRouter from "./orders.js";
import reviewsRouter from "./reviews.js";
import favoritesRouter from "./favorites.js";
import chatRouter from "./chat.js";
import walletRouter from "./wallet.js";
import usersRouter from "./users.js";
import notificationsRouter from "./notifications.js";
import uploadRouter from "./upload.js";
import adsRouter from "./ads.js";
import hygieneRouter from "./hygiene.js";
import supportRouter from "./support.js";

const router = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/products", productsRouter);
router.use("/sellers", sellersRouter);
router.use("/orders", ordersRouter);
router.use("/reviews", reviewsRouter);
router.use("/favorites", favoritesRouter);
router.use("/chat", chatRouter);
router.use("/wallet", walletRouter);
router.use("/users", usersRouter);
router.use("/notifications", notificationsRouter);
router.use("/upload", uploadRouter);
router.use("/ads", adsRouter);
router.use("/hygiene", hygieneRouter);
router.use("/support", supportRouter);

export default router;
