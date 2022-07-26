import { Bot } from './bot';

const bot = new Bot();

bot.runAsync()
    .catch((ex) => {
        console.log(ex);
        bot.save();
        throw ex;
    });