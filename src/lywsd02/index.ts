const CONNECTION_OPTIONS = {
  filters: [{ name: "LYWSD02" }],
};
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
    if (data === 0xff) {
      return "C";
    } else if (data === 0x01) {
      return "F";
    } else {
      throw new Error("Unexpected unit value returned");
    }
  }

  public cleanup() {
    if (this.server) {
      this.server.disconnect();
    }
  }
}
