const contacts = require("../../models/contacts");
const Joi = require("joi");

const express = require("express");

const router = express.Router();

const Schema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().required(),
  phone: Joi.string().required(),
});

router.get("/", async (req, res, next) => {
  try {
    const result = await contacts.listContacts();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: "Server errror",
    });
  }
});

router.get("/:contactId", async (req, res, next) => {
  try {
    const { contactId } = req.params;

    const result = await contacts.getContactById(contactId);
    if (!result) {
      return res.status(404).json({
        message: "Not found",
      });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { error } = Schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: "Missing required name field",
      });
    }
    const result = await contacts.addContact(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
});

router.put("/:contactId", async (req, res, next) => {
  try {
    const { error } = Schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        message: "missing fields",
      });
    }
    const { contactId } = req.params;
    const result = await contacts.updateContact(contactId, req.body);
    if (!result) {
      return res.status(404).json({
        message: "Not found",
      });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
});

router.delete("/:contactId", async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const result = await contacts.removeContact(contactId);
    if (!result) {
      res.status(404).json({
        message: "Not found",
      });
    }
    res.json({
      message: "Contact deleted",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error",
    });
  }
});

module.exports = router;
