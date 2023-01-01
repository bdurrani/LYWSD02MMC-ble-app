import { LYWSD02 } from "./lywsd02";

const SERVICE_UUID = "ebe0ccb0-7a0a-4b0c-8a1a-6ff2997da3a6";
const TIME_CHARACTERISTIC_UUID = "ebe0ccb7-7a0a-4b0c-8a1a-6ff2997da3a6";
const UNITS_UUID = "ebe0ccbe-7a0a-4b0c-8a1a-6ff2997da3a6";

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

async function getCurrentTime(server: BluetoothRemoteGATTServer) {
  const service = await server.getPrimaryService(SERVICE_UUID);
  const characteristic = await service.getCharacteristic(
    TIME_CHARACTERISTIC_UUID
  );
  console.log("Reading current time");
  const reading = await characteristic.readValue();
  const currentTime = getTime(reading);

  const timeElement = document.getElementById("time-value");
  if (timeElement === null) {
    console.error("no temp element found");
  } else {
    timeElement.textContent = currentTime;
  }
}

function getTime(dataview: DataView) {
  printRawData(dataview);
  // const now = new Date();
  // First 4 bytes: Unix timestamp (in seconds, little endian)
  const timestamp = dataview.getUint32(0, true);
  const now = new Date();
  logInfo(`timestamp: ${timestamp} actual: ${now.getTime() / 1000}`);

  // Last byte: Offset from UTC (in hours)
  const UtcOffset = dataview.getInt8(4);
  logInfo(`UTC Offset: ${UtcOffset} expected ${-now.getTimezoneOffset() / 60}`);
  const currentTime = new Date(timestamp * 1000);
  logInfo(`time: ${currentTime.toLocaleTimeString()}`);
  return currentTime.toLocaleTimeString();
  // currentTimeElement.textContent = currentTime;
}

function buf2hex(buffer: ArrayBuffer) {
  // buffer is an ArrayBuffer
  return [...new Uint8Array(buffer)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

function printRawData(dataview: DataView) {
  logInfo(
    `Raw data: ${buf2hex(dataview.buffer)} lenght: ${dataview.byteLength}`
  );
}

(async () => {
  console.log("hello worldaaa");
  const button = document.getElementById("ble-button");

  if (button === null) {
    return;
  }
  button.addEventListener("click", async () => {
    const test = new LYWSD02();
    const options = {
      filters: [{ name: "LYWSD02" }],
    };

    const tempElement = document.getElementById("temperature-value");
    if (tempElement === null) {
      console.error("no temp element found");
    } else {
      tempElement.textContent = "hello tmop ℃";
    }

    statusElement.textContent = "Requesting device...";
    const device = await navigator.bluetooth.requestDevice(options);
    if (device === null) {
      throw new Error("bluetooth device not found");
    }

    if (!device.gatt) {
      throw new Error("bluetooth device gatt not found");
    }

    statusElement.textContent = "Connecting...";
    let server: BluetoothRemoteGATTServer | null = null;
    try {
      server = await device.gatt.connect();
      statusElement.textContent = "Getting service...";
      await getCurrentTime(server);
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        statusElement.textContent = `${error.name}: ${error.message}`;
        logInfo(error);
      }
    } finally {
      if (server) {
        server.disconnect();
      }
      statusElement.textContent = "Done.";
    }
  });
})();
