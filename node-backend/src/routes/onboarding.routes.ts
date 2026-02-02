import { Router } from 'express';
import { Request, Response } from 'express';
//import Profile from '../models/profile'
import queryProfile from '../services/profile.service'
const onboardingRoute = Router();

onboardingRoute.post('/', async (req: Request, res: Response) => {
  if (!req.deviceId) {
    return res.status(400).json({
      message: "Device ID missing",
    });
  }
    try {
      const user=req.body;
      const profile=await queryProfile(req.deviceId,user.nickName,user.shortBio,user.pronouns,user.verifiedGender,user.preferredPartnerGender);
      res.status(200).json({message:"Profile created successfully",profile});  
    } catch (error) {
      console.error("Onboarding failed:", error);
      return res.status(500).json({
        message: "Profile creation failed",
      });
    }   
});

export default onboardingRoute;   