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

(async () => {
  const button = document.getElementById("ble-button");

  button?.addEventListener("click", async () => {
    const bleDevice = new LYWSD02();

    try {
      statusElement.textContent = "Requesting device...";
      await bleDevice.requestDevice();
      statusElement.textContent = "Getting service...";
      const currentTime = await bleDevice.getCurrentTime();

      const timeElement = document.getElementById("time-value");
      if (timeElement === null) {
        console.error("no temp element found");
      } else {
        timeElement.textContent = currentTime;
      }

      const utcOffsetElement = document.getElementById("utcoffset-value");
      if (utcOffsetElement) {
        const utcOffset = await bleDevice.getUtcOffset();
        utcOffsetElement.textContent = utcOffset?.toString() ?? "-";
      }

      const unit = await bleDevice.getUnits();
      const tempElement = document.getElementById("temperature-value");
      if (tempElement === null) {
        console.error("no temp element found");
      } else {
        tempElement.textContent = `°${unit}`;
      }

      const sensorData = await bleDevice.querySensor();
      console.log(sensorData.humidity);
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        statusElement.textContent = `${error.name}: ${error.message}`;
        logInfo(error);
      }
    } finally {
      // if (server) {
      //   server.disconnect();
      // }
      bleDevice.cleanup();
      statusElement.textContent = "Done.";
    }
  });
})();
