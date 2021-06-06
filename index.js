"use strict";

const status = document.getElementById("status");
const log = console.log;
function buf2hex(buffer) {
  // buffer is an ArrayBuffer
  return [...new Uint8Array(buffer)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

function printRawData(dataview) {
  console.log(
    `Raw data: ${buf2hex(dataview.buffer)} lenght: ${dataview.byteLength}`
  );
}

function printString(dw) {
  const decoder = new TextDecoder("utf-8");
  console.log(`string: ${decoder.decode(dw.buffer)}`);
}

function printInt32(dw) {
  console.log(`int32: ${dw.getInt32()}`);
}

function printUInt32(dw) {
  console.log(`uint32: ${dw.getUint32()}`);
}

function printInt8(dw) {
  console.log(`int8: ${dw.getInt8()}`);
}

function getTime(dataview) {
  printRawData(dataview);
  // const now = new Date();
  // First 4 bytes: Unix timestamp (in seconds, little endian)
  const timestamp = dataview.getUint32(0, true);
  const now = new Date();
  console.log(`timestamp: ${timestamp} actual: ${now.getTime()/1000}`);


  // Last byte: Offset from UTC (in hours)
  const UtcOffset = dataview.getInt8(4);
  console.log(`UTC Offset: ${UtcOffset} expected ${-now.getTimezoneOffset()/60}`);
  console.log(`time: ${new Date(timestamp*1000)}`);

  // const buffer = new ArrayBuffer(5);
  // const view = new DataView(buffer);
  // view.setUint32(0, now.getTime() / 1000, true);
  // view.setInt8(4, -now.getTimezoneOffset() / 60);
  // printRawData(view)
}

async function readAllCharacteristics(characteristics) {
  for (const characteristic of characteristics) {
    const { uuid } = characteristic;
    try {
      if (characteristic.properties.read) {
        const t = await characteristic.getDescriptors();
        console.log(`Reading characteristic: ${uuid}`);
        const hwRev = await characteristic.readValue();
        if (hwRev.byteLength === 0) {
          console.log('no data in characteristic');
          continue;
        }
        printRawData(hwRev);
        printString(hwRev);
        printInt32(hwRev);
        printUInt32(hwRev);
        printInt8(hwRev);
      } else {
        console.log(`Cannot read UUID: ${uuid}`);
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
document.getElementById("set").addEventListener("click", async () => {
  const SERVICE_UUID = "ebe0ccb0-7a0a-4b0c-8a1a-6ff2997da3a6";
  const CHARACTERISTIC_UUID = "ebe0ccb7-7a0a-4b0c-8a1a-6ff2997da3a6";

  const NOTIFY_CHARACTERISTIC_UUID = "ebe0ccbc-7a0a-4b0c-8a1a-6ff2997da3a6";

  const DEVICE_INFORMATION = "device_information";

  const options = {
    filters: [{ name: "LYWSD02" }],
    optionalServices: [SERVICE_UUID, DEVICE_INFORMATION],
    services: ["environmental_sensing"],
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

    const service = await server.getPrimaryService(SERVICE_UUID);
    // const service = await server.getPrimaryService("battery_service");
    // const characteristic = await service.getCharacteristic("battery_level");
    status.textContent = "Getting characteristic...";
    const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
    const allChars = await service.getCharacteristics();
    await readAllCharacteristics(allChars);

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

    console.log('Reading current time');
    const reading = await characteristic.readValue();
    getTime(reading);

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
  } finally {
    if (server) {
      server.disconnect();
    }
    status.textContent = "Done.";
  }
});
