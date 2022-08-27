const { SlashCommandBuilder } = require('discord.js');

module.exports = {

    slashCommand: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Retourne une liste de toutes les commandes disponibles'),

    // async execute(interaction) {

    //     const helpFileContent = await fsPromises.readFile(
    //         './help.md',
    //         'utf-8',
    //     );

    //     return interaction.reply(helpFileContent);
    // }
};