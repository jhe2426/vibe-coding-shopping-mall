import { SolapiMessageService } from "solapi";

let messageService;

const getSolapiConfig = () => ({
  apiKey: process.env.SOLAPI_API_KEY,
  apiSecret: process.env.SOLAPI_API_SECRET,
  sender: process.env.SOLAPI_SENDER,
});

const getMessageService = () => {
  const { apiKey, apiSecret } = getSolapiConfig();

  if (!apiKey || !apiSecret) {
    throw new Error("SOLAPI_API_KEY 또는 SOLAPI_API_SECRET이 설정되지 않았습니다.");
  }

  if (!messageService) {
    messageService = new SolapiMessageService(apiKey, apiSecret);
  }

  return messageService;
};

export const sendVerificationSms = async ({ to, code }) => {
  const { sender } = getSolapiConfig();

  if (!sender) {
    throw new Error("SOLAPI_SENDER가 설정되지 않았습니다.");
  }

  return getMessageService().send({
    to,
    from: sender,
    text: `[STRIDE] 인증번호는 ${code}입니다.`,
  });
};
