const express = require("express");
const Joi = require("joi");
const router = express.Router();
const fs = require("fs/promises");
const path = require("path");

module.exports = router;

const User = require("../../models/users");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const checkAuth = require("../../middlewares/checkAuth");
const gravatar = require("gravatar");
const upload = require("../../middlewares/upload");

const Jimp = require("jimp");

require("dotenv").config();

const { SECRET_KEY } = process.env;

const Schema = Joi.object({
  password: Joi.string().required(),
  email: Joi.string().required(),
  subscription: Joi.string(),
  token: Joi.string(),
});

const LoginSchema = Joi.object({
  password: Joi.string().required(),
  email: Joi.string().required(),
});

const avatarDir = path.join(__dirname, "../../", "public", "avatars");

router.post("/users/signup", async (req, res) => {
  try {
    const { error } = Schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: "Missing required field",
      });
    }

    const { password, email, subscription } = req.body;
    const avatarURL = gravatar.url(email);

    const userEmail = await User.findOne({ email });
    if (userEmail) {
      return res.status(409).json({
        message: "Email in use",
      });
    }
    const salt = 10;
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await User.create({ password: hashedPassword, email, subscription, avatarURL });
    res.status(201).json({ subscription: result.subscription, email: result.email });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
});

router.post("/users/login", async (req, res) => {
  try {
    const { error } = LoginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    const { password, email } = req.body;

    const user = await User.findOne({ email });
    const userPassword = await bcrypt.compare(password, user.password);

    if (!user || !userPassword) {
      return res.status(401).json({
        message: "Email or password is wrong",
      });
    }

    const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: "1h" });

    const setTokenToUser = await User.findByIdAndUpdate(user._id, { token }, { new: true });

    res.json({
      token: setTokenToUser.token,
      user: {
        email: user.email,
        subscription: user.subscription,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
});

router.get("/users/logout", checkAuth, async (req, res) => {
  try {
    const { _id } = req.user;
    await User.findOneAndUpdate({ id: _id }, { token: "" }, { new: true });
    res.status(204).json({
      message: "No Content",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
});

router.get("/users/current", checkAuth, async (req, res) => {
  try {
    const { _id } = req.user;
    const currentUser = await User.findById(_id);
    if (!currentUser) {
      res.status(404);
    }
    res.json({
      email: currentUser.email,
      subscription: currentUser.subscription,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
});

router.patch("/users/avatars", checkAuth, upload.single("avatar"), async (req, res) => {
  try {
    const { _id } = req.user;
    const { path: tempUpload, originalname } = req.file;
    const extention = originalname.split(".").pop();
    const filename = `${_id}.${extention}`;

    const resultUpload = path.join(avatarDir, filename);
    await fs.rename(tempUpload, resultUpload);

    Jimp.read(resultUpload, async (err, avatar) => {
      if (err) {
        throw err;
      }
      await avatar.resize(256, 256).write(resultUpload);
    });

    const avatarURL = path.join("avatars", filename);

    await User.findByIdAndUpdate(_id, { avatarURL });

    res.json({
      avatarURL,
    });
  } catch (error) {
    await fs.unlink(req.file.path);
    throw error;
  }
});
