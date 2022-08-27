import { Awaitable, Client, GatewayIntentBits, Interaction, Message, SlashCommandBuilder, Snowflake } from 'discord.js';

export class SnowflakeFormater {
    public static formatId(id: Snowflake): string {
        return id ? `<@${id}>` : 'N/A';
    }
}

export class DateUtils {
    public static getRemainingTime(date: Date): { remainingHours: number, remainingMinutes: number } {
        var remainingHours = Math.floor(Math.abs(new Date().valueOf() - date.valueOf()) / (1000 * 60 * 60));
        var remainingMinutes = Math.floor(Math.abs(new Date().valueOf() - date.valueOf()) / (1000 * 60)) + (-remainingHours * 60);
        return {
            remainingHours,
            remainingMinutes
        }
    }
}

export class MessageUtils {
    public static tryDelete(message: Message<any>) {
        try {
            message.delete().catch(onRejected => console.log(onRejected));
        } catch (ex) {
            // nothing
        }
    }
}

export class BetterDiscordClient {
    private client: Client;
    private options: BetterDiscordClientOptions;
    private commands: { [command: string]: (message: BetterDiscordMessage) => Awaitable<void> } = {};

    constructor(options: BetterDiscordClientOptions) {
        this.client = new Client({
            intents: [
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.GuildMembers
            ]
        });
        this.options = options;
    }

    public login(): Promise<string> {
        this.client.on('interactionCreate', async (interaction: Interaction) => {
            if (!interaction.isChatInputCommand()) return;

            if (interaction.commandName === 'help') {
                await interaction.reply('I help you!');
            }
        });
        this.client.on('messageCreate', (message) => {
            const [requestedCommand, ...params] = message.content.split(' ');
            console.log(requestedCommand, params, this.commands);
            if (this.commands[requestedCommand]) {
                this.commands[requestedCommand](new BetterDiscordMessage(message));
            }
        });
        return this.client.login(this.options.token);
    }

    public async onReady(onReady: (r) => Awaitable<void>) {
        this.client.on('ready', async (r) => {
            this.client.channels.fetch(this.options.channelID);
            onReady(r);
        });
    }

    public on(command: string, callback: (message: BetterDiscordMessage) => Awaitable<void>) {
        this.commands[command] = callback;
    }
}

export class BetterDiscordMessage {
    private message: Message<boolean>;

    constructor(message: Message<boolean>) {
        this.message = message;
    }
}

export class BetterDiscordClientOptions {
    public token: string;
    public channelID: string;
}

export interface Command {
    slashCommand: SlashCommandBuilder;
    execute: (interaction: Interaction) => any;
}

export function resolveCommands(path: string = './src/commands'): Map<string, Command> {
    const commands: Map<string, Command> = new Map<string, Command>();
    const commandFiles = require('fs')
        .readdirSync(path)
        .filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(`../../src/commands/${file}`);
        console.log(command);
        commands.set(command.slashCommand.name, command);
    }
    return commands;
}