"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Auction = void 0;
class Auction {
    constructor(description, endTime, imagesUrls) {
        this.imagesUrls = [];
        this.highestBid = 0;
        this.messagesReceived = [];
        this.bidHistory = [];
        this.description = description;
        this.endTime = endTime;
        this.imagesUrls = imagesUrls;
        this.ongoing = false;
        this.highestBid = 0;
        this.bidHistory = [];
    }
    start() {
        this.ongoing = true;
        this.highestBid = 0;
        this.bidHistory = [];
    }
    end() {
        this.ongoing = false;
        this.thread.setLocked(true, 'Enchère terminée');
    }
    bid(bidder, amount) {
        this.highestBidder = bidder;
        this.highestBid = amount;
        this.bidHistory.push({ bidder, amount, date: new Date() });
    }
    isOngoing() {
        return this.ongoing;
    }
    isOutbid(amount) {
        return amount > this.highestBid;
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
                message.delete();
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