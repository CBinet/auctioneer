"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bot = void 0;
const discord_js_1 = require("discord.js");
const fs_1 = require("fs");
const auth_json_1 = __importDefault(require("../auth.json"));
const auction_1 = require("./auction");
const better_discord_1 = require("./better-discord");
const options_1 = require("./options");
const AUCTION_CHANNEL_ID = ['997311898825527406', '998794616226713640'];
const MASTER_ID = '131961335847190529';
const AUCTION_FILENAME = './auctions.json';
class Bot {
    constructor() {
        this.auctions = {};
        this.messagesReceived = [];
        this.client = new discord_js_1.Client({
            intents: [discord_js_1.Intents.FLAGS.GUILD_MESSAGES, discord_js_1.Intents.FLAGS.DIRECT_MESSAGES, discord_js_1.Intents.FLAGS.GUILD_MEMBERS, discord_js_1.Intents.FLAGS.DIRECT_MESSAGE_TYPING]
        });
        this.auctions = JSON.parse((0, fs_1.readFileSync)(AUCTION_FILENAME).toString());
    }
    runAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            this.client.on('ready', (onReady) => __awaiter(this, void 0, void 0, function* () {
                onReady.guilds.fetch().then(guilds => {
                    console.log(`Serving ${guilds.values.length} server(s)`);
                });
                for (let index in AUCTION_CHANNEL_ID) {
                    const channel = yield this.client.channels.fetch(AUCTION_CHANNEL_ID[index]);
                    // if (channel) (<TextChannel>channel).bulkDelete(100); // Delete après tests
                }
            }));
            this.client.on('messageCreate', (message) => __awaiter(this, void 0, void 0, function* () {
                if (message.author.bot)
                    return;
                if (this.auctions[message.channelId] ? this.auctions[message.channelId].getThread() ? message.channelId != this.auctions[message.channelId].getThread().id : AUCTION_CHANNEL_ID.indexOf(message.channelId) != -1 : false)
                    return;
                if (message.content.startsWith('-start')) {
                    if (message.author.id != MASTER_ID) {
                        yield this.replyToMessageAsync(message, `Vous n'avez pas les accès nécessaires pour la commande \`-start\`.`);
                        return;
                    }
                    if (message.attachments.map(a => a.url).length == 0) {
                        yield this.replyToMessageAsync(message, `Vous devez upload au moins une (1) image pour la commande \`-start\`.`);
                        return;
                    }
                    var durationInMinutes = parseInt(message.content.split(' ')[1]);
                    var _description = message.content.split(' ').slice(2).join(' ');
                    //message.channel.permissionOverwrites.edit(FROG_ROLE_ID, { SEND_MESSAGES: true });
                    const thread = yield message.startThread({
                        name: `Auction - ${_description}`,
                        rateLimitPerUser: options_1.Options.BID_COOLDOWN,
                        reason: message.content
                    });
                    this.auctions[thread.id] = new auction_1.Auction(_description, getUtcDate(durationInMinutes), message.attachments.map(a => a.url));
                    this.auctions[thread.id].start();
                    this.auctions[thread.id].setThread(thread);
                    yield this.sendAuctionStartMessageAsync(this.auctions[thread.id], durationInMinutes);
                    return;
                }
                if (message.content.startsWith('-end')) {
                    this.messagesReceived.push(message);
                    if (message.author.id != MASTER_ID) {
                        yield this.replyToMessageAsync(message, `Vous n'avez pas les accès nécessaires pour la commande \`-end\`.`);
                    }
                    else {
                        this.auctions[message.channelId].end();
                        yield this.sendAuctionEndMessageAsync(this.auctions[message.channelId]);
                        //message.channel.permissionOverwrites.edit(FROG_ROLE_ID, { SEND_MESSAGES: false });
                    }
                    return;
                }
                if (message.content.startsWith('-bid')) {
                    if (this.auctions[message.channelId] ? !this.auctions[message.channelId].isOngoing() : false) {
                        yield this.replyToMessageAsync(message, `Aucune enchère en cours présentement.`);
                        return;
                    }
                    var unparsedAmount = message.content.split(' ')[1];
                    var amountIsValidFloat = /^[0-9]+\.?[0-9]{0,1}$/.test(unparsedAmount);
                    if (!amountIsValidFloat) {
                        yield this.replyToMessageAsync(message, `-bid \`${unparsedAmount}\` n'est pas une entrée valide. Exemple : -bid 5, -bid 10.1, -bid 25.5, etc. (maximum 1000)`);
                        return;
                    }
                    var amount = parseFloat(unparsedAmount);
                    if (amount > options_1.Options.MAXIMUM_BID) {
                        yield this.replyToMessageAsync(message, `\`-bid ${unparsedAmount}\` n'est pas une entrée valide. La maximum est 1000`);
                        return;
                    }
                    if (!this.auctions[message.channelId]) {
                        yield this.replyToMessageAsync(message, `Vous ne pouvez pas bid ici.`);
                        return;
                    }
                    if (this.auctions[message.channelId].isOutbid(amount)) {
                        this.auctions[message.channelId].bid(message.author.id, amount);
                    }
                    else {
                        yield this.replyToMessageAsync(message, `Le plus haut bid est présentement de \`${this.auctions[message.channelId].highestBid}m\`. Votre bid de \`${amount}m\` n'est pas assez élevé.`);
                        return;
                    }
                    this.messagesReceived.push(message);
                    yield this.sendNewBidMessageAsync(this.auctions[message.channelId]);
                    return;
                }
                // if (message.content.startsWith('-help')) {
                //     const helpFileContent = await fsPromises.readFile(
                //         './help.md',
                //         'utf-8',
                //     );
                //     var embedRequest = new MessageEmbed()
                //         .setTitle(`${Options.EMOJI} Help`)
                //         .setDescription(helpFileContent)
                //         .setColor("BLUE")
                //     await this.replyToMessageAsync(message, helpFileContent, Options.BOT_REPLY_LIFETIME, embedRequest);
                //     return
                // }
                else {
                    if (message.author.id == MASTER_ID)
                        return;
                    yield this.replyToMessageAsync(message, `${message.content} n'est pas une commande valide. \`-help\` pour plus de détails`);
                    this.deleteMessages();
                }
            }));
            this.client.login(auth_json_1.default.token);
            setInterval(() => __awaiter(this, void 0, void 0, function* () {
                console.log('Refreshing after 1min...');
                for (let channelId in this.auctions) {
                    const auction = this.auctions[channelId];
                    //     var { remainingHours, remainingMinutes } = DateUtils.getRemainingTime(auction.endTime);
                    //     if (auction.isOngoing() && remainingHours == 1 && remainingMinutes == 0) {
                    //         (await auction.getThread().members.thread.members.fetch(false)).forEach(async member => {
                    //             if (member.user.bot) return;
                    //             try {
                    //                 await member.user.send(`Une (1) heure restante sur l'enchère \`${auction.description}\`. Pour ne plus recevoir ces notifications, quitter le thread.`);
                    //             } catch (ex) {
                    //                 console.log(`Erreur lors de l'envoi de message : ${ex}`);
                    //             }
                    //         });
                    //     }
                    //     if (auction.isOngoing() && remainingHours == 0 && remainingMinutes == 30) {
                    //         (await auction.getThread().members.thread.members.fetch(false)).forEach(async member => {
                    //             if (member.user.bot) return;
                    //             try {
                    //                 await member.user.send(`Trente (30) minutes restante sur l'enchère \`${auction.description}\`. Pour ne plus recevoir ces notifications, quitter le thread.`);
                    //             } catch (ex) {
                    //                 console.log(`Erreur lors de l'envoi de message : ${ex}`);
                    //             }
                    //         });
                    //     }
                    //     if (auction.isOngoing() && remainingHours == 0 && remainingMinutes == 15) {
                    //         (await auction.getThread().members.thread.members.fetch(false)).forEach(async member => {
                    //             if (member.user.bot) return;
                    //             try {
                    //                 await member.user.send(`Quinze (15) minutes restante sur l'enchère \`${auction.description}\`. Pour ne plus recevoir ces notifications, quitter le thread.`);
                    //             } catch (ex) {
                    //                 console.log(`Erreur lors de l'envoi de message : ${ex}`);
                    //             }
                    //         });
                    //     }
                    //     if (auction.isOngoing() && remainingHours == 0 && remainingMinutes == 5) {
                    //         (await auction.getThread().members.thread.members.fetch(false)).forEach(async member => {
                    //             if (member.user.bot) return;
                    //             try {
                    //                 await member.user.send(`Cinq (5) minutes restante sur l'enchère \`${auction.description}\`. Pour ne plus recevoir ces notifications, quitter le thread.`);
                    //             } catch (ex) {
                    //                 console.log(`Erreur lors de l'envoi de message : ${ex}`);
                    //             }
                    //         });
                    //     }
                    if (auction.isOngoing() && auction.endTime <= new Date()) {
                        auction.end();
                        yield this.sendAuctionEndMessageAsync(auction);
                    }
                    if (auction.isOngoing() && auction.highestBidder) {
                        yield this.sendNewBidMessageAsync(auction);
                    }
                }
            }), 1000 * 60 / options_1.Options.REFRESH_RATE);
            function getUtcDate(minutesToAdd = 0) {
                var date = new Date();
                date = addHours(minutesToAdd / 60, date);
                return toUtcDate(date);
            }
            function toUtcDate(date) {
                var now_utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
                var endTime = new Date(now_utc);
                return endTime;
            }
            function addHours(numOfHours, date = new Date()) {
                date.setTime(date.getTime() + numOfHours * 60 * 60 * 1000);
                return date;
            }
        });
    }
    save() {
        (0, fs_1.writeFileSync)(AUCTION_FILENAME, JSON.stringify(this.auctions));
    }
    sendAuctionStartMessageAsync(auctionToStart, auctionDurationInMinutes) {
        return __awaiter(this, void 0, void 0, function* () {
            var durationText = auctionDurationInMinutes > 60 ? `${auctionDurationInMinutes / 60} heures` : `${auctionDurationInMinutes} minutes`;
            var embedRequest = new discord_js_1.MessageEmbed()
                .setTitle(`${options_1.Options.EMOJI} Nouvelle enchère (${durationText})`)
                .setDescription(`**${auctionToStart.description}**\r\n\`-bid x\` pour bid x millions (exemple \`-bid 10.5\` pour 10.5 millions).`)
                .addFields({ name: 'Montant maximum', value: `${options_1.Options.MAXIMUM_BID}`, inline: false }, { name: 'Cooldown', value: `${options_1.Options.BID_COOLDOWN} secondes`, inline: false }, { name: 'Durée', value: durationText, inline: true }, { name: 'Fin des enchères', value: auctionToStart.endTime.toUTCString(), inline: true })
                .setColor("BLUE");
            if (auctionToStart.lastBidMessage)
                better_discord_1.MessageUtils.tryDelete(auctionToStart.lastBidMessage);
            try {
                auctionToStart.auctionStartMessage = yield auctionToStart.getThread().send({ content: '@Auctions', embeds: [embedRequest], files: auctionToStart.imagesUrls });
            }
            catch (ex) {
                console.log(`Erreur lors de l'envoi de message : ${ex}`);
            }
            setTimeout(() => {
                auctionToStart.deleteMessages();
                this.deleteMessages();
            });
        });
    }
    sendNewBidMessageAsync(auctionToBidOn) {
        return __awaiter(this, void 0, void 0, function* () {
            var { remainingHours: hours, remainingMinutes: minutes } = better_discord_1.DateUtils.getRemainingTime(auctionToBidOn.endTime);
            var remainingTimeText = `${hours} heure(s) ${minutes} minute(s)`;
            var lastBidsMessage = auctionToBidOn.getNLastBids(10)
                .map(bid => `${better_discord_1.SnowflakeFormater.formatId(bid.bidder)} ${bid.amount}m`)
                .join('\r\n');
            if (hours == 0 && minutes < 1) {
                remainingTimeText = `< 1 minute`;
            }
            var embedRequest = new discord_js_1.MessageEmbed()
                .setTitle(`${options_1.Options.EMOJI} Nouveau bid`)
                .setDescription(`**${auctionToBidOn.description}**`)
                .addFields({ name: '👑 Plus haut bid', value: better_discord_1.SnowflakeFormater.formatId(auctionToBidOn.highestBidder), inline: false }, { name: 'Montant', value: `${auctionToBidOn.highestBid}m`, inline: false }, { name: 'Temps restant', value: remainingTimeText, inline: false })
                .setColor("GREEN");
            if (lastBidsMessage) {
                embedRequest.addField('Dernier(s) bid(s)', lastBidsMessage, false);
            }
            if (!auctionToBidOn.lastBidMessage) {
                try {
                    auctionToBidOn.lastBidMessage = yield auctionToBidOn.getThread().send({ embeds: [embedRequest] });
                }
                catch (ex) {
                    console.log(`Erreur lors de l'envoi de message : ${ex}`);
                }
            }
            else {
                auctionToBidOn.lastBidMessage.edit({ embeds: [embedRequest] });
            }
            setTimeout(() => {
                auctionToBidOn.deleteMessages();
                this.deleteMessages();
            });
        });
    }
    sendAuctionEndMessageAsync(auctionToEnd) {
        return __awaiter(this, void 0, void 0, function* () {
            var lastBidsMessage = auctionToEnd.getNLastBids(10)
                .map(bid => `${better_discord_1.SnowflakeFormater.formatId(bid.bidder)} ${bid.amount}m`)
                .join('\r\n');
            var embedRequest = new discord_js_1.MessageEmbed()
                .setTitle(`${options_1.Options.EMOJI} Enchère terminée`)
                .setDescription(`**${auctionToEnd.description}**`)
                .addFields({ name: '👑 Gagnant', value: better_discord_1.SnowflakeFormater.formatId(auctionToEnd.highestBidder), inline: false }, { name: 'Montant', value: `${auctionToEnd.highestBid}m`, inline: false }, { name: 'Nombre de bids', value: `${auctionToEnd.bidHistory.length}`, inline: false })
                .setColor("BLUE")
                .setFooter({ text: 'Déposez les silvers en guild bank et ajouter un screenshot' });
            if (lastBidsMessage) {
                embedRequest.addField('Dernier(s) bid(s)', lastBidsMessage, false);
            }
            if (auctionToEnd.auctionStartMessage)
                better_discord_1.MessageUtils.tryDelete(auctionToEnd.auctionStartMessage);
            if (auctionToEnd.lastBidMessage)
                better_discord_1.MessageUtils.tryDelete(auctionToEnd.lastBidMessage);
            try {
                auctionToEnd.lastBidMessage = yield auctionToEnd.getThread().send({ content: '@everyone', embeds: [embedRequest], files: auctionToEnd.imagesUrls });
            }
            catch (ex) {
                console.log(`Erreur lors de l'envoi de message : ${ex}`);
            }
            setTimeout(() => {
                auctionToEnd.deleteMessages();
                this.deleteMessages();
            });
        });
    }
    replyToMessageAsync(message, text, timeoutUntilDelete = options_1.Options.BOT_REPLY_LIFETIME, embedRequest = null) {
        return __awaiter(this, void 0, void 0, function* () {
            let messageBot;
            if (embedRequest) {
                messageBot = yield message.reply({ embeds: [embedRequest] });
            }
            else {
                messageBot = yield message.reply(text);
            }
            if (this.auctions[message.channelId]) {
                this.auctions[message.channelId].messagesReceived.push(messageBot);
            }
            else {
                this.messagesReceived.push(messageBot);
            }
            setTimeout(() => {
                if (this.auctions[message.channelId])
                    this.auctions[message.channelId].deleteMessages();
                this.deleteMessages();
                better_discord_1.MessageUtils.tryDelete(message);
            }, timeoutUntilDelete);
        });
    }
    deleteMessages() {
        this.messagesReceived.forEach(message => {
            if (message) {
                better_discord_1.MessageUtils.tryDelete(message);
            }
            ;
        });
        this.messagesReceived = [];
    }
}
exports.Bot = Bot;
//# sourceMappingURL=bot.js.map