import { Router } from "express";
import { getPrograms } from "../lib/programRepository.js";

export const programsRouter = Router();

programsRouter.get("/", (_req, res) => {
  return res.json({
    items: getPrograms()
  });
});
