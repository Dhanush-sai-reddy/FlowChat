import { Request, Response, NextFunction } from "express";

interface AppError extends Error {
  status?: number;
}

const deviceIdMiddleware=(req:Request,res:Response,next:NextFunction)=>{
    const deviceId=req.headers['device-id'];
    if (!deviceId) {
      const err = new Error("Device ID is required") as AppError;
      err.status = 400;
      return next(err);
    }

    req.deviceId = Array.isArray(deviceId) ? deviceId[0] : deviceId;
    next();
}

export default deviceIdMiddleware;