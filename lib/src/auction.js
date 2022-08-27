"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Auction = void 0;
const better_discord_1 = require("./better-discord");
const options_1 = require("./options");
class Auction {
    constructor(description, duration, endTime, imagesUrls, channel, minPrice, minIncrement, schedule) {
        this.imagesUrls = [];
        this.highestBid = 0;
        this.bidders = new Map();
        this.messagesReceived = [];
        this.bidHistory = [];
        this.description = description;
        this.duration = duration;
        this.endTime = endTime;
        this.imagesUrls = imagesUrls;
        this.channel = channel;
        this.minPrice = minPrice;
        this.minIncrement = minIncrement;
        this.schedule = schedule;
        this.ongoing = false;
        this.highestBid = 0;
        this.bidHistory = [];
        this.startTime = new Date();
        if (this.schedule) {
            this.startTime.setMinutes(this.startTime.getMinutes() + this.schedule);
            this.endTime.setMinutes(this.endTime.getMinutes() + this.schedule);
        }
    }
    start() {
        this.ongoing = true;
        this.highestBid = 0;
        this.bidHistory = [];
    }
    end() {
        delete this.schedule;
        this.ongoing = false;
        this.thread.setLocked(true, 'Enchère terminée');
        if (this.minPrice && this.minPrice > this.highestBid) {
            return {
                winnerId: null,
                price: null
            };
        }
        return {
            winnerId: this.highestBidder,
            price: this.highestBid
        };
    }
    bid(bidder, amount, user) {
        this.highestBidder = bidder;
        this.highestBid = amount;
        this.bidHistory.push({ bidder, amount, date: new Date() });
        var { remainingHours, remainingMinutes } = better_discord_1.DateUtils.getRemainingTime(this.endTime);
        if (remainingHours == 0 && remainingMinutes <= options_1.Options.BID_MINUTES_THRESHOLD_BEFORE_ADDING_TIME) {
            this.endTime.setMinutes(this.endTime.getMinutes() + options_1.Options.BID_MINUTES_TO_ADD_AFTER_THRESHOLD);
            return true;
        }
        this.bidders[bidder] = user;
    }
    isOngoing() {
        return this.ongoing;
    }
    isOutbid(amount) {
        return amount > this.highestBid;
    }
    isValidIncrement(amount) {
        return (amount - this.highestBid) >= this.minIncrement;
    }
    setThread(thread) {
        if (this.thread) {
            throw new Error(`Thread already set for auction \' ${this.description}\'`);
        }
        this.thread = thread;
    }
    getThread() {
        return this.thread;
    }
    deleteMessages() {
        this.messagesReceived.forEach(message => {
            if (message) {
                better_discord_1.MessageUtils.tryDelete(message);
            }
            ;
        });
        this.messagesReceived = [];
    }
    getNLastBids(n) {
        return this.bidHistory
            .slice(-n, -1)
            .reverse();
    }
}
exports.Auction = Auction;
//# sourceMappingURL=auction.js.map