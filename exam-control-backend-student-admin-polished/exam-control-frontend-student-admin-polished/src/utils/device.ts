export function detectDevice() {
  const ua = navigator.userAgent;
  const lower = ua.toLowerCase();
  const isMobile = /android|iphone|ipod|mobile/.test(lower);
  const isTablet = /ipad|tablet/.test(lower) || (navigator.maxTouchPoints > 1 && /macintosh/.test(lower));
  const deviceType = isTablet ? "tablet" : isMobile ? "mobile" : "desktop";

  let operatingSystem = "unknown";
  if (/windows/i.test(ua)) operatingSystem = "Windows";
  else if (/mac os|macintosh/i.test(ua)) operatingSystem = "macOS";
  else if (/android/i.test(ua)) operatingSystem = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) operatingSystem = "iOS";
  else if (/linux/i.test(ua)) operatingSystem = "Linux";

  let browser = "unknown";
  if (/edg/i.test(ua)) browser = "Edge";
  else if (/chrome|crios/i.test(ua)) browser = "Chrome";
  else if (/safari/i.test(ua)) browser = "Safari";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";

  const teamsInApp = /Teams/i.test(ua);

  const deviceFingerprint = [ua, deviceType, operatingSystem, browser, window.screen.width, window.screen.height, Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.language].join("|");

  return {
    userAgent: ua,
    deviceFingerprint,
    deviceType,
    operatingSystem,
    browser,
    teamsInApp,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    orientation: window.innerWidth > window.innerHeight ? "landscape" : "portrait",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    touchSupport: navigator.maxTouchPoints > 0,
    devicePixelRatio: window.devicePixelRatio
  };
}
