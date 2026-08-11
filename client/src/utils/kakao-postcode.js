const daumPostcodeScriptId = "kakao-postcode-script";
const daumPostcodeScriptUrl = "https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

export const formatPostcodeAddress = (data) => {
  let address = data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;

  if (data.userSelectedType === "R") {
    const extraAddressParts = [
      data.bname && /[동로가]$/u.test(data.bname) ? data.bname : "",
      data.buildingName && data.apartment === "Y" ? data.buildingName : "",
    ].filter(Boolean);

    if (extraAddressParts.length > 0) {
      address += ` (${extraAddressParts.join(", ")})`;
    }
  }

  return {
    postalCode: data.zonecode,
    address,
  };
};

export const loadKakaoPostcode = () => new Promise((resolve, reject) => {
  if (window.kakao?.Postcode) {
    resolve();
    return;
  }

  const existingScript = document.getElementById(daumPostcodeScriptId);

  if (existingScript) {
    existingScript.addEventListener("load", resolve, { once: true });
    existingScript.addEventListener("error", () => reject(new Error("주소 검색 서비스를 불러오지 못했습니다.")), { once: true });
    return;
  }

  const script = document.createElement("script");
  script.id = daumPostcodeScriptId;
  script.src = daumPostcodeScriptUrl;
  script.async = true;
  script.onload = resolve;
  script.onerror = () => reject(new Error("주소 검색 서비스를 불러오지 못했습니다."));
  document.head.append(script);
});
