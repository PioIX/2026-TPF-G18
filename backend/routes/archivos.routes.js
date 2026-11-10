const express = require("express");
const { guardarArchivo } = require("../modulos/archivos");

const router = express.Router();

router.post("/", express.raw({ type: () => true, limit: "10mb" }), guardarArchivo);

module.exports = router;
