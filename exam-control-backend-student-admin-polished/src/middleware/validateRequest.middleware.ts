import { NextFunction, Request, Response } from "express";
import { AnyZodObject } from "zod";

export function validateRequest(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });
    if (!result.success) {
      return next(new Error(result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ")));
    }
    Object.assign(req, result.data);
    return next();
  };
}
