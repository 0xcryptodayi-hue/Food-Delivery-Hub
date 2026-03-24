import { Router } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import productsRouter from "./products.js";
import ordersRouter from "./orders.js";
import reviewsRouter from "./reviews.js";
import favoritesRouter from "./favorites.js";
import chatRouter from "./chat.js";
import walletRouter from "./wallet.js";
import usersRouter from "./users.js";

const router = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/products", productsRouter);
router.use("/sellers", productsRouter);
router.use("/orders", ordersRouter);
router.use("/reviews", reviewsRouter);
router.use("/favorites", favoritesRouter);
router.use("/chat", chatRouter);
router.use("/wallet", walletRouter);
router.use("/users", usersRouter);

export default router;
