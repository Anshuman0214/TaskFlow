import { Request, Response, NextFunction } from "express";
import { registerUser } from "./auth.service.js";
import { sendSuccessResponse } from "../../utils/apiResponse.js";

export const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await registerUser(req.body);

    sendSuccessResponse({
      res,
      statusCode: 201,
      message: "User registered successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};