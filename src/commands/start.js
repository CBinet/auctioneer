const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {

    slashCommand: new SlashCommandBuilder()
        .setName('start')
        .setDescription('Permet de lancer une auction')
        .addNumberOption(option => option
            .setName('duree')
            .setDescription('Durée en minutes')
            .setRequired(true)
            .setMinValue(5)
            .setMaxValue(9999))
        .addStringOption(option => option
            .setName('nom')
            .setDescription('Nom de l\'auction')
            .setRequired(true)
            .setMinLength(5)
            .setMaxLength(50))
        .addAttachmentOption(option => option
            .setName('screenshot')
            .setDescription('Screenshot du lootsplit')
            .setRequired(true))
        .addChannelOption(option => option
            .setName('thread')
            .setDescription('Thread lootsplit associée')
            .setRequired(true))
        .addNumberOption(option => option
            .setName('prix_minimum')
            .setDescription('Prix minimum auquel l\'enchère peut être achetée')
            .setMinValue(1)
            .setMaxValue(9999))
        .addNumberOption(option => option
            .setName('increment_minimum')
            .setDescription('Incrément minimum par bid (défaut: 0.5)')
            .setMinValue(0.1)
            .setMaxValue(5))
        .addNumberOption(option => option
            .setName('horaire')
            .setDescription('Retarde le début de l\'auction de x minutes')
            .setMinValue(5)
            .setMaxValue(9999))
        .setDMPermission(false)
};