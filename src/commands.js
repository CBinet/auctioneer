const { REST } = require('@discordjs/rest');
const { applicationId, token } = require('../config.json');
const fs = require('node:fs');

const commands = [];
const commandFiles = fs.readdirSync('./src/commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        console.log(commands);
        await rest.put(
            `/applications/${applicationId}/commands`,
            {
                body: commands.map(c => c['slashCommand']), headers: { Authorization: `Bot ${token}` }
            },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();