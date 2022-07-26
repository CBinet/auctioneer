"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageUtils = exports.DateUtils = exports.SnowflakeFormater = void 0;
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
            message.delete();
        }
        catch (ex) {
            // nothing
        }
    }
}
exports.MessageUtils = MessageUtils;
//# sourceMappingURL=better-discord.js.map