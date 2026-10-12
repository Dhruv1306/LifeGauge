import { Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { AuthenticatedRequest } from "../types";

const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  name: z.string().min(1, "Name is required").trim(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const weightsSchema = z.object({
  weightTasks: z.number().int().min(0).max(100),
  weightFocus: z.number().int().min(0).max(100),
  weightHabits: z.number().int().min(0).max(100),
  dailyFocusTargetMin: z.number().int().min(10).max(1440).optional(),
});

export async function register(req: AuthenticatedRequest, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.errors[0]?.message || "Please check your input and try again.",
      },
    });
    return;
  }

  const { email, password, name } = parsed.data;

  let existingUser;
  try {
    existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  } catch (dbErr) {
    console.error("[register] Database error during findUnique:", dbErr);
    res.status(503).json({
      success: false,
      error: {
        code: "DB_CONNECTION_ERROR",
        message: "Unable to reach the database. Please try again later.",
      },
    });
    return;
  }

  if (existingUser) {
    res.status(409).json({
      success: false,
      error: {
        code: "AUTH_EMAIL_ALREADY_EXISTS",
        message: "An account with this email already exists. Please sign in instead.",
      },
    });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        weightTasks: 40,
        weightFocus: 35,
        weightHabits: 25,
        dailyFocusTargetMin: 120,
      },
      select: {
        id: true,
        email: true,
        name: true,
        weightTasks: true,
        weightFocus: true,
        weightHabits: true,
        dailyFocusTargetMin: true,
        createdAt: true,
      },
    });
  } catch (dbErr) {
    console.error("[register] Database error during user create:", dbErr);
    res.status(503).json({
      success: false,
      error: {
        code: "DB_CONNECTION_ERROR",
        message: "Unable to create your account right now. Please try again later.",
      },
    });
    return;
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: "7d" }
  );

  res.status(201).json({
    success: true,
    message: "Registration successful",
    token,
    user,
  });
}

export async function login(req: AuthenticatedRequest, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.errors[0]?.message || "Please check your input and try again.",
      },
    });
    return;
  }

  const { email, password } = parsed.data;

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  } catch (dbErr) {
    console.error("[login] Database error during findUnique:", dbErr);
    res.status(503).json({
      success: false,
      error: {
        code: "DB_CONNECTION_ERROR",
        message: "Unable to reach the database. Please try again later.",
      },
    });
    return;
  }

  if (!user) {
    res.status(401).json({
      success: false,
      error: {
        code: "AUTH_INVALID_CREDENTIALS",
        message: "Email or password is incorrect.",
      },
    });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    res.status(401).json({
      success: false,
      error: {
        code: "AUTH_INVALID_CREDENTIALS",
        message: "Email or password is incorrect.",
      },
    });
    return;
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: "7d" }
  );

  res.status(200).json({
    success: true,
    message: "Login successful",
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      weightTasks: user.weightTasks,
      weightFocus: user.weightFocus,
      weightHabits: user.weightHabits,
      dailyFocusTargetMin: user.dailyFocusTargetMin,
      createdAt: user.createdAt,
    },
  });
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({
      success: false,
      error: {
        code: "AUTH_TOKEN_INVALID",
        message: "Authentication required. Please sign in.",
      },
    });
    return;
  }

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        weightTasks: true,
        weightFocus: true,
        weightHabits: true,
        dailyFocusTargetMin: true,
        createdAt: true,
      },
    });
  } catch (dbErr) {
    console.error("[getMe] Database error:", dbErr);
    res.status(503).json({
      success: false,
      error: {
        code: "DB_CONNECTION_ERROR",
        message: "Unable to reach the database. Please try again later.",
      },
    });
    return;
  }

  if (!user) {
    res.status(404).json({
      success: false,
      error: {
        code: "USER_NOT_FOUND",
        message: "Your account could not be found.",
      },
    });
    return;
  }

  res.status(200).json({
    success: true,
    user,
  });
}

export async function updateWeights(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({
      success: false,
      error: {
        code: "AUTH_TOKEN_INVALID",
        message: "Authentication required. Please sign in.",
      },
    });
    return;
  }

  const parsed = weightsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: parsed.error.errors[0]?.message || "Invalid weight parameters.",
      },
    });
    return;
  }

  let updated;
  try {
    updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        weightTasks: parsed.data.weightTasks,
        weightFocus: parsed.data.weightFocus,
        weightHabits: parsed.data.weightHabits,
        ...(parsed.data.dailyFocusTargetMin
          ? { dailyFocusTargetMin: parsed.data.dailyFocusTargetMin }
          : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        weightTasks: true,
        weightFocus: true,
        weightHabits: true,
        dailyFocusTargetMin: true,
      },
    });
  } catch (dbErr) {
    console.error("[updateWeights] Database error:", dbErr);
    res.status(503).json({
      success: false,
      error: {
        code: "DB_CONNECTION_ERROR",
        message: "Unable to save your settings right now. Please try again later.",
      },
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Weights updated successfully",
    user: updated,
  });
}
