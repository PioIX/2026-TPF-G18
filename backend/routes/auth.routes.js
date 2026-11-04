const express = require("express");
const { iniciarSesion } = require("../modulos/auth");
const router = express.Router();
router.post("/login", iniciarSesion);
module.exports = router;
