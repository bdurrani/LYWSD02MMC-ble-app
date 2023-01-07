import { LYWSD02 } from "./lywsd02";

const SERVICE_UUID = "ebe0ccb0-7a0a-4b0c-8a1a-6ff2997da3a6";
const TIME_CHARACTERISTIC_UUID = "ebe0ccb7-7a0a-4b0c-8a1a-6ff2997da3a6";

const statusElement = document.getElementById("status");
if (statusElement === null) {
  throw new Error("no status element found");
}

const logElement = document.querySelector("#log");
if (logElement === null) {
  throw new Error("no status element found");
}

function logInput(input: any) {
  logInfo(input);
  console.log(input);
}

function logInfo(...args: any[]) {
  const line = Array.prototype.slice
    .call(args)
    .map(function (argument) {
      return typeof argument === "string" ? argument : JSON.stringify(argument);
    })
    .join(" ");

  logElement!.textContent += line + "\n";
}

async function setCurrentTime() {
  console.log("set current time");
  const bleDevice = new LYWSD02();
  try {
    await bleDevice.requestDevice();
    await bleDevice.setTime();
    console.log("Time set");
  } catch (error) {
    console.error(`Error setting time ${error}`);
  } finally {
  }
}

(async () => {
  const button = document.getElementById("ble-button");

  const setTimeButton = document.getElementById("set-time-button");
  setTimeButton?.addEventListener("click", () => setCurrentTime());

  button?.addEventListener("click", async () => {
    const bleDevice = new LYWSD02();

    try {
      statusElement.textContent = "Requesting device...";
      await bleDevice.requestDevice();
      statusElement.textContent = "Getting service...";
      // await bleDevice.queryHistory();
      // return;
      const currentTime = await bleDevice.getCurrentTime();

      const timeElement = document.getElementById("time-value");
      if (timeElement) {
        timeElement.textContent = currentTime;
      }

      const timeElementCell = document.getElementById("time-value-cell");
      if (timeElementCell) {
        timeElementCell.textContent = currentTime;
      }

      const utcOffsetElement = document.getElementById("utcoffset-value");
      if (utcOffsetElement) {
        const utcOffset = await bleDevice.getUtcOffset();
        utcOffsetElement.textContent = utcOffset?.toString() ?? "-";
      }

      const sensorData = await bleDevice.querySensor();
      console.log(sensorData.humidity);
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
      console.error(error);
      if (error instanceof Error) {
        statusElement.textContent = `${error.name}: ${error.message}`;
        logInfo(error);
      }
    } finally {
      await delay(20000);
      bleDevice.cleanup();
      statusElement.textContent = "Done.";
    }
  });
})();

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
