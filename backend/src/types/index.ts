import { Request } from "express";

export interface AuthUserPayload {
  id: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}
