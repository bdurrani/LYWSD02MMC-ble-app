/**
 * UUID for primary service
 */
const SERVICE_UUID = "ebe0ccb0-7a0a-4b0c-8a1a-6ff2997da3a6";
const TIME_CHARACTERISTIC_UUID = "ebe0ccb7-7a0a-4b0c-8a1a-6ff2997da3a6";
const UNITS_CHARACTERISTIC_UUID = "ebe0ccbe-7a0a-4b0c-8a1a-6ff2997da3a6";
const CONNECTION_OPTIONS = {
  filters: [{ name: "LYWSD02" }, { services: [SERVICE_UUID] }],
};

const TemparatureUnitValueMap = new Map<TemparatureUnit, number>();
TemparatureUnitValueMap.set(TemparatureUnit.Celcius, 0xff);
TemparatureUnitValueMap.set(TemparatureUnit.Fahrenheit, 0x01);

const ValueTemparatureUnitMap = new Map<number, TemparatureUnit>();
ValueTemparatureUnitMap.set(0xff, TemparatureUnit.Celcius);
ValueTemparatureUnitMap.set(0x01, TemparatureUnit.Fahrenheit);

const enum TemparatureUnit {
  Celcius = "C",
  Fahrenheit = "F",
}

function buf2hex(buffer: ArrayBuffer) {
  // buffer is an ArrayBuffer
  return [...new Uint8Array(buffer)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join(",");
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

    const characteristic = await this._service.getCharacteristic(
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

    if (dataview.byteLength === 5) {
      // Last byte: Offset from UTC (in hours)
      this._utcOffset = dataview.getInt8(4);
      console.log(`UTC Offset: ${this._utcOffset}`);
    }
    const currentTime = new Date(timestamp * 1000);
    return currentTime.toLocaleTimeString();
  }

  private printRawData(dataview: DataView) {
    console.log(
      `Raw data: ${buf2hex(dataview.buffer)} lenght: ${dataview.byteLength}`
    );
  }

  public async setTime() {
    if (!this.validateService(this._service)) {
      throw new Error("Call requestDevice() before calling this");
    }

    const characteristic = await this._service.getCharacteristic(
      TIME_CHARACTERISTIC_UUID
    );
    const buffer = new ArrayBuffer(5);
    const view = new DataView(buffer);

    const now = new Date();
    // First 4 bytes: Unix timestamp (in seconds, little endian)
    view.setUint32(0, now.getTime() / 1000, true);
    // Last byte: Offset from UTC (in hours)
    view.setInt8(4, -now.getTimezoneOffset() / 60);

    await characteristic.writeValue(buffer);
    console.log("Setting time..");
  }

  public async getUnits() {
    if (!this.validateService(this._service)) {
      throw new Error("Call requestDevice() before calling this");
    }

    const characteristic = await this._service.getCharacteristic(
      UNITS_CHARACTERISTIC_UUID
    );
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

    const UUID_CHARACTERISTIC_DATA = "ebe0ccc1-7a0a-4b0c-8a1a-6ff2997da3a6";
    // read 3 bytes using notify
    // https://github.com/h4/lywsd02/blob/364b228922540babc3600d9e2131ff32721c5120/lywsd02/client.py#L157
    const dataCharacteristic = await this._service.getCharacteristic(
      UUID_CHARACTERISTIC_DATA
    );
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

  public async queryHistory() {
    // Last idx 152          READ NOTIFY
    const UUID_HISTORY = "ebe0ccbc-7a0a-4b0c-8a1a-6ff2997da3a6";
    if (!this.validateService(this._service)) {
      throw new Error("Call requestDevice() before calling this");
    }

    // read 3 bytes using notify
    // https://github.com/h4/lywsd02/blob/364b228922540babc3600d9e2131ff32721c5120/lywsd02/client.py#L157
    const historyCharacteristic = await this._service.getCharacteristic(
      UUID_HISTORY
    );
    const descriptors = (await historyCharacteristic.getDescriptors(0x2902))[0];
    // await descriptors.writeValue(new Uint8Array([0x1, 0x0]));

    console.log("Reading history data");

    let dataEventPromiseResolver: any;
    const dataEventPromise = new Promise<any>((resolve) => {
      dataEventPromiseResolver = resolve;
    });

    const handler = async (event: any) => {
      const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
      const value = characteristic.value as DataView;
      // await characteristic.stopNotifications();
      // characteristic.removeEventListener("characteristicvaluechanged", handler);
      this.printRawData(value);
      // (idx, ts, max_temp, max_hum, min_temp, min_hum) = struct.unpack_from('<IIhBhB', data)
      // < = little endian
      // I = unsigned int, 4 bytes
      // h = short, 2 bytes
      // B = unsigned char, 1 byte
      let byteOffset = 0;
      const idx = value.getUint32(byteOffset, true);
      byteOffset += 4;
      const ts = value.getUint32(byteOffset, true);

      const currentTime = new Date(ts * 1000);
      const timeStr = currentTime.toISOString();
      byteOffset += 4;
      const maxTemp = value.getInt16(byteOffset, true) / 100;
      byteOffset += 2;
      const maxHumidity = value.getUint8(byteOffset);
      byteOffset += 1;
      const minTemp = value.getInt16(byteOffset, true) / 100;
      byteOffset += 2;
      const minHumidity = value.getUint8(byteOffset);

      console.log(
        `${idx} time: ${timeStr} maxtemp: ${maxTemp} minTemp: ${minTemp} maxHumidity: ${maxHumidity} minHumidity: ${minHumidity}`
      );
      dataEventPromiseResolver(value);
    };

    await historyCharacteristic.startNotifications();
    historyCharacteristic.addEventListener(
      "characteristicvaluechanged",
      handler
    );
    const sensorData = await dataEventPromise;
    return;
  }

  public cleanup() {
    if (this.server) {
      this.server.disconnect();
    }
  }
}
