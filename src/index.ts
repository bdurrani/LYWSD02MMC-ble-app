import { LYWSD02 } from "./lywsd02";

const logElement = document.getElementById("log");
if (logElement === null) {
  throw new Error("no status element found");
}

function logMessage(input: any) {
  logToOutput(input);
  console.log(input);
}

function clearLogs() {
  logElement!.textContent = "";
}

function logToOutput(...args: any[]) {
  const line = Array.prototype.slice
    .call(args)
    .map(function (argument) {
      return typeof argument === "string" ? argument : JSON.stringify(argument);
    })
    .join(" ");

  logElement!.textContent += line + "\n";
}

async function setCurrentTime() {
  clearLogs();
  logMessage("Setting current time and timezone");
  const bleDevice = new LYWSD02();
  try {
    logMessage("Connecting to device...");
    await bleDevice.requestDevice();
    logMessage("Setting time and timezone");
    await bleDevice.setTime();
    logMessage("Time and timezone set");
  } catch (error) {
    logMessage(`Error setting time ${error}`);
  } finally {
    bleDevice.cleanup();
  }
}

async function queryDevice() {
  {
    const bleDevice = new LYWSD02();

    try {
      logMessage("Connecting to device...");
      await bleDevice.requestDevice();
      logMessage("Querying for current time and time zone service...");
      const currentTime = await bleDevice.getCurrentTime();

      const timeElement = document.getElementById("time-value");
      if (timeElement) {
        timeElement.textContent = currentTime;
      }

      const utcOffsetElement = document.getElementById("utcoffset-value");
      if (utcOffsetElement) {
        const utcOffset = await bleDevice.getUtcOffset();
        utcOffsetElement.textContent = utcOffset?.toString() ?? "-";
      }

      logMessage("Querying for current temperature and humidity");
      const sensorData = await bleDevice.querySensor();
      const unit = await bleDevice.getUnits();
      const tempElement = document.getElementById("temperature-value");
      if (tempElement) {
        tempElement.textContent = `${sensorData.temparature} °${unit}`;
      }

      const humidityElement = document.getElementById("humidity-value");
      if (humidityElement) {
        humidityElement.textContent = `${sensorData.humidity}%`;
      }
    } catch (error) {
      logMessage(error);
      if (error instanceof Error) {
        logMessage(`${error.name}: ${error.message}`);
      }
    } finally {
      bleDevice.cleanup();
      logMessage("Disconnecting from device");
    }
  }
}

(async () => {
  const setTimeButton = document.getElementById("set-time-button");
  setTimeButton?.addEventListener("click", () => setCurrentTime());

  const button = document.getElementById("ble-button");
  button?.addEventListener("click", () => queryDevice());

  updateTime();
  setInterval(updateTime, 5000);
})();

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function updateTime() {
  var now = new Date();
  let str = now.toLocaleTimeString();
  const currentTimeElement = document.getElementById("current-time");
  if (currentTimeElement) {
    currentTimeElement.textContent = str;
  }

  const currentUtcOffsetElement = document.getElementById("current-utc-offset");
  if (currentUtcOffsetElement) {
    const utcOffsetHours = now.getTimezoneOffset() / 60;
    currentUtcOffsetElement.textContent = `UTC Offset (hours) ${utcOffsetHours}`;
  }
}
