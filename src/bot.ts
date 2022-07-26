import { Client, Intents, Message, MessageEmbed } from 'discord.js';
import { readFileSync, writeFileSync } from 'fs';

import auth from '../auth.json';
import { Auction } from './auction';
import { DateUtils, MessageUtils, SnowflakeFormater } from './better-discord';
import { Options } from './options';

const AUCTION_CHANNEL_ID = ['997311898825527406', '998794616226713640'];
const MASTER_ID = '131961335847190529';
const AUCTION_FILENAME = './auctions.json';

export class Bot {

    private auctions: { [id: string]: Auction } = {};
    private messagesReceived: Message<boolean>[] = [];

    private client: Client;

    constructor() {
        this.client = new Client({
            intents: [Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.DIRECT_MESSAGE_TYPING]
        });
        this.auctions = JSON.parse(readFileSync(AUCTION_FILENAME).toString());
    }

    public async runAsync() {
        this.client.on('ready', async onReady => {
            onReady.guilds.fetch().then(guilds => {
                console.log(`Serving ${guilds.values.length} server(s)`);
            });
            for (let index in AUCTION_CHANNEL_ID) {
                const channel = await this.client.channels.fetch(AUCTION_CHANNEL_ID[index]);
                // if (channel) (<TextChannel>channel).bulkDelete(100); // Delete après tests
            }
        });

        this.client.on('messageCreate', async message => {
            if (message.author.bot) return;
            if (this.auctions[message.channelId] ? this.auctions[message.channelId].getThread() ? message.channelId != this.auctions[message.channelId].getThread().id : AUCTION_CHANNEL_ID.indexOf(message.channelId) != -1 : false) return;

            if (message.content.startsWith('-start')) {

                if (message.author.id != MASTER_ID) {
                    await this.replyToMessageAsync(message, `Vous n'avez pas les accès nécessaires pour la commande \`-start\`.`);
                    return;
                }
                if (message.attachments.map(a => a.url).length == 0) {
                    await this.replyToMessageAsync(message, `Vous devez upload au moins une (1) image pour la commande \`-start\`.`);
                    return;
                }

                var durationInMinutes = parseInt(message.content.split(' ')[1]);
                var _description = message.content.split(' ').slice(2).join(' ');

                //message.channel.permissionOverwrites.edit(FROG_ROLE_ID, { SEND_MESSAGES: true });

                const thread = await message.startThread({
                    name: `Auction - ${_description}`,
                    rateLimitPerUser: Options.BID_COOLDOWN,
                    reason: message.content
                });

                this.auctions[thread.id] = new Auction(
                    _description,
                    getUtcDate(durationInMinutes),
                    message.attachments.map(a => a.url)
                );
                this.auctions[thread.id].start();

                this.auctions[thread.id].setThread(thread);

                await this.sendAuctionStartMessageAsync(this.auctions[thread.id], durationInMinutes);
                return;
            }

            if (message.content.startsWith('-end')) {
                this.messagesReceived.push(message);
                if (message.author.id != MASTER_ID) {
                    await this.replyToMessageAsync(message, `Vous n'avez pas les accès nécessaires pour la commande \`-end\`.`);
                } else {
                    this.auctions[message.channelId].end();
                    await this.sendAuctionEndMessageAsync(this.auctions[message.channelId]);
                    //message.channel.permissionOverwrites.edit(FROG_ROLE_ID, { SEND_MESSAGES: false });
                }
                return;
            }

            if (message.content.startsWith('-bid')) {
                if (this.auctions[message.channelId] ? !this.auctions[message.channelId].isOngoing() : false) {
                    await this.replyToMessageAsync(message, `Aucune enchère en cours présentement.`);
                    return;
                }

                var unparsedAmount = message.content.split(' ')[1];
                var amountIsValidFloat = /^[0-9]+\.?[0-9]{0,1}$/.test(unparsedAmount);
                if (!amountIsValidFloat) {
                    await this.replyToMessageAsync(message, `-bid \`${unparsedAmount}\` n'est pas une entrée valide. Exemple : -bid 5, -bid 10.1, -bid 25.5, etc. (maximum 1000)`);
                    return;
                }
                var amount = parseFloat(unparsedAmount);
                if (amount > Options.MAXIMUM_BID) {
                    await this.replyToMessageAsync(message, `\`-bid ${unparsedAmount}\` n'est pas une entrée valide. La maximum est 1000`);
                    return;
                }
                if (!this.auctions[message.channelId]) {
                    await this.replyToMessageAsync(message, `Vous ne pouvez pas bid ici.`);
                    return;
                }
                if (this.auctions[message.channelId].isOutbid(amount)) {
                    this.auctions[message.channelId].bid(message.author.id, amount);
                } else {
                    await this.replyToMessageAsync(message, `Le plus haut bid est présentement de \`${this.auctions[message.channelId].highestBid}m\`. Votre bid de \`${amount}m\` n'est pas assez élevé.`);
                    return;
                }

                this.messagesReceived.push(message);
                await this.sendNewBidMessageAsync(this.auctions[message.channelId]);
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
                if (message.author.id == MASTER_ID) return;
                await this.replyToMessageAsync(message, `${message.content} n'est pas une commande valide. \`-help\` pour plus de détails`);
                this.deleteMessages();
            }
        });

        this.client.login(auth.token);

        setInterval(async () => {
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
                    await this.sendAuctionEndMessageAsync(auction);
                }
                if (auction.isOngoing() && auction.highestBidder) {
                    await this.sendNewBidMessageAsync(auction);
                }
            }
        }, 1000 * 60 / Options.REFRESH_RATE);

        function getUtcDate(minutesToAdd = 0) {
            var date = new Date();
            date = addHours(minutesToAdd / 60, date);
            return toUtcDate(date);
        }

        function toUtcDate(date) {
            var now_utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(),
                date.getUTCDate(), date.getUTCHours(),
                date.getUTCMinutes(), date.getUTCSeconds());

            var endTime = new Date(now_utc);
            return endTime;
        }

        function addHours(numOfHours, date = new Date()) {
            date.setTime(date.getTime() + numOfHours * 60 * 60 * 1000);
            return date;
        }

    }

    public save() {
        writeFileSync(AUCTION_FILENAME, JSON.stringify(this.auctions));
    }

    private async sendAuctionStartMessageAsync(auctionToStart: Auction, auctionDurationInMinutes: number): Promise<void> {
        var durationText = auctionDurationInMinutes > 60 ? `${auctionDurationInMinutes / 60} heures` : `${auctionDurationInMinutes} minutes`;
        var embedRequest = new MessageEmbed()
            .setTitle(`${Options.EMOJI} Nouvelle enchère (${durationText})`)
            .setDescription(`**${auctionToStart.description}**\r\n\`-bid x\` pour bid x millions (exemple \`-bid 10.5\` pour 10.5 millions).`)
            .addFields(
                { name: 'Montant maximum', value: `${Options.MAXIMUM_BID}`, inline: false },
                { name: 'Cooldown', value: `${Options.BID_COOLDOWN} secondes`, inline: false },
                { name: 'Durée', value: durationText, inline: true },
                { name: 'Fin des enchères', value: auctionToStart.endTime.toUTCString(), inline: true }
            )
            .setColor("BLUE");
        if (auctionToStart.lastBidMessage) MessageUtils.tryDelete(auctionToStart.lastBidMessage);
        try {
            auctionToStart.auctionStartMessage = await auctionToStart.getThread().send({ content: '@Auctions', embeds: [embedRequest], files: auctionToStart.imagesUrls });
        } catch (ex) {
            console.log(`Erreur lors de l'envoi de message : ${ex}`);
        }
        setTimeout(() => {
            auctionToStart.deleteMessages();
            this.deleteMessages();
        });
    }

    private async sendNewBidMessageAsync(auctionToBidOn: Auction): Promise<void> {
        var { remainingHours: hours, remainingMinutes: minutes } = DateUtils.getRemainingTime(auctionToBidOn.endTime);
        var remainingTimeText = `${hours} heure(s) ${minutes} minute(s)`;
        var lastBidsMessage = auctionToBidOn.getNLastBids(10)
            .map(bid => `${SnowflakeFormater.formatId(bid.bidder)} ${bid.amount}m`)
            .join('\r\n');
        if (hours == 0 && minutes < 1) {
            remainingTimeText = `< 1 minute`;
        }
        var embedRequest = new MessageEmbed()
            .setTitle(`${Options.EMOJI} Nouveau bid`)
            .setDescription(`**${auctionToBidOn.description}**`)
            .addFields(
                { name: '👑 Plus haut bid', value: SnowflakeFormater.formatId(auctionToBidOn.highestBidder), inline: false },
                { name: 'Montant', value: `${auctionToBidOn.highestBid}m`, inline: false },
                { name: 'Temps restant', value: remainingTimeText, inline: false }
            )
            .setColor("GREEN");

        if (lastBidsMessage) {
            embedRequest.addField('Dernier(s) bid(s)', lastBidsMessage, false);
        }
        if (!auctionToBidOn.lastBidMessage) {
            try {
                auctionToBidOn.lastBidMessage = await auctionToBidOn.getThread().send({ embeds: [embedRequest] });
            } catch (ex) {
                console.log(`Erreur lors de l'envoi de message : ${ex}`);
            }
        } else {
            auctionToBidOn.lastBidMessage.edit({ embeds: [embedRequest] })
        }
        setTimeout(() => {
            auctionToBidOn.deleteMessages();
            this.deleteMessages();
        });
    }

    public async sendAuctionEndMessageAsync(auctionToEnd: Auction): Promise<void> {

        var lastBidsMessage = auctionToEnd.getNLastBids(10)
            .map(bid => `${SnowflakeFormater.formatId(bid.bidder)} ${bid.amount}m`)
            .join('\r\n');

        var embedRequest = new MessageEmbed()
            .setTitle(`${Options.EMOJI} Enchère terminée`)
            .setDescription(`**${auctionToEnd.description}**`)
            .addFields(
                { name: '👑 Gagnant', value: SnowflakeFormater.formatId(auctionToEnd.highestBidder), inline: false },
                { name: 'Montant', value: `${auctionToEnd.highestBid}m`, inline: false },
                { name: 'Nombre de bids', value: `${auctionToEnd.bidHistory.length}`, inline: false }
            )
            .setColor("BLUE")
            .setFooter({ text: 'Déposez les silvers en guild bank et ajouter un screenshot' });

        if (lastBidsMessage) {
            embedRequest.addField('Dernier(s) bid(s)', lastBidsMessage, false);
        }

        if (auctionToEnd.auctionStartMessage) MessageUtils.tryDelete(auctionToEnd.auctionStartMessage);
        if (auctionToEnd.lastBidMessage) MessageUtils.tryDelete(auctionToEnd.lastBidMessage);
        try {
            auctionToEnd.lastBidMessage = await auctionToEnd.getThread().send({ content: '@everyone', embeds: [embedRequest], files: auctionToEnd.imagesUrls });
        } catch (ex) {
            console.log(`Erreur lors de l'envoi de message : ${ex}`);
        }
        setTimeout(() => {
            auctionToEnd.deleteMessages();
            this.deleteMessages();
        });
    }

    public async replyToMessageAsync(message: Message, text: string, timeoutUntilDelete: number = Options.BOT_REPLY_LIFETIME, embedRequest: MessageEmbed = null) {
        let messageBot;
        if (embedRequest) {
            messageBot = await message.reply({ embeds: [embedRequest] });
        } else {
            messageBot = await message.reply(text);
        }
        if (this.auctions[message.channelId]) {
            this.auctions[message.channelId].messagesReceived.push(messageBot);
        } else {
            this.messagesReceived.push(messageBot);
        }

        setTimeout(() => {
            if (this.auctions[message.channelId]) this.auctions[message.channelId].deleteMessages();
            this.deleteMessages();
            MessageUtils.tryDelete(message);
        }, timeoutUntilDelete);
    }

    private deleteMessages(): void {
        this.messagesReceived.forEach(message => {
            if (message) {
                MessageUtils.tryDelete(message);
            };
        });
        this.messagesReceived = [];
    }
}