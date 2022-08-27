const { SlashCommandBuilder } = require('discord.js');

module.exports = {

    slashCommand: new SlashCommandBuilder()
        .setName('bid')
        .addNumberOption(option => option
            .setName('montant')
            .setDescription('Montant en millions.')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(1000))
        .setDescription('Permet de bid sur l\'auction en cours')
        .setDMPermission(false)
};