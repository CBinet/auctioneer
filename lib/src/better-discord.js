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
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCommands = exports.BetterDiscordClientOptions = exports.BetterDiscordMessage = exports.BetterDiscordClient = exports.MessageUtils = exports.DateUtils = exports.SnowflakeFormater = void 0;
const discord_js_1 = require("discord.js");
class SnowflakeFormater {
    static formatId(id) {
        return id ? `<@${id}>` : 'N/A';
    }
}
exports.SnowflakeFormater = SnowflakeFormater;
class DateUtils {
    static getRemainingTime(date) {
        var remainingHours = Math.floor(Math.abs(new Date().valueOf() - date.valueOf()) / (1000 * 60 * 60));
        var remainingMinutes = Math.floor(Math.abs(new Date().valueOf() - date.valueOf()) / (1000 * 60)) + (-remainingHours * 60);
        return {
            remainingHours,
            remainingMinutes
        };
    }
}
exports.DateUtils = DateUtils;
class MessageUtils {
    static tryDelete(message) {
        try {
            message.delete().catch(onRejected => console.log(onRejected));
        }
        catch (ex) {
            // nothing
        }
    }
}
exports.MessageUtils = MessageUtils;
class BetterDiscordClient {
    constructor(options) {
        this.commands = {};
        this.client = new discord_js_1.Client({
            intents: [
                discord_js_1.GatewayIntentBits.GuildMessages,
                discord_js_1.GatewayIntentBits.DirectMessages,
                discord_js_1.GatewayIntentBits.GuildMembers
            ]
        });
        this.options = options;
    }
    login() {
        this.client.on('interactionCreate', (interaction) => __awaiter(this, void 0, void 0, function* () {
            if (!interaction.isChatInputCommand())
                return;
            if (interaction.commandName === 'help') {
                yield interaction.reply('I help you!');
            }
        }));
        this.client.on('messageCreate', (message) => {
            const [requestedCommand, ...params] = message.content.split(' ');
            console.log(requestedCommand, params, this.commands);
            if (this.commands[requestedCommand]) {
                this.commands[requestedCommand](new BetterDiscordMessage(message));
            }
        });
        return this.client.login(this.options.token);
    }
    onReady(onReady) {
        return __awaiter(this, void 0, void 0, function* () {
            this.client.on('ready', (r) => __awaiter(this, void 0, void 0, function* () {
                this.client.channels.fetch(this.options.channelID);
                onReady(r);
            }));
        });
    }
    on(command, callback) {
        this.commands[command] = callback;
    }
}
exports.BetterDiscordClient = BetterDiscordClient;
class BetterDiscordMessage {
    constructor(message) {
        this.message = message;
    }
}
exports.BetterDiscordMessage = BetterDiscordMessage;
class BetterDiscordClientOptions {
}
exports.BetterDiscordClientOptions = BetterDiscordClientOptions;
function resolveCommands(path = './src/commands') {
    const commands = new Map();
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
exports.resolveCommands = resolveCommands;
//# sourceMappingURL=better-discord.js.map