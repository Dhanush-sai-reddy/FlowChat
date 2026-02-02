import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: true
    },
    nickName: {
        type: String,
        required: true
    },
    shortBio: {
        type: String,
        required: true
    },
    pronouns: {
        type: String,
        required: true
    },
    verifiedGender: {
        type: String,
        required: true
    },
    preferredPartnerGender: {
        type: String,
        required: true
    }
});

export default mongoose.model("Profile", profileSchema);

