import "dotenv/config";
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";

import { connectDB } from "../src/config/db.js";
import User from "../src/models/user.model.js";
import { hashPassword } from "../src/utils/password.js";

const demoProfiles = [
  ["김민서", "minseo483@gmail.com", "01023874561"],
  ["이지훈", "jihoon728@gmail.com", "01047182635"],
  ["박서연", "seoyeon541@gmail.com", "01058291476"],
  ["최현우", "hyunwoo381@gmail.com", "01062937548"],
  ["정지수", "jisoo204@gmail.com", "01073418629"],
  ["강도윤", "doyoon639@gmail.com", "01084529716"],
  ["조예진", "yejin846@gmail.com", "01091638472"],
  ["윤서준", "seojun271@gmail.com", "01032754869"],
  ["장채원", "chaewon58@gmail.com", "01045861937"],
  ["한민재", "minjae907@gmail.com", "01057192684"],
  ["김수진", "sujin418@gmail.com", "01068374195"],
  ["이태현", "taehyun625@gmail.com", "01079485236"],
  ["박유나", "yuna0364@gmail.com", "01082563947"],
  ["최준서", "junseo512@gmail.com", "01093647158"],
  ["정하연", "hayeon739@gmail.com", "01024758369"],
  ["강동현", "donghyun84@gmail.com", "01035869471"],
  ["조시우", "siwoo196@gmail.com", "01046971582"],
  ["윤은지", "eunji503@gmail.com", "01058182693"],
  ["장우진", "woojin641@gmail.com", "01069293714"],
  ["한서현", "seohyun205@gmail.com", "01071354826"],
];

const createRandomPassword = () => randomBytes(24).toString("base64url");

const createDemoUser = async ([name, userId, phoneNumber]) => ({
  userId,
  name,
  password: await hashPassword(createRandomPassword()),
  phoneNumber,
  userType: "customer",
  deliveryAddresses: [],
});

const seedDemoUsers = async () => {
  try {
    await connectDB();

    const removedUsers = await User.deleteMany({
      $or: [
        { userId: { $regex: /^demo-user-.*@stride\.test$/ } },
        { userId: { $in: demoProfiles.map((profile) => profile[1]) } },
      ],
    });
    const users = await Promise.all(demoProfiles.map(createDemoUser));
    const createdUsers = await User.insertMany(users);

    console.log(`${removedUsers.deletedCount}개의 이전 테스트 계정을 삭제하고 ${createdUsers.length}개의 테스트 고객 계정을 생성했습니다.`);
  } finally {
    await mongoose.disconnect();
  }
};

seedDemoUsers().catch((error) => {
  console.error("테스트 고객 계정 생성에 실패했습니다:", error.message);
  process.exitCode = 1;
});
