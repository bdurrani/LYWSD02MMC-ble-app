import { LYWSD02 } from "./lywsd02";

const statusElement = document.getElementById("status");
if (statusElement === null) {
  throw new Error("no status element found");
}

const logElement = document.getElementById("log");
if (logElement === null) {
  throw new Error("no status element found");
}

function logMessage(input: any) {
  logToOutput(input);
  console.log(input);
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
  logMessage("Setting urrent time and timezone");
  const bleDevice = new LYWSD02();
  try {
    await bleDevice.requestDevice();
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
})();

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
