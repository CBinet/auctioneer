"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const auth_json_1 = __importDefault(require("./auth.json"));
Date.prototype.addHours = function (h) {
    this.setTime(this.getTime() + (h * 60 * 60 * 1000));
    return this;
};
var AUCTION_CHANNEL_ID = '997311898825527406';
var MASTER_ID = '131961335847190529';
var FROG_ROLE_ID = '712112717254623343';
var thread;
var messagesReceived = [];
var lastBotMessage;
var auctionStartMessage;
var highestBid = 0;
var highestBidder;
var lootsplitImages = [];
var description;
var endTime;
var outgoingAuction = false;
const client = new discord_js_1.Client({
    intents: [discord_js_1.Intents.FLAGS.GUILD_MESSAGES]
});
client.on('ready', (onReady) => {
    console.log('Serving...');
    client.channels.fetch(AUCTION_CHANNEL_ID).then(channel => {
        if (channel)
            channel.bulkDelete(100); // Delete après tests
        if (thread)
            thread.delete();
        //channel.permissionOverwrites.edit(FROG_ROLE_ID, { SEND_MESSAGES: false });
    });
});
client.on('messageCreate', message => {
    if (message.author.bot)
        return;
    if (thread ? message.channelId != thread.id : message.channelId != AUCTION_CHANNEL_ID)
        return;
    messagesReceived.push(message);
    if (message.content.startsWith('-start')) { // Nouvelles auctions
        if (message.author.id != MASTER_ID) {
            replyToMessage(message, `Vous n'avez pas les accès nécessaires pour la commande \`-start\`.`);
        }
        else {
            var auctionsHours = parseInt(message.content.split(' ')[1]);
            var _description = message.content.split(' ').slice(2).join(' ');
            highestBid = 0;
            lootsplitImages = message.attachments.map(a => a.url);
            description = _description;
            endTime = getUtcDate(auctionsHours);
            //message.channel.permissionOverwrites.edit(FROG_ROLE_ID, { SEND_MESSAGES: true });
            sendAuctionStartMessage(message, auctionsHours);
            outgoingAuction = true;
        }
        return;
    }
    if (message.content.startsWith('-end')) { // Terminer les auctions
        if (message.author.id != MASTER_ID) {
            replyToMessage(message, `Vous n'avez pas les accès nécessaires pour la commande \`-end\`.`);
        }
        else {
            outgoingAuction = false;
            sendAuctionEndMessage(message);
            //message.channel.permissionOverwrites.edit(FROG_ROLE_ID, { SEND_MESSAGES: false });
        }
        return;
    }
    else { // Nouveau bid
        if (!outgoingAuction) {
            replyToMessage(message, `Aucune enchère en cours présentement.`);
            return;
        }
        var amountIsValidFloat = /^[0-9]+\.?[0-9]{0,1}$/.test(message.content);
        if (!amountIsValidFloat) {
            replyToMessage(message, `\`${message.content}\` n'est pas une entrée valide. Exemple : 5, 10.1, 25.5, etc. (maximum 1000)`);
            return;
        }
        var amount = parseFloat(message.content);
        if (amount > 1000) {
            replyToMessage(message, `\`${message.content}\` n'est pas une entrée valide. La maximum est 1000`);
            return;
        }
        if (amount > highestBid) {
            highestBid = amount;
            highestBidder = message.author.id;
        }
        else {
            replyToMessage(message, `Le plus haut bid est présentement de \`${highestBid}m\`. Votre bid de \`${amount}m\` n'est pas assez élevé.`);
            return;
        }
        sendNewBidMessage(message);
    }
});
client.login(auth_json_1.default.token);
setInterval(() => {
    console.log('Refreshing after 5mins...');
    sendNewBidMessage(lastBotMessage);
}, 60 * 1000 * 5);
function sendNewBidMessage(message) {
    var remainingTime = Math.ceil(Math.abs(new Date().getDate() - endTime.getDate()) / (1000 * 60 * 60));
    var embedResponse = new discord_js_1.MessageEmbed()
        .setTitle(`Nouveau bid`)
        .setDescription(`**${description}**\r\nPlus haut bidder : <@${highestBidder}> \r\nMontant : **${highestBid}m**\r\nTemps restant: **${remainingTime} heures restantes**`)
        .setColor("BLUE");
    if (lastBotMessage)
        lastBotMessage.delete();
    message.channel.send({ embeds: [embedResponse] }).then((messageBot) => {
        lastBotMessage = messageBot;
        setTimeout(() => {
            deleteMessages();
        }, 1000);
    });
}
function sendAuctionStartMessage(message, auctionsHours) {
    message.startThread({
        name: `Auction - ${description}`
    }).then(_thread => {
        thread = _thread;
        var embedRequest = new discord_js_1.MessageEmbed()
            .setTitle(`Nouvelle enchère (${auctionsHours} heures)`)
            .setDescription(`**${description}**\r\nFin des enchères: **${endTime.toUTCString()}**`)
            .setColor("GREEN");
        if (lastBotMessage)
            lastBotMessage.delete();
        console.log(thread);
        thread.send({
            embeds: [embedRequest],
            files: lootsplitImages
        }).then((messageBot) => {
            // lastBotMessage = messageBot;
            auctionStartMessage = messageBot;
            setTimeout(() => {
                deleteMessages();
            }, 1000);
        });
    });
}
function sendAuctionEndMessage(message) {
    var embedRequest = new discord_js_1.MessageEmbed()
        .setTitle(`Enchère terminée`)
        .setDescription(`**${description}**\r\nPlus haut bidder : <@${highestBidder}>\r\nMontant : **${highestBid}m**`)
        .setColor("GREEN");
    if (auctionStartMessage)
        auctionStartMessage.delete();
    if (lastBotMessage)
        lastBotMessage.delete();
    message.channel
        .send({
        embeds: [embedRequest],
        files: lootsplitImages
    })
        .then((messageBot) => {
        lastBotMessage = messageBot;
        setTimeout(() => {
            deleteMessages();
        }, 1000);
    });
}
function replyToMessage(message, text, timeoutUntilDelete = 5000) {
    message.reply(text).then((messageBot) => {
        messagesReceived.push(messageBot);
        setTimeout(() => {
            deleteMessages();
        }, timeoutUntilDelete);
    });
}
function getUtcDate(hoursToAdd = 0) {
    var date = new Date();
    date.addHours(hoursToAdd);
    return toUtcDate(date);
}
function toUtcDate(date) {
    var now_utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
    var endTime = new Date(now_utc);
    return endTime;
}
function deleteMessages() {
    messagesReceived.forEach(message => message.delete());
    messagesReceived = [];
}
//# sourceMappingURL=bot.js.map