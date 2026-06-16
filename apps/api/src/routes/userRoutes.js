import { Router } from "express";
import { getUsers, getUser, postUser } from "../controllers/userController.js";

export const userRoutes = Router();

userRoutes.get("/", getUsers);
userRoutes.get("/:username", getUser);
userRoutes.post("/", postUser);
