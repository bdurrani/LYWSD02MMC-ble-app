const CONNECTION_OPTIONS = {
  filters: [{ name: "LYWSD02" }],
};

const TemparatureUnitValueMap = new Map<string, number>();
TemparatureUnitValueMap.set("C", 0xff);
TemparatureUnitValueMap.set("F", 0x01);

const ValueTemparatureUnitMap = new Map<number, string>();
ValueTemparatureUnitMap.set(0xff, "C");
ValueTemparatureUnitMap.set(0x01, "F");
/**
 * UUID for primary service
 */
const SERVICE_UUID = "ebe0ccb0-7a0a-4b0c-8a1a-6ff2997da3a6";
const TIME_CHARACTERISTIC_UUID = "ebe0ccb7-7a0a-4b0c-8a1a-6ff2997da3a6";
const UNITS_UUID = "ebe0ccbe-7a0a-4b0c-8a1a-6ff2997da3a6";

function buf2hex(buffer: ArrayBuffer) {
  // buffer is an ArrayBuffer
  return [...new Uint8Array(buffer)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

export class LYWSD02 {
  private device?: BluetoothDevice;
  private server?: BluetoothRemoteGATTServer;
  private _utcOffset?: number;
  private _service?: BluetoothRemoteGATTService;

  public async requestDevice() {
    this.device = await navigator.bluetooth.requestDevice(CONNECTION_OPTIONS);
    if (this.device === null) {
      throw new Error("bluetooth device not found");
    }

    if (!this.device.gatt) {
      throw new Error("bluetooth device gatt not found");
    }
    this.server = await this.device.gatt.connect();
    this._service = await this.server.getPrimaryService(SERVICE_UUID);
  }

  private validate(
    server?: BluetoothRemoteGATTServer
  ): server is BluetoothRemoteGATTServer {
    return server !== null && server !== undefined;
  }

  private validateService(
    service?: BluetoothRemoteGATTService
  ): service is BluetoothRemoteGATTService {
    return service !== null && service !== undefined;
  }

  public async getCurrentTime() {
    if (!this.validateService(this._service)) {
      throw new Error("Call requestDevice() before calling this");
    }

    const service = this._service; //await this.server.getPrimaryService(SERVICE_UUID);
    const characteristic = await service.getCharacteristic(
      TIME_CHARACTERISTIC_UUID
    );
    console.log("Reading current time");
    const reading = await characteristic.readValue();
    const currentTime = this.getTime(reading);
    return currentTime;
  }

  public async getUtcOffset() {
    if (!this._utcOffset) {
      await this.getCurrentTime();
    }
    return this._utcOffset;
  }

  private getTime(dataview: DataView) {
    this.printRawData(dataview);
    // First 4 bytes: Unix timestamp (in seconds, little endian)
    const timestamp = dataview.getUint32(0, true);
    const now = new Date();
    //   logInfo(`timestamp: ${timestamp} actual: ${now.getTime() / 1000}`);

    if (dataview.byteLength === 5) {
      // Last byte: Offset from UTC (in hours)
      this._utcOffset = dataview.getInt8(4);
      console.log(`UTC Offset: ${this._utcOffset}`);
    }
    //   logInfo(`UTC Offset: ${UtcOffset} expected ${-now.getTimezoneOffset() / 60}`);
    const currentTime = new Date(timestamp * 1000);
    //   logInfo(`time: ${currentTime.toLocaleTimeString()}`);
    return currentTime.toLocaleTimeString();
    // currentTimeElement.textContent = currentTime;
  }

  private printRawData(dataview: DataView) {
    console.log(
      `Raw data: ${buf2hex(dataview.buffer)} lenght: ${dataview.byteLength}`
    );
  }

  public async getUnits() {
    if (!this.validateService(this._service)) {
      throw new Error("Call requestDevice() before calling this");
    }

    const characteristic = await this._service.getCharacteristic(UNITS_UUID);
    console.log("Reading current units");
    const dataView = await characteristic.readValue();

    const data = dataView.getUint8(0);
    const unit = ValueTemparatureUnitMap.get(data);
    if (unit) {
      return unit;
    } else {
      throw new Error("Unexpected unit value returned");
    }
  }

  public async querySensor() {
    if (!this.validateService(this._service)) {
      throw new Error("Call requestDevice() before calling this");
    }

    const UUID_DATA = "ebe0ccc1-7a0a-4b0c-8a1a-6ff2997da3a6";
    // read 3 bytes using notify
    // https://github.com/h4/lywsd02/blob/364b228922540babc3600d9e2131ff32721c5120/lywsd02/client.py#L157
    const dataCharacteristic = await this._service.getCharacteristic(UUID_DATA);
    console.log("Reading sensor data");

    let dataEventPromiseResolver: any;
    const dataEventPromise = new Promise<any>((resolve) => {
      dataEventPromiseResolver = resolve;
    });

    const handler = async (event: any) => {
      const characteristic = event.target;
      const value = characteristic.value;
      await characteristic.stopNotifications();
      characteristic.removeEventListener("characteristicvaluechanged", handler);
      console.log("Received " + value);
      const temp = value.getInt16(0, true) / 100;
      const humidity = value.getUint8(2);
      console.log(`Temp: ${temp} Humidity: ${humidity}%`);
      dataEventPromiseResolver({ temp, humidity });
    };
    await dataCharacteristic.startNotifications();
    dataCharacteristic.addEventListener("characteristicvaluechanged", handler);
    const sensorData = await dataEventPromise;
    return {
      temparature: sensorData.temp,
      humidity: sensorData.humidity,
    };
  }

  // https://googlechrome.github.io/samples/web-bluetooth/notifications.html
  async handleCharacteristicValueChanged(event: any) {
    const characteristic = event.target;
    const value = characteristic.value;
    await characteristic.stopNotifications();
    characteristic.removeEventListener(
      "characteristicvaluechanged",
      this.handleCharacteristicValueChanged
    );
    console.log("Received " + value);
    const temp = value.getInt16(0, true) / 100;
    const humidity = value.getUint8(2);
    console.log(`Temp: ${temp} Humidity: ${humidity}%`);
    // log(`Temp: ${temp} Humidity: ${humidity}%`);

    // printRawData(reading);
    // TODO: Parse Heart Rate Measurement value.
    // See https://github.com/WebBluetoothCG/demos/blob/gh-pages/heart-rate-sensor/heartRateSensor.js
  }

  public cleanup() {
    if (this.server) {
      this.server.disconnect();
    }
  }
}
