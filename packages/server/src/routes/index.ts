/**
 * Route mounting
 */

import { Router } from "express";
import businessesRouter from "./businesses";
import jobsRouter from "./jobs";
import jobPagesRouter from "./job-pages";
import keywordsRouter from "./keywords";
import serviceAreasRouter from "./service-areas";
import promptsRouter from "./prompts";
import businessProfileRouter from "./business-profile";
import locationsRouter from "./locations";

const router = Router();

// Mount routes
router.use("/businesses", businessesRouter);
router.use("/businesses", jobsRouter); // /businesses/:id/jobs routes
router.use("/jobs", jobPagesRouter); // /jobs/:jobId/claim, /jobs/:jobId/pages/:pageId/complete
router.use("/businesses", keywordsRouter);
router.use("/businesses", serviceAreasRouter);
router.use("/businesses/seo", serviceAreasRouter);
router.use("/businesses", promptsRouter); // /businesses/:id/prompts routes
router.use("/businesses", businessProfileRouter); // /businesses/:id/locations, /hours, /social

// Legacy multi-location "SEO locations" routes (avoid conflict with profile locations)
router.use("/businesses/seo", locationsRouter); // /businesses/seo/:id/locations

export default router;
