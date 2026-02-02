import Profile from '../models/profile'

async function queryProfile(deviceId:string,nickName?:string,shortBio?:string,pronouns?:string,verifiedGender?:string,preferredPartnerGender?:string){
    const profile=await Profile.findOne({deviceId:deviceId});

    if(!profile){
        const newProfile= await Profile.create({
            deviceId:deviceId,
            nickName:nickName,
            shortBio: shortBio,
            pronouns: pronouns,
            verifiedGender: verifiedGender,
            preferredPartnerGender: preferredPartnerGender
        })
        return newProfile;
    }
    if (nickName !== undefined) {
      profile.nickName = nickName;
    }

    if (shortBio !== undefined) {
      profile.shortBio = shortBio;
    }

    if (pronouns !== undefined) {
      profile.pronouns = pronouns;
    }

    if (verifiedGender !== undefined) {
      profile.verifiedGender = verifiedGender;
    }

    if (preferredPartnerGender !== undefined) {
      profile.preferredPartnerGender = preferredPartnerGender;
    }

    await profile.save();
    return profile;
  }


export default queryProfile;
  //recovered