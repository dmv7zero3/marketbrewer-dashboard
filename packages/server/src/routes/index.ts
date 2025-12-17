/**
 * Route mounting
 */

import { Router } from "express";
import businessesRouter from "./businesses";
import jobsRouter from "./jobs";
import jobPagesRouter from "./job-pages";
import keywordsRouter from "./keywords";
import serviceAreasRouter from "./service-areas";

const router = Router();

// Mount routes
router.use("/businesses", businessesRouter);
router.use("/businesses", jobsRouter); // /businesses/:id/jobs routes
router.use("/jobs", jobPagesRouter); // /jobs/:jobId/claim, /jobs/:jobId/pages/:pageId/complete
router.use("/businesses", keywordsRouter);
router.use("/businesses", serviceAreasRouter);

export default router;
