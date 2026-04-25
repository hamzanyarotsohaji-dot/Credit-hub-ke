import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import bundlesRouter from "./bundles";
import transactionsRouter from "./transactions";
import mpesaRouter from "./mpesa";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(bundlesRouter);
router.use(transactionsRouter);
router.use(mpesaRouter);
router.use(adminRouter);

export default router;
