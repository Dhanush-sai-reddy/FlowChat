
import Limit from "../models/limit"
import { genlimits } from "../utils/constant"

async function getlimit(deviceId: string) {   

    const limit = await Limit.findOne({deviceId: deviceId});
    const today:string=new Date().toISOString().split('T')[0]
    if (!limit) {
        const newUsage=await Limit.create({
            deviceId: deviceId,
            date: today,
            total_matches: 0,
            specific_gender_matches: 0
        }) 

        return newUsage;
    }
    if(limit.date !== today) {
        limit.date = today;
        limit.total_matches = 0;
        limit.specific_gender_matches = 0;
        await limit.save();
    }
    else if(limit.total_matches >= genlimits) {
        const err= new Error("Daily limit exceeded") as any;
        err.status = 429;
        throw err;
    }
    return limit;
}    
export default {
    getlimit
};
