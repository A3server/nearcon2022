import "./App.scss";
import "./gh-fork-ribbon.css";
import React from "react";
import BN from "bn.js";
import * as nearAPI from "near-api-js";
import { AlphaPicker, HuePicker, GithubPicker } from "react-color";
import { Weapons } from "./Weapons";
import Timer from "react-compound-timer";
import { intToColor, intToColorWithAlpha, rgbaToInt, generateGamma, imgColorToInt, int2hsv, transparentColor, decodeLine, BoardHeight, BoardWidth, NumLinesPerFetch, ExpectedLineLength, CellHeight, CellWidth, MaxNumColors, BatchOfPixels, BatchTimeout, RefreshBoardTimeout, MaxWorkTime } from "./util/utils";
import MainLogo from "./assets/MainLogo";
import Popup from 'reactjs-popup';
import UserIcon from "./assets/UserIcon";
import LogoutIcon from "./assets/LogoutIcon";
import 'reactjs-popup/dist/index.css';
import santana from "./assets/santana.png";
import edu from "./assets/edu.png";
import lucas from "./assets/lucas.png";
import gouveia from "./assets/gouveia.png";
import pvaz from "./assets/pvaz.png";
import polvo from "./assets/polvo.svg";
import built from "./assets/built.svg";
import insta from "./assets/insta.svg";
import telegram from "./assets/telegram.svg";
import discord from "./assets/discord.svg";
import git from "./assets/git.svg";

const PixelPrice = new BN("10000000000000000000000");
const IsMainnet = window.location.hostname === "berryclub.io";
const TestNearConfig = {
  networkId: "testnet",
  nodeUrl: "https://rpc.testnet.near.org",
  contractName: "dev-1663075021424-18509228924130",
  walletUrl: "https://wallet.testnet.near.org",
};
const MainNearConfig = {
  networkId: "mainnet",
  nodeUrl: "https://rpc.mainnet.near.org",
  contractName: "berryclub.ek.near",
  walletUrl: "https://wallet.near.org",
};
const NearConfig = IsMainnet ? MainNearConfig : TestNearConfig;


const Berry = {
  Avocado: "Avocado",
  Banana: "Banana",
};

const WeaponsCheat = "idkfa";

class App extends React.Component {
  constructor(props) {
    super(props);

    const colors = [
      "#000000",
      "#666666",
      "#aaaaaa",
      "#FFFFFF",
      "#F44E3B",
      "#D33115",
      "#9F0500",
      "#FE9200",
      "#E27300",
      "#C45100",
      "#FCDC00",
      "#FCC400",
      "#FB9E00",
      "#DBDF00",
      "#B0BC00",
      "#808900",
      "#A4DD00",
      "#68BC00",
      "#194D33",
      "#68CCCA",
      "#16A5A5",
      "#0C797D",
      "#73D8FF",
      "#009CE0",
      "#0062B1",
      "#AEA1FF",
      "#7B64FF",
      "#653294",
      "#FDA1FF",
      "#FA28FF",
      "#AB149E",
    ].map((c) => c.toLowerCase());
    // const currentColor = parseInt(colors[Math.floor(Math.random() * colors.length)].substring(1), 16);
    const currentColor = parseInt(colors[0].substring(1), 16);
    const defaultAlpha = 0.25;

    const timeMs = new Date().getTime();
    const eventEndEstimated =
      timeMs -
      ((timeMs - new Date("2022-09-14 10:00:00 UTC")));
    this.state = {
      connected: false,
      signedIn: false,
      accountId: null,
      pendingPixels: 0,
      boardLoaded: false,
      selectedCell: null,
      alpha: defaultAlpha,
      currentColor,
      pickerColor: intToColorWithAlpha(currentColor, defaultAlpha),
      colors,
      gammaColors: generateGamma(0),
      pickingColor: false,
      owners: [],
      accounts: {},
      highlightedAccountIndex: -1,
      selectedOwnerIndex: false,
      farmingBanana: false,
      weaponsOn: false,
      weaponsCodePosition: 0,
      eventEndTime: new Date(eventEndEstimated),
      watchMode: false,

    };

    this._buttonDown = false;
    this._oldCounts = {};
    this._numFailedTxs = 0;
    this._balanceRefreshTimer = null;
    this.canvasRef = React.createRef();
    this._context = false;
    this._lines = false;
    this._queue = [];
    this._pendingPixels = [];
    this._refreshBoardTimer = null;
    this._sendQueueTimer = null;
    this._stopRefreshTime = new Date().getTime() + MaxWorkTime;
    this._accounts = {};

    this._initNear().then(() => {
      this.setState(
        {
          connected: true,
          signedIn: !!this._accountId,
          accountId: this._accountId,
          ircAccountId: this._accountId.replace(".", "_"),
          eventEndTime: this.eventEndTime,
        },
        () => {
          console.log(this.state.eventEndTime);
          if (window.location.hash.indexOf("watch") >= 0) {
            setTimeout(() => this.enableWatchMode(), 500);
          }
        }
      );
    });
  }

  componentDidMount() {
    console.log(this.state.endtime)
    const canvas = this.canvasRef.current;
    this._context = canvas.getContext("2d");

    const click = async () => {
      if (this.state.watchMode) {
        return;
      }
      if (this.state.rendering) {
        await this.drawImg(this.state.selectedCell);
      } else if (this.state.pickingColor) {
        this.pickColor(this.state.selectedCell);
      } else {
        this.saveColor();
        await this.drawPixel(this.state.selectedCell);
      }
    };

    const mouseMove = (e) => {
      let x, y;
      if ("touches" in e) {
        if (e.touches.length > 1) {
          return true;
        } else {
          const rect = e.target.getBoundingClientRect();
          x = e.targetTouches[0].clientX - rect.left;
          y = e.targetTouches[0].clientY - rect.top;
        }
      } else {
        x = e.offsetX;
        y = e.offsetY;
      }
      x = Math.trunc((x / e.target.clientWidth) * BoardWidth);
      y = Math.trunc((y / e.target.clientHeight) * BoardWidth);
      let cell = null;
      if (x >= 0 && x < BoardWidth && y >= 0 && y < BoardHeight) {
        cell = { x, y };
      }
      if (JSON.stringify(cell) !== JSON.stringify(this.state.selectedCell)) {
        this.setState(
          {
            selectedCell: cell,
            selectedOwnerIndex:
              this._lines &&
              cell &&
              this._lines[cell.y] &&
              this._lines[cell.y][cell.x].ownerIndex,
          },
          async () => {
            this.renderCanvas();
            if (this.state.selectedCell !== null && this._buttonDown) {
              await click();
            }
          }
        );
      }
      e.preventDefault();
      return false;
    };

    canvas.addEventListener("mousemove", mouseMove);
    canvas.addEventListener("touchmove", mouseMove);

    const mouseDown = async (e) => {
      this._buttonDown = true;
      if (this.state.selectedCell !== null) {
        await click();
      }
    };

    canvas.addEventListener("mousedown", mouseDown);
    canvas.addEventListener("touchstart", mouseDown);

    const unselectCell = () => {
      this.setState(
        {
          selectedCell: null,
        },
        () => this.renderCanvas()
      );
    };

    const mouseUp = async (e) => {
      this._buttonDown = false;
      if ("touches" in e) {
        unselectCell();
      }
    };

    canvas.addEventListener("mouseup", mouseUp);
    canvas.addEventListener("touchend", mouseUp);

    canvas.addEventListener("mouseleave", unselectCell);

    canvas.addEventListener("mouseenter", (e) => {
      if (this._buttonDown) {
        if (!("touches" in e) && !(e.buttons & 1)) {
          this._buttonDown = false;
        }
      }
    });

    document.addEventListener("keydown", (e) => {
      e.altKey && this.enablePickColor();
    });

    document.addEventListener("keyup", (e) => {
      if (this.state.weaponsCodePosition < WeaponsCheat.length) {
        if (
          e.key.toLowerCase() === WeaponsCheat[this.state.weaponsCodePosition]
        ) {
          this.setState({
            weaponsCodePosition: this.state.weaponsCodePosition + 1,
            weaponsOn:
              this.state.weaponsCodePosition + 1 === WeaponsCheat.length,
          });
        } else {
          this.setState({
            weaponsCodePosition: 0,
          });
        }
      }
      !e.altKey && this.disablePickColor();
    });
  }

  enablePickColor() {
    this.setState(
      {
        pickingColor: true,
      },
      () => {
        this.renderCanvas();
      }
    );
  }

  disablePickColor() {
    this.setState(
      {
        pickingColor: false,
      },
      () => {
        this.renderCanvas();
      }
    );
  }

  pickColor(cell) {
    if (!this.state.signedIn || !this._lines || !this._lines[cell.y]) {
      return;
    }
    const color = this._lines[cell.y][cell.x].color;

    this.setState(
      {
        currentColor: color,
        alpha: 1,
        pickerColor: intToColorWithAlpha(color, 1),
        gammaColors: generateGamma(int2hsv(color)[0]),
        pickingColor: false,
      },
      () => {
        this.renderCanvas();
      }
    );
  }

  async refreshAllowance() {
    alert(
      "You're out of access key allowance. Need sign in again to refresh it"
    );
    await this.logOut();
    await this.requestSignIn();
  }

  async _sendQueue() {
    const pixels = this._queue.slice(0, BatchOfPixels);
    this._queue = this._queue.slice(BatchOfPixels);
    this._pendingPixels = pixels;

    try {
      await this._contract.draw(
        {
          pixels,
        },
        new BN("75000000000000")
      );
      this._numFailedTxs = 0;
    } catch (error) {
      const msg = error.toString();
      if (msg.indexOf("does not have enough balance") !== -1) {
        await this.refreshAllowance();
        return;
      }
      console.log("Failed to send a transaction", error);
      this._numFailedTxs += 1;
      if (this._numFailedTxs < 3) {
        this._queue = this._queue.concat(this._pendingPixels);
        this._pendingPixels = [];
      } else {
        this._pendingPixels = [];
        this._queue = [];
      }
    }
    try {
      await Promise.all([this.refreshBoard(true), this.refreshAccountStats()]);
    } catch (e) {
      // ignore
    }
    this._pendingPixels.forEach((p) => {
      if (this._pending[p.y][p.x] === p.color) {
        this._pending[p.y][p.x] = -1;
      }
    });
    this._pendingPixels = [];
  }

  async _pingQueue(ready) {
    if (this._sendQueueTimer) {
      clearTimeout(this._sendQueueTimer);
      this._sendQueueTimer = null;
    }

    if (
      this._pendingPixels.length === 0 &&
      (this._queue.length >= BatchOfPixels || ready)
    ) {
      await this._sendQueue();
    }
    if (this._queue.length > 0) {
      this._sendQueueTimer = setTimeout(async () => {
        await this._pingQueue(true);
      }, BatchTimeout);
    }
  }

  async drawImg(cell) {
    if (!this.state.signedIn || !this._lines || !this._lines[cell.y]) {
      return;
    }

    const balance = this.state.account ? this.state.account.avocadoBalance : 0;
    if (
      !this._isEventOver() &&
      balance - this.state.pendingPixels < this.state.avocadoNeeded
    ) {
      return;
    }

    const img = this.imageData;
    const w = img.width;
    const h = img.height;
    const x = cell.x - Math.trunc(w / 2);
    const y = cell.y - Math.trunc(h / 2);
    const d = new Uint32Array(this.imageData.data.buffer);
    for (let i = 0; i < h; ++i) {
      for (let j = 0; j < w; ++j) {
        const imgColor = d[i * w + j];
        if (
          imgColor &&
          y + i >= 0 &&
          y + i < BoardHeight &&
          x + j >= 0 &&
          x + j < BoardWidth
        ) {
          const bgColor = this._lines[y + i]
            ? this._lines[y + i][x + j].color
            : 0;
          const color = imgColorToInt(imgColor, bgColor);
          if (color !== bgColor) {
            this._queue.push({
              x: x + j,
              y: y + i,
              color,
            });
          }
        }
      }
    }
    this.setState({
      rendering: false,
    });

    this._stopRefreshTime = new Date().getTime() + MaxWorkTime;
    await this._pingQueue(false);
  }

  async drawPixel(cell) {
    if (!this.state.signedIn || !this._lines || !this._lines[cell.y]) {
      return;
    }
    const balance = this.state.account ? this.state.account.avocadoBalance : 0;
    console.log(balance - this.state.pendingPixels < 1)
    if (!this._isEventOver() && balance - this.state.pendingPixels < 1) {
      return;
    }

    const bgColor = this._lines[cell.y] ? this._lines[cell.y][cell.x].color : 0;
    const cb = this.state.currentColor & 255;
    const cg = (this.state.currentColor >> 8) & 255;
    const cr = (this.state.currentColor >> 16) & 255;
    const color = rgbaToInt(cr, cg, cb, this.state.alpha, bgColor);

    if (
      this._pending[cell.y][cell.x] !== color &&
      this._lines[cell.y][cell.x].color !== color
    ) {
      this._pending[cell.y][cell.x] = color;
    } else {
      return;
    }

    this._queue.push({
      x: cell.x,
      y: cell.y,
      color,
    });

    this._stopRefreshTime = new Date().getTime() + MaxWorkTime;
    await this._pingQueue(false);
  }

  parseAccount(account, accountId) {
    if (!account) {
      account = {
        accountId,
        accountIndex: -1,
        avocadoBalance: 25.0,
        //bananaBalance: 0.0,
        numPixels: 0,
        farmingPreference: Berry.Avocado,
      };
    } else {
      account = {
        accountId: account.account_id,
        accountIndex: account.account_index,
        avocadoBalance: parseFloat(account.avocado_balance) / this._pixelCost,
        //bananaBalance: parseFloat(account.banana_balance) / this._pixelCost,
        numPixels: account.num_pixels,
        //farmingPreference: account.farming_preference,
      };
    }
    account.startTime = new Date().getTime();
    account.avocadoPixels =
      account.farmingPreference === Berry.Avocado ? account.numPixels + 1 : 0;
    /* account.bananaPixels =
      account.farmingPreference === Berry.Banana ? account.numPixels : 0; */
    account.avocadoRewardPerMs = account.avocadoPixels / (24 * 60 * 60 * 1000);
    //account.bananaRewardPerMs = account.bananaPixels / (24 * 60 * 60 * 1000);
    return account;
  }

  async getAccount(accountId) {
    return this.parseAccount(
      await this._contract.get_account({ account_id: accountId }),
      accountId
    );
  }

  async getAccountByIndex(accountIndex) {
    return this.parseAccount(
      await this._contract.get_account_by_index({
        account_index: accountIndex,
      }),
      "unknown"
    );
  }

  async refreshAccountStats() {
    let account = await this.getAccount(this._accountId);
    if (this._balanceRefreshTimer) {
      clearInterval(this._balanceRefreshTimer);
      this._balanceRefreshTimer = null;
    }

    this.setState({
      pendingPixels: this._pendingPixels.length + this._queue.length,
      // farmingBanana: account.farmingPreference === Berry.Banana,
      account,
    });

    this._balanceRefreshTimer = setInterval(() => {
      const t = new Date().getTime() - account.startTime;
      this.setState({
        account: Object.assign({}, account, {
          avocadoBalance:
            account.avocadoBalance + t * account.avocadoRewardPerMs,
          //bananaBalance: account.bananaBalance + t * account.bananaRewardPerMs,
        }),
        pendingPixels: this._pendingPixels.length + this._queue.length,
      });
    }, 100);
  }

  async _initNear() {
    const keyStore = new nearAPI.keyStores.BrowserLocalStorageKeyStore();
    const near = await nearAPI.connect(
      Object.assign({ deps: { keyStore } }, NearConfig)
    );
    this._keyStore = keyStore;
    this._near = near;

    this._walletConnection = new nearAPI.WalletConnection(
      near,
      NearConfig.contractName
    );
    this._accountId = this._walletConnection.getAccountId();

    this._account = this._walletConnection.account();
    this._contract = new nearAPI.Contract(
      this._account,
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
    this._pixelCost = parseFloat(await this._contract.get_pixel_cost());
    const endtime = await this._contract.get_event_finish();
    this.eventEndTime = new Date(endtime / 1000000);
    if (this._accountId) {
      await this.refreshAccountStats();
    }
    this._lineVersions = Array(BoardHeight).fill(-1);
    this._lines = Array(BoardHeight).fill(false);
    this._pending = Array(BoardHeight).fill(false);
    this._pending.forEach((v, i, a) => (a[i] = Array(BoardWidth).fill(-1)));
    await this.refreshBoard(true);
  }

  async refreshBoard(forced) {
    if (this._refreshBoardTimer) {
      clearTimeout(this._refreshBoardTimer);
      this._refreshBoardTimer = null;
    }
    const t = new Date().getTime();
    if (this.state.watchMode || t < this._stopRefreshTime) {
      this._refreshBoardTimer = setTimeout(async () => {
        await this.refreshBoard(false);
      }, RefreshBoardTimeout);
    }

    if (!forced && document.hidden) {
      return;
    }

    let lineVersions = await this._contract.get_line_versions();
    let needLines = [];
    for (let i = 0; i < BoardHeight; ++i) {
      if (lineVersions[i] !== this._lineVersions[i]) {
        needLines.push(i);
      }
    }
    let requestLines = [];
    for (let i = 0; i < needLines.length; i += NumLinesPerFetch) {
      requestLines.push(needLines.slice(i, i + NumLinesPerFetch));
    }

    let results = await Promise.all(
      requestLines.map((lines) => this._contract.get_lines({ lines }))
    );
    results = results.flat();
    requestLines = requestLines.flat();
    for (let i = 0; i < requestLines.length; ++i) {
      let lineIndex = requestLines[i];
      let line = decodeLine(results[i]);
      this._lines[lineIndex] = line;
    }

    this._lineVersions = lineVersions;
    if (!this.state.watchMode) {
      this._refreshOwners();
    }
    this.renderCanvas();
  }

  _refreshOwners() {
    const counts = {};
    this._lines.flat().forEach((cell) => {
      counts[cell.ownerIndex] = (counts[cell.ownerIndex] || 0) + 1;
    });
    delete counts[0];
    const sortedKeys = Object.keys(counts).sort(
      (a, b) => counts[b] - counts[a]
    );
    this.setState({
      owners: sortedKeys.map((accountIndex) => {
        accountIndex = parseInt(accountIndex);
        return {
          accountIndex,
          numPixels: counts[accountIndex],
        };
      }),
    });
    sortedKeys.forEach(async (accountIndex) => {
      accountIndex = parseInt(accountIndex);
      if (
        !(accountIndex in this._accounts) ||
        counts[accountIndex] !== (this._oldCounts[accountIndex] || 0)
      ) {
        try {
          this._accounts[accountIndex] = await this.getAccountByIndex(
            accountIndex
          );
        } catch (err) {
          console.log("Failed to fetch account index #", accountIndex, err);
        }
        this.setState({
          accounts: Object.assign({}, this._accounts),
        });
      }
    });
    this.setState({
      accounts: Object.assign({}, this._accounts),
    });
    this._oldCounts = counts;
  }

  renderCanvas() {
    if (!this._context || !this._lines) {
      return;
    }

    const ctx = this._context;

    for (let i = 0; i < BoardHeight; ++i) {
      const line = this._lines[i];
      if (!line) {
        continue;
      }
      for (let j = 0; j < BoardWidth; ++j) {
        const p = line[j];
        ctx.fillStyle = intToColor(p.color);
        ctx.fillRect(j * CellWidth, i * CellHeight, CellWidth, CellHeight);
        if (this.state.highlightedAccountIndex >= 0) {
          if (p.ownerIndex !== this.state.highlightedAccountIndex) {
            ctx.fillStyle = "rgba(32, 32, 32, 0.8)";
            ctx.fillRect(
              j * CellWidth,
              i * CellHeight,
              CellWidth / 2,
              CellHeight / 2
            );
            ctx.fillRect(
              (j + 0.5) * CellWidth,
              (i + 0.5) * CellHeight,
              CellWidth / 2,
              CellHeight / 2
            );
            ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
            ctx.fillRect(
              j * CellWidth,
              (i + 0.5) * CellHeight,
              CellWidth / 2,
              CellHeight / 2
            );
            ctx.fillRect(
              (j + 0.5) * CellWidth,
              i * CellHeight,
              CellWidth / 2,
              CellHeight / 2
            );
          } else {
            ctx.beginPath();
            ctx.strokeStyle = ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            ctx.lineWidth = 0.5;
            ctx.rect(
              j * CellWidth + 0.5,
              i * CellHeight + 0.5,
              CellWidth - 1,
              CellHeight - 1
            );
            ctx.stroke();
            ctx.closePath();
          }
        }
      }
    }

    this._pendingPixels.concat(this._queue).forEach((p) => {
      ctx.fillStyle = intToColor(p.color);
      ctx.fillRect(p.x * CellWidth, p.y * CellHeight, CellWidth, CellHeight);
    });

    if (this.state.selectedCell && !this.state.watchMode) {
      const c = this.state.selectedCell;
      if (this.state.rendering) {
        const img = this.imageData;
        const w = img.width;
        const h = img.height;
        const x = c.x - Math.trunc(w / 2);
        const y = c.y - Math.trunc(h / 2);
        const d = new Uint32Array(this.imageData.data.buffer);
        for (let i = 0; i < h; ++i) {
          for (let j = 0; j < w; ++j) {
            const color = d[i * w + j];
            if (
              color &&
              y + i >= 0 &&
              y + i < BoardHeight &&
              x + j >= 0 &&
              x + j < BoardWidth
            ) {
              const bgColor = this._lines[y + i]
                ? this._lines[y + i][x + j].color
                : 0;
              ctx.fillStyle = intToColor(imgColorToInt(color, bgColor));
              ctx.fillRect(
                (x + j) * CellWidth,
                (y + i) * CellHeight,
                CellWidth,
                CellHeight
              );
            }
          }
        }
      } else if (this.state.pickingColor) {
        const color = this._lines[c.y] ? this._lines[c.y][c.x].color : 0;
        ctx.beginPath();
        ctx.strokeStyle = ctx.fillStyle = transparentColor(color, 0.5);
        ctx.lineWidth = CellWidth * 4;
        ctx.arc(
          (c.x + 0.5) * CellWidth,
          (c.y + 0.5) * CellHeight,
          CellWidth * 4,
          0,
          2 * Math.PI
        );
        ctx.stroke();
        ctx.closePath();

        ctx.beginPath();
        ctx.strokeStyle = ctx.fillStyle = transparentColor(color, 1);
        ctx.lineWidth = CellWidth * 2;
        ctx.arc(
          (c.x + 0.5) * CellWidth,
          (c.y + 0.5) * CellHeight,
          CellWidth * 4,
          0,
          2 * Math.PI
        );
        ctx.stroke();
        ctx.closePath();
      } else {
        ctx.fillStyle = transparentColor(this.state.currentColor, 0.2);
        ctx.fillRect(c.x * CellWidth, 0, CellWidth, c.y * CellHeight);
        ctx.fillRect(
          c.x * CellWidth,
          (c.y + 1) * CellHeight,
          CellWidth,
          (BoardHeight - c.y - 1) * CellHeight
        );
        ctx.fillRect(0, c.y * CellHeight, c.x * CellWidth, CellHeight);
        ctx.fillRect(
          (c.x + 1) * CellWidth,
          c.y * CellHeight,
          (BoardWidth - c.x - 1) * CellWidth,
          CellHeight
        );

        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.fillStyle = intToColor(this.state.currentColor);
        ctx.strokeStyle = intToColor(this.state.currentColor);
        ctx.rect(c.x * CellWidth, c.y * CellHeight, CellWidth, CellHeight);
        ctx.stroke();
        ctx.closePath();
      }
    }

    if (!this.state.boardLoaded) {
      this.setState({
        boardLoaded: true,
      });
    }
  }

  async requestSignIn() {
    const appTitle = "Berry Club";
    await this._walletConnection.requestSignIn(
      NearConfig.contractName,
      appTitle
    );
  }

  async logOut() {
    this._walletConnection.signOut();
    this._accountId = null;
    this.setState({
      signedIn: !!this._accountId,
      accountId: this._accountId,
    });
  }

  async alphaColorChange(c) {
    this.setState(
      {
        alpha: c.rgb.a,
      },
      () => {
        this.changeColor(c, c.rgb.a);
      }
    );
  }

  hueColorChange(c) {
    this.setState({
      gammaColors: generateGamma(c.hsl.h),
    });
    this.changeColor(c);
  }

  saveColor() {
    const newColor = intToColor(this.state.currentColor);
    const index = this.state.colors.indexOf(newColor);
    if (index >= 0) {
      this.state.colors.splice(index, 1);
    }
    this.setState({
      colors: [newColor].concat(this.state.colors).slice(0, MaxNumColors),
    });
  }

  changeColor(c, alpha) {
    alpha = alpha || 1.0;
    const currentColor = c.rgb.r * 0x010000 + c.rgb.g * 0x000100 + c.rgb.b;
    c.hex = intToColorWithAlpha(currentColor, alpha);
    c.rgb.a = alpha;
    c.hsl.a = alpha;
    c.hsv.a = alpha;
    this.setState(
      {
        pickerColor: c,
        alpha,
        currentColor,
      },
      () => {
        this.renderCanvas();
      }
    );
  }


  setHover(accountIndex, v) {
    if (v) {
      this.setState(
        {
          highlightedAccountIndex: accountIndex,
        },
        () => {
          this.renderCanvas();
        }
      );
    } else if (this.state.highlightedAccountIndex === accountIndex) {
      this.setState(
        {
          highlightedAccountIndex: -1,
        },
        () => {
          this.renderCanvas();
        }
      );
    }
  }

  async switchBerry(farmingBanana) {
    this.setState({
      farmingBanana,
    });
    await this._contract.select_farming_preference({
      berry: farmingBanana ? Berry.Banana : Berry.Avocado,
    });
    await this.refreshAccountStats();
  }

  async renderImg(img, avocadoNeeded) {
    this.imageData = img;
    this.setState({
      weaponsOn: false,
      weaponsCodePosition: 0,
      rendering: true,
      pickingColor: false,
      avocadoNeeded,
    });
  }

  _isEventOver() {
    const date = new Date();
    return (
      this.state.EventEnd <= date
    );
  }

  enableWatchMode() {
    this.setState({
      watchMode: true,
      weaponsOn: false,
      weaponsCodePosition: 0,
    });
    document.body.style.transition = "3s";
    document.body.style.backgroundColor = "#333";
  }

  render() {
    const watchClass = this.state.watchMode ? " hidden" : "";
    const isEventOff = this._isEventOver();
    const timeLeft = (
      <div
        className={`free-drawing ${isEventOff ? "free" : "wait"
          }${watchClass} `}
        style={{ fontSize: "1.8rem", color: "#000000", marginTop: "25px" }}
      >
        {isEventOff
          ? "Near Playground is over! Thanks for playing!"
          : <>
            Time left:
            <Timer
              initialTime={
                this.state.eventEndTime - new Date()
              }
              direction="backward"
              timeToUpdate={100}
              lastUnit="d"
              checkpoints={[
                {
                  time: 0,
                },
              ]}
            >
              {() => (
                <React.Fragment>
                  <Timer.Days
                    formatValue={(v) => (v > 1 ? `${v} days ` : v ? `1 day ` : "")}
                  />
                  <Timer.Hours />H{" "}
                  <Timer.Minutes formatValue={(v) => `${v}`.padStart(2, "0")} />M{" "}
                  <Timer.Seconds formatValue={(v) => `${v}`.padStart(2, "0")} />S
                </React.Fragment>
              )}
            </Timer>
          </>}

      </div>
    );

    const content = !this.state.connected ? (
      <button className='wallet-adapter-button btnhover' onClick={() => this.requestSignIn()}>
        {/* <Spinner/> */}
        Connecting...
      </button>
    ) : this.state.signedIn ? (

      <div style={{ marginBottom: "10px", display: "flex", flexDirection: "column", alignItems: "end" }}>
        <div style={{ marginLeft: "0" }}>
          <button className='wallet-adapter-button btnhover' onClick={() => this.logOut()}>
            <div style={{ display: "flex", flexDirection: "row", textTransform: "uppercase", fontSize: "0.9rem" }}>
              <UserIcon style={{ marginLeft: "0.5rem", marginRight: "0.8rem" }} />
              {this.state.accountId}
              <LogoutIcon style={{ marginLeft: "0.8rem", marginRight: "0.5rem" }} />
            </div>
          </button>
        </div>

      </div>
    ) : (
      <div style={{ marginBottom: "10px", display: "flex", flexDirection: "column", alignItems: "end" }}>
        <div style={{ marginLeft: "0" }}>
          <button className='wallet-adapter-button btnhover' onClick={() => this.requestSignIn()}>CONNECT NEAR WALLET</button>
        </div>
      </div>
    );
    const weapons = this.state.weaponsOn ? (
      <div>
        <Weapons
          account={this.state.account}
          isEventOff={isEventOff}
          renderIt={(img, avocadoNeeded) => this.renderImg(img, avocadoNeeded)}
          enableWatchMode={() => this.enableWatchMode()}
        />
      </div>
    ) : (
      ""
    );
    return (
      <div >
        <section className="mainBG">
          <div className={`header`}>
            {/* <a className="btn btn-outline-none" href="https://farm.berryclub.io">
          Berry Farm cucumber
        </a>
        <a
          className="btn btn-outline-none"
          href="https://app.ref.finance/#wrap.near|berryclub.ek.near"
        >
          REF Finance banana
        </a>
        <a className="btn btn-outline-none" href="https://berry.cards">
          [BETA] Berry Cards pepper
        </a> */}
            {content}
          </div>
          <div className="container">
            <MainLogo />
            <div style={{ maxWidth: "900px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              {!this.state.signedIn ? (
                <> <span style={{ textAlign: "center", marginTop: "20px", fontSize: "1.2rem" }}>
                  Back in the day, when Near was only in its beginnings, one of the only things you could do on-chain was to play <a href="https://berryclub.io/">Berry Club</a>.
                  Place your pixel and leave your mark on the Near blockchain for ever.
                </span>
                  <p style={{ marginTop: "20px", fontSize: "1.2rem" }}>But be careful, you only got the rest of the event!</p></>
              ) : <></>}
              <span>
                <div
                  className={!this.state.loggedIn ? "hidden" : "display-warning"}
                  style={{ margin: "10px", fontSize: "1.2rem" }}
                >
                  <span role="img" aria-label="warning">
                    ⚠️
                  </span>
                  ️ Please! Don't destroy art!
                  <span role="img" aria-label="pray">
                    🙏
                  </span>
                  ️
                </div>
              </span>
            </div>
            <div className="row" style={{ marginTop: "0.5rem" }}>
              <div className="col">
                <div className="rect smallrects">
                  {this.state.signedIn ? (
                    <div className={`color-picker`}>
                      <HuePicker
                        color={this.state.pickerColor}
                        width="100%"
                        onChange={(c) => this.hueColorChange(c)}
                      />
                      <AlphaPicker
                        color={this.state.pickerColor}
                        width="100%"
                        onChange={(c) => this.alphaColorChange(c)}
                      />
                      <GithubPicker
                        className="circle-picker"
                        colors={this.state.gammaColors}
                        color={this.state.pickerColor}
                        triangle="hide"
                        width="100%"
                        onChangeComplete={(c) => this.changeColor(c)}
                      />
                      <GithubPicker
                        className="circle-picker"
                        colors={this.state.colors}
                        color={this.state.pickerColor}
                        triangle="hide"
                        width="100%"
                        onChangeComplete={(c) => this.hueColorChange(c)}
                      />
                    </div>
                  ) :
                    (
                      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                        <div className="rectDefault">
                        </div>
                        <div className="rectDefault">
                        </div>
                        <div className="rectDefault">
                        </div>
                        <div className="rectDefault">
                        </div>
                      </div>
                    )
                  }
                </div>
                <div className="rect smallrects balances" style={{ color: "#4D4D4D", display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
                  {this.state.signedIn ? (
                    <Balance
                      account={this.state.account}
                      pendingPixels={this.state.pendingPixels}
                      isEventOff={isEventOff}
                      detailed={true}
                    />) : <div className="rectDefault" style={{ width: "40%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  </div>}

                  <Popup trigger={<button className="btnbuyink"><span style={{ fontSize: "1.3rem" }}>BUY INK</span></button>} modal>
                    <BuyButtons watchClass={watchClass} contract={this._contract} />
                  </Popup>
                </div>
                <div className="rect smallrects" style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ color: "#4D4D4D", fontSize: "1.3rem" }}>Canvas' Info</span>
                  <div className={`leaderboard`}> {/*${watchClass}*/}
                    <div>
                      <Leaderboard
                        owners={this.state.owners}
                        accounts={this.state.accounts}
                        setHover={(accountIndex, v) => this.setHover(accountIndex, v)}
                        selectedOwnerIndex={this.state.selectedOwnerIndex}
                        highlightedAccountIndex={this.state.highlightedAccountIndex}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="rect bigrect">
                {timeLeft}
                <canvas
                  ref={this.canvasRef}
                  width={600}
                  height={600}
                  className={
                    this.state.boardLoaded
                      ? `pixel-board${this.state.watchMode ? " watch-mode" : ""
                      }`
                      : "pixel-board c-animated-background"
                  }
                />
              </div>
            </div>


          </div>
          <div className={`padded`}>
            {/* {this.state.signedIn ? (
          <div>
            <iframe
              title="irc"
              className="irc"
              frameBorder="0"
              src={`https://kiwiirc.com/client/irc.kiwiirc.com/?nick=${this.state.ircAccountId}#berryclub`}
            />
          </div>
        ) : (
          ""
        )} */}
          </div>
          {/*<div className={`padded${watchClass}`}>*/}
          {/*  <div className="video-container">*/}
          {/*    <iframe*/}
          {/*      title="youtube3"*/}
          {/*      className="youtube"*/}
          {/*      src="https://www.youtube.com/embed/wfTa-Kgw2DM"*/}
          {/*      frameBorder="0"*/}
          {/*      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"*/}
          {/*      allowFullScreen*/}
          {/*    />*/}
          {/*  </div>*/}
          {/*</div>*/}
          {/*<div className={`padded${watchClass}`}>*/}
          {/*  <div className="video-container">*/}
          {/*    <iframe*/}
          {/*      title="youtube2"*/}
          {/*      className="youtube"*/}
          {/*      src="https://www.youtube.com/embed/PYF6RWd7ZgI"*/}
          {/*      frameBorder="0"*/}
          {/*      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"*/}
          {/*      allowFullScreen*/}
          {/*    />*/}
          {/*  </div>*/}
          {/*</div>*/}
          {/*<div className={`padded${watchClass}`}>*/}
          {/*  <div className="video-container">*/}
          {/*    <iframe*/}
          {/*      title="youtube"*/}
          {/*      className="youtube"*/}
          {/*      src="https://www.youtube.com/embed/lMSWhCwstLo"*/}
          {/*      frameBorder="0"*/}
          {/*      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"*/}
          {/*      allowFullScreen*/}
          {/*    />*/}
          {/*  </div>*/}
          {/*</div>*/}
          {weapons}

        </section>
        <section className="mainBG">
          <div className="container">
            <MainLogo />

          </div>

        </section>
        <section className={"about-us"}>
          <h1>About us</h1>
          <div className="about-us-container">
            <div className="text">
              <p>
                This project aims to revive some of the old charm  Near had in its beginning by remaking one of the first project ever made on the near blockchain (Berryclub). Our end-goal is to form a new tradition in the Near culture.
                {"\n"}
                {"\n"}
                We decided to donate all the proceeds to Ukraine as we all strongly want to help them and believe that everyone in Near has the same beliefs as us, but in the future we may make a voting pool to decide to where the charitable money is going.
                {"\n"}

                Hope you enjoy our fun project and keep building on Near!
              </p>
            </div>
            <img src={polvo} className="card-image" />
          </div>
        </section>
        <section className={"team-section"}>
          <h1>Team</h1>
          <ul className="cards">
            <li className="card">
              <img src={edu} className="card-image" />
              <p>Eduardo Nunes</p>
            </li>
            <li className="card">
              <img src={lucas} className="card-image" />
              <p>Lucas Anjo</p>
            </li>
            <li className="card">
              <img src={santana} className="card-image" />
              <p>Miguel Santana</p>
            </li>
            <li className="card">
              <img src={pvaz} className="card-image" />
              <p>Pedro Vaz</p>
            </li>
            <li className="card">
              <img src={gouveia} className="card-image" />
              <p>Vasco gouveia</p>
            </li>
          </ul>
        </section>

        <section className={"footer"}>
          <div className="socials">
            <a href="https://discord.com/" className="social">
              <img src={discord} className="footer-image" />
            </a>

            <a href="https://github.com/" className="social">
              <img src={git} className="footer-image" />
            </a>

            <a href="https://www.instagram.com/" className="social">
              <img src={insta} className="footer-image" />
            </a>

            <a href="https://web.telegram.org/k/" className="social">
              <img src={telegram} className="footer-image" />
            </a>

          </div>

          <a href="https://near.org/">
            <img src={built} className="footer-image" />
          </a>



        </section>

      </div>


    );
  }
}


const Balance = (props) => {
  const account = props.account;
  if (!account) {
    return "";
  }
  const fraction = props.detailed ? 3 : 1;
  const avacadoBalance =
    account.avocadoBalance -
    (props.isEventOff ? 0 : props.pendingPixels || 0);
  /* const avocadoFarm =
    account.avocadoPixels > 0 ? (
      <span>
        {"(+"}
        <span className="font-weight-bold">{account.avocadoPixels}</span>
        INK
        {"/day)"}
      </span>
    ) : (
      ""
    );
  const bananaFarm =
    account.bananaPixels > 0 ? (
      <span>
        {"(+"}
        <span className="font-weight-bold">{account.bananaPixels}</span>
        banana
        {"/day)"}
      </span>
    ) : (
      ""
    ); */
  return (
    <div style={{ alignItems: "center", justifyContent: "center", display: "flex", flexDirection: "column" }}>
      <span className="font-weight-bold">
        {avacadoBalance ? avacadoBalance.toFixed(fraction) : 0} INK
      </span>
      {/* <span className="font-weight-bold">
        {account.bananaBalance ? account.bananaBalance.toFixed(fraction) : 0}
      </span>
      {avocadoFarm}
      {bananaFarm} */}
      {props.pendingPixels ? <span style={{ fontSize: "1rem" }}> ({props.pendingPixels} pending)</span> : ""}
    </div>

  );
};

const Leaderboard = (props) => {
  const owners = props.owners.map((owner) => {
    if (owner.accountIndex in props.accounts) {
      owner.account = props.accounts[owner.accountIndex];
    }
    return (
      <Owner
        key={owner.accountIndex}
        {...owner}
        isSelected={owner.accountIndex === props.selectedOwnerIndex}
        setHover={(v) => props.setHover(owner.accountIndex, v)}
        isHighlighted={owner.accountIndex === props.highlightedAccountIndex}
      />
    );
  });
  return (
    <table className="table table-hover table-sm">
      <tbody>{owners}</tbody>
    </table>
  );
};

const BuyButtons = (props) => {
  async function buyTokens(amount) {
    const requiredBalance = PixelPrice.muln(amount);
    await props.contract.buy_tokens(
      {},
      new BN("30000000000000"),
      requiredBalance
    );
  }

  return (
    <div className={`buttons${props.watchClass}`} style={{ display: "flex", flexDirection: "column", justifyContent: "center", borderRadius: "15px" }} >
      <button
        className="btn btn-primary"
        onClick={() => buyTokens(10)}
      >
        Buy <span className="font-weight-bold">25Avocado</span> for{" "}
        <span className="font-weight-bold">Ⓝ0.1</span>
      </button>{" "}
      <button
        className="btn btn-primary"
        onClick={() => buyTokens(40)}
      >
        Buy <span className="font-weight-bold">100Avocado</span> for{" "}
        <span className="font-weight-bold">Ⓝ0.4</span>
      </button>{" "}
      <button
        className="btn btn-primary"
        onClick={() => buyTokens(100)}
      >
        Buy <span className="font-weight-bold">250Avocado</span> for{" "}
        <span className="font-weight-bold">Ⓝ1</span>
      </button>{" "}
      <button
        className="btn btn-success"
        onClick={() => buyTokens(500)}
      >
        DEAL: Buy <span className="font-weight-bold">1500Avocado</span>{" "}
        for <span className="font-weight-bold">Ⓝ5</span>
      </button>
    </div>
  )
}

const Owner = (props) => {
  const account = props.account;
  return (
    <tr
      onMouseEnter={() => props.setHover(true)}
      onMouseLeave={() => props.setHover(false)}
      className={props.isSelected ? "selected" : ""}
    >
      <td>{account ? <Account accountId={account.accountId} /> : "..."}</td>
      <td className="text-nowrap">
        <small>
          <Balance account={account} />
        </small>
      </td>
    </tr>
  );
};

const Account = (props) => {
  const accountId = props.accountId;
  const shortAccountId =
    accountId.length > 6 + 6 + 3
      ? accountId.slice(0, 6) + "..." + accountId.slice(-6)
      : accountId;
  return (
    <a className="account" href={`https://wayback.berryclub.io/${accountId}`}>
      {shortAccountId}
    </a>
  );
};

export default App;
