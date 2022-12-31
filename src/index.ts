const statusElement = document.getElementById("status");
if (statusElement === null) {
  throw new Error("no status element found");
}

const logElement = document.querySelector("#log");
if (logElement === null) {
  throw new Error("no status element found");
}

function logInput(input: any) {
  info(input);
  console.log(input);
}

function logInfo() {
  const line = Array.prototype.slice
    .call(arguments)
    .map(function (argument) {
      return typeof argument === "string" ? argument : JSON.stringify(argument);
    })
    .join(" ");

  logElement!.textContent += line + "\n";
}

(async () => {
  console.log("hello world");
  const button = document.getElementById("ble-button");

  if (button === null) {
    return;
  }
  button.addEventListener("click", async () => {
    const options = {
      filters: [{ name: "LYWSD02" }],
    };

    statusElement.textContent = "Requesting device...";
    const device = await navigator.bluetooth.requestDevice(options);
    if (device === null) {
      throw new Error("bluetooth device not found");
    }

    if (!device.gatt) {
      throw new Error("bluetooth device gatt not found");
    }

    statusElement.textContent = "Connecting...";
    let server: BluetoothRemoteGATTServer;
    try {
      server = await device.gatt.connect();
      statusElement.textContent = "Getting service...";
    } catch (error) {}
  });
})();
