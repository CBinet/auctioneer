"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bot_1 = require("./bot");
const bot = new bot_1.Bot();
bot.runAsync()
    .catch((ex) => {
    console.log(ex);
    bot.save();
    throw ex;
});
//# sourceMappingURL=main.js.map