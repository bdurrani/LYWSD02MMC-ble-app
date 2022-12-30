"use strict";

const SERVICE_UUID = "ebe0ccb0-7a0a-4b0c-8a1a-6ff2997da3a6";
const TIME_CHARACTERISTIC_UUID = "ebe0ccb7-7a0a-4b0c-8a1a-6ff2997da3a6";
const UNITS_UUID = "ebe0ccbe-7a0a-4b0c-8a1a-6ff2997da3a6";

// List of service names supported
// https://github.com/chromium/chromium/blob/d7da0240cae77824d1eda25745c4022757499131/third_party/blink/renderer/modules/bluetooth/bluetooth_uuid.cc
const DEVICE_INFORMATION = "device_information";

// This is not supported it seems
const ENVIRONMENTAL_SENSING = "environmental_sensing";

const NOTIFY_CHARACTERISTIC_UUID = "ebe0ccbc-7a0a-4b0c-8a1a-6ff2997da3a6";

const status = document.getElementById("status");
const logSelector = document.querySelector("#log");
const currentTimeElement = document.querySelector("#current-time");

function log(input) {
  info(input);
  console.log(input);
}

function info() {
  const line = Array.prototype.slice
    .call(arguments)
    .map(function (argument) {
      return typeof argument === "string" ? argument : JSON.stringify(argument);
    })
    .join(" ");

  logSelector.textContent += line + "\n";
}

function buf2hex(buffer) {
  // buffer is an ArrayBuffer
  return [...new Uint8Array(buffer)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

function printRawData(dataview) {
  log(`Raw data: ${buf2hex(dataview.buffer)} lenght: ${dataview.byteLength}`);
}

function printString(dw) {
  const decoder = new TextDecoder("utf-8");
  log(`string: ${decoder.decode(dw.buffer)}`);
}

function printInt32(dw) {
  log(`int32: ${dw.getInt32()}`);
}

function printUInt32(dw) {
  log(`uint32: ${dw.getUint32()}`);
}

function printInt8(dw) {
  log(`int8: ${dw.getInt8()}`);
}

async function queryCurrentTime(server) {
  const service = await server.getPrimaryService(SERVICE_UUID);
  const characteristic = await service.getCharacteristic(
    TIME_CHARACTERISTIC_UUID
  );
  console.log("Reading current time");
  const reading = await characteristic.readValue();
  getTime(reading);
}

async function queryUnits(server) {
  const service = await server.getPrimaryService(SERVICE_UUID);
  const characteristic = await service.getCharacteristic(UNITS_UUID);
  console.log("Reading current units");
  const reading = await characteristic.readValue();
  printRawData(reading);
  // Returns a unsigned byte
  const unitValue = reading.getUint8(0);
  if (unitValue === 0xff) {
    log("Found celcius units");
  } else if (unitValue == 0x1) {
    log("Found Fahrenheit");
  } else {
    log("No units found");
  }
}

async function queryBattery(server) {
  const service = await server.getPrimaryService(SERVICE_UUID);
  const UUID_BATTERY = "ebe0ccc4-7a0a-4b0c-8a1a-6ff2997da3a6";
  // read 1 byte
  const characteristic = await service.getCharacteristic(UUID_BATTERY);
  console.log("Reading current battery");
  const reading = await characteristic.readValue();
  printRawData(reading);
  // Returns a unsigned byte
  const batteryValue = reading.getUint8(0);
  log(`Battery value: ${batteryValue}`);
  return;
}

async function querySensor(server) {
  const service = await server.getPrimaryService(SERVICE_UUID);
  const UUID_DATA = "ebe0ccc1-7a0a-4b0c-8a1a-6ff2997da3a6";
  // read 3 bytes using notify
  // https://github.com/h4/lywsd02/blob/364b228922540babc3600d9e2131ff32721c5120/lywsd02/client.py#L157
  const characteristic = await service.getCharacteristic(UUID_DATA);
  console.log("Reading sensor data");
  await characteristic.startNotifications();
  characteristic.addEventListener(
    "characteristicvaluechanged",
    handleCharacteristicValueChanged
  );
  console.log("Notifications have been started.");
  return;
}

// https://googlechrome.github.io/samples/web-bluetooth/notifications.html
async function handleCharacteristicValueChanged(event) {
  const characteristic = event.target;
  const value = characteristic.value;
  await characteristic.stopNotifications();
  characteristic.removeEventListener(
    "characteristicvaluechanged",
    handleCharacteristicValueChanged
  );
  console.log("Received " + value);
  const temp = value.getInt16(0, true) / 100;
  const humidity = value.getUint8(2);
  log(`Temp: ${temp} Humidity: ${humidity}%`);

  // printRawData(reading);
  // TODO: Parse Heart Rate Measurement value.
  // See https://github.com/WebBluetoothCG/demos/blob/gh-pages/heart-rate-sensor/heartRateSensor.js
}

async function readBlocks(server) {
  // const TIME_CHARACTERISTIC_UUID = "ebe0ccb7-7a0a-4b0c-8a1a-6ff2997da3a6";
  const WRITE_SERVICE_UUID = "ebe0ccb0-7a0a-4b0c-8a1a-6ff2997da3a6";
  const WRITE_CHARACTERISTIC_UUID = "ebe0ccd2-7a0a-4b0c-8a1a-6ff2997da3a6";
  const service = await server.getPrimaryService(WRITE_SERVICE_UUID);
  const characteristic = await service.getCharacteristic(
    WRITE_CHARACTERISTIC_UUID
  );

  const writeBuffer = new ArrayBuffer(2);
  const writeDataView = new DataView(writeBuffer);

  const writeData = 12289;
  writeDataView.setInt16(0, writeData);
  await characteristic.writeValue(writeBuffer);

  const READ_CHARACTERISTIC_UUID = "ebe0ccb9-7a0a-4b0c-8a1a6ff2997da3a6";
  const readCharacteristic = await service.getCharacteristic(
    READ_CHARACTERISTIC_UUID
  );

  readCharacteristic.on("characteristicvaluechanged", (one, two) => {
    console.log(`${one} ${two}`);
  });

  await readCharacteristic.readValue();
}

function getTime(dataview) {
  printRawData(dataview);
  // const now = new Date();
  // First 4 bytes: Unix timestamp (in seconds, little endian)
  const timestamp = dataview.getUint32(0, true);
  const now = new Date();
  log(`timestamp: ${timestamp} actual: ${now.getTime() / 1000}`);

  // Last byte: Offset from UTC (in hours)
  const UtcOffset = dataview.getInt8(4);
  log(`UTC Offset: ${UtcOffset} expected ${-now.getTimezoneOffset() / 60}`);
  const currentTime = new Date(timestamp * 1000);
  log(`time: ${currentTime}`);
  currentTimeElement.textContent = currentTime;
}

async function readAllCharacteristics(characteristics) {
  for (const characteristic of characteristics) {
    const { uuid } = characteristic;
    try {
      if (characteristic.properties.read) {
        const t = await characteristic.getDescriptors();
        log(`Reading characteristic: ${uuid}`);
        const hwRev = await characteristic.readValue();
        if (hwRev.byteLength === 0) {
          log("no data in characteristic \n");
          continue;
        }
        printRawData(hwRev);
        printString(hwRev);
        printInt32(hwRev);
        printUInt32(hwRev);
        printInt8(hwRev);
      } else {
        log(`Cannot read UUID: ${uuid}`);
      }
    } catch (error) {
      console.error(`Error reading UUID: ${uuid}. ${error}`);
    }
  }
}

const logDataView = (labelOfDataSource, key, valueDataView) => {
  const hexString = [...new Uint8Array(valueDataView.buffer)]
    .map((b) => {
      return b.toString(16).padStart(2, "0");
    })
    .join(" ");
  const textDecoder = new TextDecoder("ascii");
  const asciiString = textDecoder.decode(valueDataView.buffer);
  log(
    `  ${labelOfDataSource} Data: ` +
      key +
      "\n    (Hex) " +
      hexString +
      "\n    (ASCII) " +
      asciiString
  );
};

async function setupAdvertiseLogging(device) {
  device.addEventListener("advertisementreceived", (event) => {
    log("Advertisement received.");
    log("  Device Name: " + event.device.name);
    log("  Device ID: " + event.device.id);
    log("  RSSI: " + event.rssi);
    log("  TX Power: " + event.txPower);
    log("  UUIDs: " + event.uuids);
    event.manufacturerData.forEach((valueDataView, key) => {
      logDataView("Manufacturer", key, valueDataView);
    });
    event.serviceData.forEach((valueDataView, key) => {
      logDataView("Service", key, valueDataView);
    });
  });

  await device.watchAdvertisements();
}

async function queryAllServices(server) {
  const services = await server.getPrimaryServices();

  for (const service of services) {
    log(`Service found, UUID: ${service.uuid}`);
  }
  log("");
  return services;
}

document.getElementById("set").addEventListener("click", async () => {
  const options = {
    filters: [{ name: "LYWSD02" }],
    // example of using short UUID
    // that I grabbed via nRF Connect
  };

  let server = null;
  try {
    status.textContent = "Requesting device...";
    const device = await navigator.bluetooth.requestDevice(options);

    // await setupAdvertiseLogging(device);
    // return;

    status.textContent = "Connecting...";
    server = await device.gatt.connect();
    status.textContent = "Getting service...";

    // const service = await server.getPrimaryService(SERVICE_UUID);
    // const anotherService = await server.getPrimaryService('FEF5');
    // const testServiceUUID = "0000fef5-0000-1000-8000-00805F9B34FB";
    // const anotherService = await server.getPrimaryService(testServiceUUID);

    // await queryAllServices(server);
    // const service = await server.getPrimaryService("battery_service");
    // const characteristic = await service.getCharacteristic("battery_level");
    await queryCurrentTime(server);
    await queryUnits(server);
    await queryBattery(server);
    await querySensor(server);

    // await readBlocks(server);
    // const allChars = await service.getCharacteristics();
    // await readAllCharacteristics(allChars);

    // const notifyCharacteristic = await service.getCharacteristic(
    //   NOTIFY_CHARACTERISTIC_UUID
    // );

    // if (notifyCharacteristic.properties.notify) {
    //   notifyCharacteristic.addEventListener(
    //     "characteristicvaluechanged",
    //     (event) => {
    //       console.log(`Received heart rate measurement: ${event.target.value}`);
    //     }
    //   );
    //   await notifyCharacteristic.startNotifications();
    // }

    // const hwrevService = await server.getPrimaryService(DEVICE_INFORMATION);
    // const chars = await hwrevService.getCharacteristics();
    // console.log(chars);
    // for (const characteristic of chars) {
    //   const { uuid } = characteristic;
    //   if (
    //     BluetoothUUID.getCharacteristic("hardware_revision_string") === uuid
    //   ) {
    //     console.log(`Reading characteristic: ${uuid}`);
    //     const hwRev = await characteristic.readValue();
    //     printRawData(hwRev);
    //     const decoder = new TextDecoder("utf-8");
    //     console.log(`HW Revision: ${decoder.decode(hwRev)}`);
    //   }
    // }

    // const hwChar = chars[3];
    // const buffer = new ArrayBuffer(5);
    // const view = new DataView(buffer);

    // const now = new Date();
    // // First 4 bytes: Unix timestamp (in seconds, little endian)
    // view.setUint32(0, now.getTime() / 1000, true);
    // // Last byte: Offset from UTC (in hours)
    // view.setInt8(4, -now.getTimezoneOffset() / 60);

    // status.textContent = "Setting time...";
    // await characteristic.writeValue(buffer);

    // server.disconnect();
    // status.textContent = "Done.";
  } catch (e) {
    status.textContent = `${e.name}: ${e.message}`;
    log(e);
  } finally {
    await delay(9000);
    log("disconnecting from server");
    if (server) {
      server.disconnect();
    }
    status.textContent = "Done.";
  }
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
