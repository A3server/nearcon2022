const fetch = require('node-fetch');
const nearAPI = require('near-api-js');

const NearConfig = {
  networkId: "testnet",
  nodeUrl: "https://rpc.testnet.near.org",
  contractName: "dev-1663075021424-18509228924130",
  walletUrl: "https://wallet.testnet.near.org",
};
const MainNearConfig = {
  networkId: "mainnet",
  nodeUrl: "https://rpc.mainnet.near.org",
  contractName: "lennonwall.near",
  walletUrl: "https://wallet.near.org",
};

  
const decodeLine = (line) => {
    // console.log("line", line);
    let buf = Buffer.from(line, "base64");
    if (buf.length !== ExpectedLineLength) {
        throw new Error("Unexpected encoded line length");
    }
    let pixels = [];
    for (let i = 4; i < buf.length; i += 8) {
        let color = buf.readUInt32LE(i);
        let ownerIndex = buf.readUInt32LE(i + 4);
        pixels.push({
            color,
            ownerIndex,
        });
    }
    return pixels;
};


const BoardHeight = 50;
const NumLinesPerFetch = 50;
const ExpectedLineLength = 4 + 8 * BoardHeight;

async function main() {
    const { keyStores, KeyPair } = nearAPI;
const myKeyStore = new keyStores.InMemoryKeyStore();
const PRIVATE_KEY =
  "2wP7f68M69b9Lr2a14ziFxNJtsyEsiXwQYSsAj78ZJXZAv3sK2R6gpgH8Miga2JnkE2UDPETFYkcUBnREPXHF89n";
// creates a public / private key pair using the provided private key
const keyPair = KeyPair.fromString(PRIVATE_KEY);
// adds the keyPair you created to keyStore
await myKeyStore.setKey("testnet", "polpedu.testnet", keyPair);

const { connect } = nearAPI;

const connectionConfig = {
  networkId: "testnet",
  keyStore: myKeyStore, // first create a key store 
  nodeUrl: "https://rpc.testnet.near.org",
  walletUrl: "https://wallet.testnet.near.org",
  helperUrl: "https://helper.testnet.near.org",
  explorerUrl: "https://explorer.testnet.near.org",
};
const nearConnection = await connect(connectionConfig);

const _account = await nearConnection.account("polpedu.testnet");

      let lines = []
      let needLines = [];
    for (let i = 0; i < BoardHeight; ++i) {
        needLines.push(i);
    }
    let requestLines = [];
    for (let i = 0; i < needLines.length; i += NumLinesPerFetch) {
      requestLines.push(needLines.slice(i, i + NumLinesPerFetch));
    }
    const contract = new nearAPI.Contract(
        _account,
        NearConfig.contractName,
        {
          viewMethods: [
            "get_account",
            "get_account_by_index",
            "get_lines",
            "get_line_versions",
            "get_pixel_cost",
            "get_account_balance",
            "get_account_num_pixels",
            "get_account_id_by_index",
            "get_event_finish",
          ],
          changeMethods: ["draw", "buy_tokens", "select_farming_preference"],
        }
      );
  
      let results =  await Promise.all(
        requestLines.map((lines) => contract.get_lines({ lines }))
      ); 
      results = results.flat();
      requestLines = requestLines.flat();
      for (let i = 0; i < requestLines.length; ++i) {
        let lineIndex = requestLines[i];
        let line = decodeLine(results[i]);
        lines[lineIndex] = line;
        // console.log("line", lines);
      }

      renderCanvas(lines);

}

const intToColor = (c) => `#${c.toString(16).padStart(6, "0")}`;

function renderCanvas(lines) {
    let finallines = [];
    if (!lines) {
      return;
    }

    for (let i = 0; i < BoardHeight; ++i) {
      const line = lines[i];
      if (!line) {
        continue;
      }
      for (let j = 0; j < BoardHeight; ++j) {
        const p = line[j];
        const colorfill= intToColor(p.color);
        finallines.push(colorfill);
      }
    }
    console.log({pixels: finallines});

    
    //send a POST request to  http://127.0.0.1:5000/ with the finallines array as the body
    fetch(' http://127.0.0.1:5000/api/pixeltoimg', {
        method: 'POST',
        body: JSON.stringify({pixels: finallines}),
        headers: { 'Content-Type': 'application/json' },
    }).then(res => res.json())
    .then(json => console.log(json));

  }


main()