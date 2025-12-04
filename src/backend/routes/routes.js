import { Router } from "express"
import upload from "../controler/upload.js";

const router=Router();

router.route("/upload").get(upload);


export  default router;