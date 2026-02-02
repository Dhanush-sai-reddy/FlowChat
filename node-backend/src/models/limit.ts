import mongoose from "mongoose";

const limitSchema=new mongoose.Schema({
    deviceId:{
        type:String,
        required:true
    },
    date:{
        type:String,
        required:true
    },
    total_matches:{
        type:Number,
        required:true,
        default:0
    },
    specific_gender_matches:{
        type:Number,
        required:true,
        default:0
    },
},{
    timestamps:true
});

export default mongoose.model('Limit',limitSchema);