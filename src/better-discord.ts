import { Message, Snowflake } from 'discord.js';

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
            message.delete();
        } catch (ex) {
            // nothing
        }
    }
}