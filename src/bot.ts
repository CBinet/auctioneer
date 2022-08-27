import { Client, Colors, EmbedBuilder, GatewayIntentBits, GuildMember, Interaction, Message } from 'discord.js';
import { readFileSync } from 'fs';

import config from '../config.json';
import { Auction, AuctionResult } from './auction';
import { DateUtils, MessageUtils, SnowflakeFormater } from './better-discord';
import { Options } from './options';

const AUCTION_CHANNEL_ID = ['998794616226713640', '997311898825527406'];
const MASTER_ID = ['131961335847190529', '156147584572981248'];

const MINIMUM_INCREMENT = 0.5;

export class Bot {

    private auctions: { [id: string]: Auction } = {};
    private messagesReceived: Message<boolean>[] = [];

    private client: Client;

    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.GuildMembers
            ]
        });
        this.auctions = {};
    }

    public async runAsync() {
        this.client.on('ready', async onReady => {
            onReady.guilds.fetch().then(guilds => {
                console.log(`Serving ${guilds.size} server(s)`);
            });
            for (let index in AUCTION_CHANNEL_ID) {
                const channel = await this.client.channels.fetch(AUCTION_CHANNEL_ID[index]);
                // if (channel) (<TextChannel>channel).bulkDelete(100); // Delete après tests
            }
        });

        this.client.on('interactionCreate', async (interaction: Interaction) => {
            if (!interaction.isChatInputCommand()) return;

            if (this.auctions[interaction.channelId] ? this.auctions[interaction.channelId].getThread() ? interaction.channelId != this.auctions[interaction.channelId].getThread().id : AUCTION_CHANNEL_ID.indexOf(interaction.channelId) != -1 : false) return;

            switch (interaction.commandName) {
                case 'help': {

                    const helpFileContent = readFileSync(
                        './help.md',
                        { encoding: 'utf-8' }
                    );

                    var embedRequest = new EmbedBuilder()
                        .setTitle(`${Options.EMOJI} Help`)
                        .setDescription(helpFileContent)
                        .setColor(Colors.Blue)

                    interaction.reply({ embeds: [embedRequest], ephemeral: true });
                    break;
                }
                case 'start': {

                    if (!MASTER_ID.includes(interaction.member.user.id)) {
                        interaction.reply({
                            content: `Vous n'avez pas les accès nécessaires pour la commande \`-start\`.`,
                            ephemeral: true
                        });
                        return;
                    }

                    var durationInMinutes = interaction.options.getNumber('duree');
                    var name = interaction.options.getString('nom');
                    var attachments = interaction.options.getAttachment('screenshot');
                    var channel = interaction.options.getChannel('thread');
                    var minimum_price = interaction.options.getNumber('prix_minimum');
                    var minimum_increment = interaction.options.getNumber('increment_minimum') ?? MINIMUM_INCREMENT;
                    var schedule = interaction.options.getNumber('horaire');

                    const message = await interaction.reply({ content: 'Auction crée avec succès', fetchReply: true });

                    const thread = await message.startThread({
                        name: `Auction - ${name}`,
                        rateLimitPerUser: Options.BID_COOLDOWN,
                        reason: name
                    });

                    this.auctions[thread.id] = new Auction(
                        name,
                        durationInMinutes,
                        getUtcDate(durationInMinutes),
                        [attachments],
                        channel,
                        minimum_price,
                        minimum_increment,
                        schedule
                    );

                    this.auctions[thread.id].setThread(thread);

                    if (schedule) {
                        await this.sendAuctionScheduledMessageAsync(this.auctions[thread.id], schedule);
                        break;
                    }

                    this.auctions[thread.id].start();

                    await this.sendAuctionStartMessageAsync(this.auctions[thread.id], durationInMinutes);

                    break;
                }
                case 'end': {

                    if (!MASTER_ID.includes(interaction.member.user.id)) {
                        interaction.reply({
                            content: `Vous n'avez pas les accès nécessaires pour la commande \`-end\`.`,
                            ephemeral: true
                        });
                        return;
                    }

                    const auction = this.auctions[interaction.channelId];

                    if (!auction) {
                        interaction.reply({ content: 'Aucune auction sur ce canal.', ephemeral: true });
                        return;
                    }

                    const results = auction.end();
                    await this.sendAuctionEndMessageAsync(auction, results);
                    interaction.reply({ content: 'Auction terminée avec succès', ephemeral: true });
                    break;
                }
                case 'bid': {

                    const auction = this.auctions[interaction.channelId];

                    if (!auction || !auction.isOngoing()) {
                        interaction.reply({ content: 'Aucune enchère en cours présentement.', ephemeral: true });
                        return;
                    }

                    var amount = interaction.options.getNumber('montant');

                    if (!auction.isOutbid(amount)) {
                        interaction.reply({ content: `Le plus haut bid est présentement de \`${auction.highestBid}m\`. Votre bid de \`${amount}m\` n'est pas assez élevé.`, ephemeral: true });
                        return;
                    }

                    if (!auction.isValidIncrement(amount)) {
                        interaction.reply({ content: `Votre bid de ${amount}m n'est pas un incrément valide. L'incrément minimum est de ${auction.minIncrement}m`, ephemeral: true });
                        return;
                    }

                    auction.bid(interaction.member.user.id, amount, <GuildMember>interaction.member);

                    interaction.reply({ content: `Votre bid de ${auction.highestBid} à bien été placé.`, ephemeral: true });
                    await this.sendNewBidMessageAsync(auction);

                    break;
                }
            }
        });


        this.client.on('messageCreate', async message => {
            if (message.author.bot) return;

            const auction = this.auctions[message.channelId];

            if (auction && auction.getThread()) {
                message.delete().catch(() => { });
                return;
            }
        });

        this.client.login(config.token);

        setInterval(async () => {
            console.log('Refreshing after 1min...');
            for (let channelId in this.auctions) {
                const auction = this.auctions[channelId];

                if (!auction.isOngoing() && auction.schedule && auction.startTime <= new Date()) {
                    delete auction.schedule;
                    auction.start();
                    await this.sendAuctionStartMessageAsync(auction, auction.duration);
                }
                if (auction.isOngoing() && auction.endTime <= new Date()) {
                    const results = auction.end();
                    await this.sendAuctionEndMessageAsync(auction, results);
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

    private async sendAuctionStartMessageAsync(auctionToStart: Auction, auctionDurationInMinutes: number): Promise<void> {
        var durationText = auctionDurationInMinutes > 60 ? `${auctionDurationInMinutes / 60} heures` : `${auctionDurationInMinutes} minutes`;
        var embedRequest = new EmbedBuilder()
            .setTitle(`${Options.EMOJI} Nouvelle enchère (${durationText})`)
            .setDescription(`**${auctionToStart.description}**\r\n\`/bid x\` pour bid x millions (exemple \`/bid 10.5\` pour 10.5 millions).`)
            .addFields(
                { name: 'Prix d\'achat minimum', value: `${auctionToStart.minPrice ? auctionToStart.minPrice + 'm' : 'Aucun'}`, inline: false },
                { name: 'Prix d\'achat maximum', value: `${Options.MAXIMUM_BID}`, inline: false },
                { name: 'Cooldown', value: `${Options.BID_COOLDOWN} secondes`, inline: false },
                { name: 'Durée', value: durationText, inline: true },
                { name: 'Fin', value: auctionToStart.endTime.toUTCString(), inline: true },
                { name: 'Thread associé', value: `${auctionToStart.channel}`, inline: false }
            )
            .setColor(Colors.Blue);
        if (auctionToStart.lastBidMessage) MessageUtils.tryDelete(auctionToStart.lastBidMessage);
        try {
            auctionToStart.auctionStartMessage = await auctionToStart.getThread().send({ content: '@everyone', embeds: [embedRequest], files: auctionToStart.imagesUrls });
            auctionToStart.channelMessage = await auctionToStart.channel.send({ content: `Auction en cours - <#${auctionToStart.getThread().id}>` });
        } catch (ex) {
            console.log('Erreur lors de l\'envoi de message', ex);
        }
        setTimeout(() => {
            auctionToStart.deleteMessages();
            this.deleteMessages();
        });
    }

    private async sendAuctionScheduledMessageAsync(auctionToStart: Auction, delayInMinutes: number): Promise<void> {
        var scheduledText = delayInMinutes > 60 ? `${delayInMinutes / 60} heures` : `${delayInMinutes} minutes`;
        var durationText = auctionToStart.duration > 60 ? `${auctionToStart.duration / 60} heures` : `${auctionToStart.duration} minutes`;
        var embedRequest = new EmbedBuilder()
            .setTitle(`${Options.EMOJI} Nouvelle enchère planifiée (dans ${scheduledText})`)
            .setDescription(`**${auctionToStart.description}**`)
            .addFields(
                { name: 'Prix d\'achat minimum', value: `${auctionToStart.minPrice ? auctionToStart.minPrice + 'm' : 'Aucun'}`, inline: false },
                { name: 'Cooldown', value: `${Options.BID_COOLDOWN} secondes`, inline: false },
                { name: 'Durée', value: durationText, inline: true },
                { name: 'Début', value: auctionToStart.startTime.toUTCString(), inline: true },
                { name: 'Fin', value: auctionToStart.endTime.toUTCString(), inline: true },
                { name: 'Thread associé', value: `${auctionToStart.channel}`, inline: false }
            )
            .setColor(Colors.Blue);
        if (auctionToStart.lastBidMessage) MessageUtils.tryDelete(auctionToStart.lastBidMessage);
        try {
            auctionToStart.auctionStartMessage = await auctionToStart.getThread().send({ content: '@everyone', embeds: [embedRequest], files: auctionToStart.imagesUrls });
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
        var embedRequest = new EmbedBuilder()
            .setTitle(`${Options.EMOJI} Nouveau bid`)
            .setDescription(`**${auctionToBidOn.description}**`)
            .addFields(
                { name: '👑 Plus haut bid', value: SnowflakeFormater.formatId(auctionToBidOn.highestBidder), inline: false },
                { name: 'Montant', value: `${auctionToBidOn.highestBid}m`, inline: false },
                { name: 'Temps restant', value: remainingTimeText, inline: false },
                { name: 'Prix d\'achat minimum', value: `${auctionToBidOn.minPrice ? auctionToBidOn.minPrice + 'm' : 'Aucun'}`, inline: false }
            )
            .setColor(Colors.Green);

        if (lastBidsMessage) {
            embedRequest.addFields({ name: 'Dernier(s) bid(s)', value: lastBidsMessage, inline: false });
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

    public async sendAuctionEndMessageAsync(auctionToEnd: Auction, results: AuctionResult): Promise<void> {

        var lastBidsMessage = auctionToEnd.getNLastBids(10)
            .map(bid => `${SnowflakeFormater.formatId(bid.bidder)} ${bid.amount}m`)
            .join('\r\n');

        var embedRequest = new EmbedBuilder()
            .setTitle(`${Options.EMOJI} Enchère terminée`)
            .setDescription(`**${auctionToEnd.description}${!results.winnerId ? ' - Aucun gagnant selectionné. Le prix minimum de ' + auctionToEnd.minPrice + 'm n\'à pas été atteint.' : ''}**`)
            .addFields(
                { name: '👑 Gagnant', value: SnowflakeFormater.formatId(results.winnerId), inline: false },
                { name: 'Montant', value: `${results.price ? results.price + 'm' : 'N/A'}`, inline: false },
                { name: 'Nombre de bids', value: `${auctionToEnd.bidHistory.length}`, inline: false }
            )
            .setColor(Colors.Blue)
            .setFooter({ text: `Déposez les silvers en guild bank et ajouter un screenshot dans le canal associé.` });

        if (lastBidsMessage) {
            embedRequest.addFields({ name: 'Dernier(s) bid(s)', value: lastBidsMessage, inline: false });
        }

        if (auctionToEnd.auctionStartMessage) MessageUtils.tryDelete(auctionToEnd.auctionStartMessage);
        if (auctionToEnd.lastBidMessage) MessageUtils.tryDelete(auctionToEnd.lastBidMessage);
        try {
            auctionToEnd.lastBidMessage = await auctionToEnd.getThread().send({ content: '@everyone', embeds: [embedRequest], files: auctionToEnd.imagesUrls });
            if (auctionToEnd.channelMessage) {
                auctionToEnd.channelMessage.edit({ content: `Auction terminée - <#${auctionToEnd.getThread().id}>` });
            }
        } catch (ex) {
            console.log(`Erreur lors de l'envoi de message : ${ex}`);
        }
        setTimeout(() => {
            auctionToEnd.deleteMessages();
            this.deleteMessages();
        });
    }

    public async replyToMessageAsync(message: Message, text: string, timeoutUntilDelete: number = Options.BOT_REPLY_LIFETIME, embedRequest: EmbedBuilder = null) {
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