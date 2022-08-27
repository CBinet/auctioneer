const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {

    slashCommand: new SlashCommandBuilder()
        .setName('end')
        .setDescription('Termine l\'auction en cours.')
        .setDMPermission(false)
};